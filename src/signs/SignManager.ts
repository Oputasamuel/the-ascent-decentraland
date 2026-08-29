import { engine, Material, MeshRenderer, RaycastQueryType, TextShape, Transform, raycastSystem } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import type { Entity } from '@dcl/sdk/ecs'
import type { NetworkSign } from '../multiplayer/messages'
import { setSignStatus } from '../ui'
const MAX_SIGNS = 48
export class SignManager {
  private readonly signs = new Map<string, { definition: NetworkSign; panel: Entity; text: Entity }>()
  constructor(private readonly broadcast: (sign: NetworkSign) => void) {}
  get snapshot(): NetworkSign[] { return [...this.signs.values()].map((item) => item.definition) }
  requestPlacement(symbol: string, playerId: string): void {
    const clean = symbol.replace(/[\r\n]/g, '').trim().slice(0, 8)
    if (!clean) { setSignStatus('TYPE OR PICK A SIGN'); return }
    if (this.signs.size >= MAX_SIGNS) { setSignStatus('SIGN LIMIT REACHED'); return }
    const raycaster = engine.addEntity()
    Transform.create(raycaster, { parent: engine.CameraEntity })
    raycastSystem.registerLocalDirectionRaycast({ entity: raycaster, opts: { direction: Vector3.Forward(), maxDistance: 5, queryType: RaycastQueryType.RQT_HIT_FIRST } }, (result) => {
      raycastSystem.removeRaycasterEntity(raycaster)
      engine.removeEntity(raycaster)
      const hit = result.hits[0]
      if (!hit?.position || !hit.normalHit) { setSignStatus('LOOK AT A NEARBY WALL'); return }
      this.broadcast({ signId: `${playerId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, playerId, symbol: clean, position: { ...hit.position }, normal: { ...hit.normalHit } })
      setSignStatus('SIGN TRANSMITTED')
    })
  }
  add(sign: NetworkSign): void {
    if (this.signs.has(sign.signId) || this.signs.size >= MAX_SIGNS || sign.symbol.length > 8) return
    // TextShape was previously viewed from its back face, which mirrored every symbol.
    const yaw = Math.atan2(sign.normal.x, sign.normal.z) * 180 / Math.PI + 180
    const panel = engine.addEntity()
    Transform.create(panel, { position: Vector3.create(sign.position.x + sign.normal.x * 0.075, sign.position.y + sign.normal.y * 0.075, sign.position.z + sign.normal.z * 0.075), rotation: Quaternion.fromEulerDegrees(0, yaw, 0), scale: Vector3.create(1.3, 0.9, 0.055) })
    MeshRenderer.setBox(panel)
    Material.setPbrMaterial(panel, { albedoColor: Color4.create(0.012, 0.018, 0.055, 1), emissiveColor: Color4.create(0.015, 0.11, 0.2, 1), emissiveIntensity: 0.75, metallic: 0.65, roughness: 0.2 })
    const text = engine.addEntity()
    Transform.create(text, { position: Vector3.create(sign.position.x + sign.normal.x * 0.14, sign.position.y + sign.normal.y * 0.14, sign.position.z + sign.normal.z * 0.14), rotation: Quaternion.fromEulerDegrees(0, yaw, 0), scale: Vector3.create(0.78, 0.78, 0.78) })
    TextShape.create(text, { text: sign.symbol, fontSize: 9, textColor: Color4.create(0.72, 0.96, 1, 1), outlineColor: Color4.create(0.025, 0.006, 0.08, 1), outlineWidth: 0.24 })
    this.signs.set(sign.signId, { definition: sign, panel, text })
  }
  reset(): void {
    this.signs.forEach(({ panel, text }) => {
      engine.removeEntity(panel)
      engine.removeEntity(text)
    })
    this.signs.clear()
    setSignStatus('')
  }
}
