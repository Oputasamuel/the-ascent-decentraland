import { engine, Material, MeshRenderer, Transform, type Entity } from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'

type Mote = {
  entity: Entity
  origin: Vector3
  minY: number
  maxY: number
  riseSpeed: number
  drift: number
  phase: number
}

type Zone = {
  count: number
  min: Vector3
  max: Vector3
  primary: Color4
  secondary: Color4
  intensity: number
  elongated?: boolean
}

export class EnvironmentFxManager {
  private readonly motes: Mote[] = []
  private elapsed = 0
  private seed = 0x41c6ce57

  build(): void {
    // Sparse maze data motes: visible locally without filling every corridor.
    this.spawnZone({
      count: 32,
      min: Vector3.create(9, 0.35, 9),
      max: Vector3.create(135, 5.4, 135),
      primary: Color4.create(0.08, 0.88, 1, 0.9),
      secondary: Color4.create(0.72, 0.16, 1, 0.86),
      intensity: 10
    })

    // Exterior sparks follow the four strips between the maze and scene edge.
    const exteriorColor = Color4.create(0.12, 0.9, 1, 0.84)
    const exteriorAccent = Color4.create(1, 0.36, 0.08, 0.8)
    ;[
      [Vector3.create(8, 0.25, 0.3), Vector3.create(136, 4.8, 6.4)],
      [Vector3.create(8, 0.25, 137.6), Vector3.create(136, 4.8, 143.7)],
      [Vector3.create(0.3, 0.25, 8), Vector3.create(6.4, 4.8, 136)],
      [Vector3.create(137.6, 0.25, 8), Vector3.create(143.7, 4.8, 136)]
    ].forEach(([min, max]) => this.spawnZone({ count: 5, min, max, primary: exteriorColor, secondary: exteriorAccent, intensity: 8 }))

    // Denser holographic streaks give the elevated lobby its own atmosphere.
    this.spawnZone({
      count: 20,
      min: Vector3.create(57, 30.15, 59),
      max: Vector3.create(87, 36.1, 85),
      primary: Color4.create(0.15, 0.95, 1, 0.92),
      secondary: Color4.create(0.95, 0.18, 1, 0.88),
      intensity: 12,
      elongated: true
    })

    engine.addSystem((deltaTime) => this.update(deltaTime))
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0
    return this.seed / 4294967296
  }

  private spawnZone(zone: Zone): void {
    for (let index = 0; index < zone.count; index++) {
      const entity = engine.addEntity()
      const origin = Vector3.create(
        zone.min.x + this.random() * (zone.max.x - zone.min.x),
        zone.min.y + this.random() * (zone.max.y - zone.min.y),
        zone.min.z + this.random() * (zone.max.z - zone.min.z)
      )
      const size = 0.035 + this.random() * 0.055
      Transform.create(entity, {
        position: Vector3.create(origin.x, origin.y, origin.z),
        scale: zone.elongated ? Vector3.create(size * 0.55, size * 3.8, size * 0.55) : Vector3.create(size, size, size)
      })
      if (zone.elongated) MeshRenderer.setCylinder(entity)
      else MeshRenderer.setSphere(entity)
      const color = index % 2 === 0 ? zone.primary : zone.secondary
      Material.setPbrMaterial(entity, {
        albedoColor: color,
        emissiveColor: color,
        emissiveIntensity: zone.intensity,
        roughness: 0.08,
        metallic: 0.2
      })
      this.motes.push({
        entity,
        origin,
        minY: zone.min.y,
        maxY: zone.max.y,
        riseSpeed: 0.22 + this.random() * 0.48,
        drift: 0.08 + this.random() * 0.24,
        phase: this.random() * Math.PI * 2
      })
    }
  }

  private update(deltaTime: number): void {
    this.elapsed += deltaTime
    for (const mote of this.motes) {
      const transform = Transform.getMutableOrNull(mote.entity)
      if (!transform) continue
      transform.position.y += mote.riseSpeed * deltaTime
      if (transform.position.y > mote.maxY) transform.position.y = mote.minY
      transform.position.x = mote.origin.x + Math.sin(this.elapsed * 0.55 + mote.phase) * mote.drift
      transform.position.z = mote.origin.z + Math.cos(this.elapsed * 0.42 + mote.phase) * mote.drift
    }
  }
}
