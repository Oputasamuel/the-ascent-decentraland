import { engine, InputModifier, LightSource, MainCamera, Material, MeshRenderer, Transform, VirtualCamera, type Entity } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import type { AudioManager } from '../audio/AudioManager'

type WarpSequence = {
  elapsed: number
  moved: boolean
  destination: Vector3
  cameraTarget: Vector3
  entities: Entity[]
  cinematicCamera: Entity
  cameraStart: Vector3
  cameraArrival: Vector3
  onComplete?: () => void
  death: boolean
}

// The move is tied to the charge phase completing; cleanup and input restore
// are tied to the arrival camera/VFX phase completing.
const CHARGE_PHASE_SECONDS = 1.6
const ARRIVAL_PHASE_SECONDS = 1.45

export class TeleportFxManager {
  private active?: WarpSequence

  constructor(private readonly audio: AudioManager) {
    engine.addSystem((deltaTime) => this.update(deltaTime))
  }

  teleport(destination: Vector3, cameraTarget: Vector3, onComplete?: () => void): void {
    this.start(destination, cameraTarget, false, onComplete)
  }

  deathRespawn(destination: Vector3, cameraTarget: Vector3): void {
    this.start(destination, cameraTarget, true)
  }

  private start(destination: Vector3, cameraTarget: Vector3, death: boolean, onComplete?: () => void): void {
    if (this.active) return
    const player = Transform.getOrNull(engine.PlayerEntity)
    if (!player) return
    InputModifier.createOrReplace(engine.PlayerEntity, {
      mode: InputModifier.Mode.Standard({ disableAll: true })
    })
    const cinematicCamera = engine.addEntity()
    const cameraStart = Vector3.create(player.position.x, player.position.y + 2.4, player.position.z - 3.2)
    const cameraArrival = Vector3.create(destination.x, destination.y + 2.4, destination.z - 3.2)
    Transform.create(cinematicCamera, { position: cameraStart })
    VirtualCamera.create(cinematicCamera, {
      lookAtEntity: engine.PlayerEntity,
      fov: 58,
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(CHARGE_PHASE_SECONDS) }
    })
    MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: cinematicCamera })
    this.audio.play(death ? 'death' : 'teleport')
    this.active = {
      elapsed: 0,
      moved: false,
      destination,
      cameraTarget,
      entities: this.createWarpVisuals(player.position, death),
      cinematicCamera,
      cameraStart,
      cameraArrival,
      onComplete,
      death
    }
  }

  private createWarpVisuals(position: Vector3, death: boolean): Entity[] {
    const entities: Entity[] = []
    const primary = death ? Color4.create(1, 0.03, 0.12, 1) : Color4.create(0.05, 0.9, 1, 1)
    const secondary = death ? Color4.create(1, 0.22, 0.02, 1) : Color4.create(0.72, 0.12, 1, 1)
    for (let index = 0; index < 3; index++) {
      const ring = engine.addEntity()
      Transform.create(ring, {
        position: Vector3.create(position.x, position.y + 0.08 + index * 0.72, position.z),
        scale: Vector3.create(1.2 + index * 0.18, 0.035, 1.2 + index * 0.18)
      })
      MeshRenderer.setCylinder(ring)
      Material.setPbrMaterial(ring, {
        albedoColor: index % 2 === 0 ? primary : secondary,
        emissiveColor: index % 2 === 0 ? primary : secondary,
        emissiveIntensity: 18,
        metallic: 0.45,
        roughness: 0.08
      })
      entities.push(ring)
    }
    for (let index = 0; index < 10; index++) {
      const spark = engine.addEntity()
      const angle = index * Math.PI * 2 / 10
      Transform.create(spark, {
        position: Vector3.create(position.x + Math.cos(angle) * 1.05, position.y + 0.3 + (index % 5) * 0.48, position.z + Math.sin(angle) * 1.05),
        scale: Vector3.create(0.08, 0.28, 0.08)
      })
      MeshRenderer.setSphere(spark)
      Material.setPbrMaterial(spark, {
        albedoColor: index % 2 === 0 ? primary : secondary,
        emissiveColor: index % 2 === 0 ? primary : secondary,
        emissiveIntensity: 24,
        roughness: 0.06
      })
      entities.push(spark)
    }
    const light = engine.addEntity()
    Transform.create(light, { position: Vector3.create(position.x, position.y + 1.2, position.z) })
    LightSource.create(light, { active: true, color: { r: primary.r, g: primary.g, b: primary.b }, intensity: 4200, range: 12, shadow: false, type: LightSource.Type.Point({}) })
    entities.push(light)
    return entities
  }

  private update(deltaTime: number): void {
    const sequence = this.active
    if (!sequence) return
    sequence.elapsed += deltaTime
    const charge = Math.min(1, sequence.elapsed / CHARGE_PHASE_SECONDS)
    sequence.entities.forEach((entity, index) => {
      const transform = Transform.getMutableOrNull(entity)
      if (!transform) return
      if (index < 3) {
        const ringScale = 0.55 + charge * (1.25 + index * 0.18)
        transform.scale = Vector3.create(ringScale, 0.025 + charge * 0.035, ringScale)
        transform.rotation = Quaternion.fromEulerDegrees(0, sequence.elapsed * (120 + index * 45), 0)
      } else if (index < 13) {
        transform.position.y += deltaTime * (1.2 + (index % 3) * 0.7)
      }
    })

    if (!sequence.moved && charge >= 1) {
      sequence.moved = true
      void movePlayerTo({
        newRelativePosition: { x: sequence.destination.x, y: sequence.destination.y, z: sequence.destination.z },
        cameraTarget: { x: sequence.cameraTarget.x, y: sequence.cameraTarget.y, z: sequence.cameraTarget.z }
      })
      this.audio.play('teleport')
      sequence.entities.forEach((entity, index) => {
        const transform = Transform.getMutableOrNull(entity)
        if (!transform) return
        transform.position = Vector3.create(
          sequence.destination.x + (index >= 3 && index < 13 ? Math.cos(index) * 1.1 : 0),
          sequence.destination.y + (index >= 3 && index < 13 ? 0.35 + (index % 5) * 0.45 : 0.08 + Math.min(index, 2) * 0.72),
          sequence.destination.z + (index >= 3 && index < 13 ? Math.sin(index) * 1.1 : 0)
        )
      })
    }

    if (sequence.moved) {
      const arrivalProgress = Math.min(1, (sequence.elapsed - CHARGE_PHASE_SECONDS) / ARRIVAL_PHASE_SECONDS)
      const eased = arrivalProgress * arrivalProgress * (3 - 2 * arrivalProgress)
      const cameraTransform = Transform.getMutableOrNull(sequence.cinematicCamera)
      if (cameraTransform) {
        // Descend from the elevated arrival shot toward the normal third-person
        // camera position before handing camera control back to the player.
        const elevated = Vector3.create(sequence.destination.x, sequence.destination.y + 6.4, sequence.destination.z - 7.2)
        cameraTransform.position = Vector3.lerp(elevated, sequence.cameraArrival, eased)
      }
    }

    if (sequence.moved && sequence.elapsed >= CHARGE_PHASE_SECONDS + ARRIVAL_PHASE_SECONDS) {
      sequence.entities.forEach((entity) => engine.removeEntityWithChildren(entity))
      MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: undefined })
      InputModifier.deleteFrom(engine.PlayerEntity)
      engine.removeEntityWithChildren(sequence.cinematicCamera)
      this.active = undefined
      sequence.onComplete?.()
    }
  }
}
