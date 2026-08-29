import { engine, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, TextShape, Transform, pointerEventsSystem, type Entity } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { MAZE_CENTER } from '../maze/MazeManager'
import type { TeleportFxManager } from '../effects/TeleportFxManager'

const LOBBY_CENTER = Vector3.create(72, 30.2, 72)
export const GAME_SPAWN_POINT = Vector3.create(72, 0.65, 2.65)

export class LobbyManager {
  private leaderboardText?: Entity

  constructor(
    private readonly onPublicDeploy: () => void,
    private readonly onReturnLobby: () => void,
    private readonly teleportFx: TeleportFxManager
  ) {}

  build(): void {
    this.createShell()
    this.createDeploymentBays()
    this.createLeaderboardWall()
    this.createSpawnStation()

    const overlook = engine.addEntity()
    Transform.create(overlook, { position: Vector3.create(MAZE_CENTER, 7.15, MAZE_CENTER), scale: Vector3.create(7, 0.35, 7) })
    MeshRenderer.setBox(overlook)
    MeshCollider.setBox(overlook)
    Material.setPbrMaterial(overlook, { albedoColor: Color4.create(0.025, 0.06, 0.12, 0.82), emissiveColor: Color4.create(0.18, 0.05, 0.42, 1), emissiveIntensity: 3.2, metallic: 0.65, roughness: 0.2 })
  }

  setLeaderboard(entries: Array<{ displayName: string; securedTotal: number }>): void {
    if (!this.leaderboardText) return
    const ranked = [...entries].sort((a, b) => b.securedTotal - a.securedTotal).slice(0, 5)
    const rows = ranked.length > 0
      ? ranked.map((entry, index) => `${index + 1}. ${entry.displayName.slice(0, 14)}  //  ${entry.securedTotal}`).join('\n')
      : 'AWAITING FIRST DEPOSIT'
    TextShape.getMutable(this.leaderboardText).text = `LIVE VAULT LEADERS\n\n${rows}`
  }

  enterLobby(): void {
    void movePlayerTo({ newRelativePosition: { x: LOBBY_CENTER.x, y: 30.35, z: LOBBY_CENTER.z }, cameraTarget: { x: 72, y: 31.2, z: 78 } })
  }

  enterGame(): void {
    this.teleportFx.teleport(GAME_SPAWN_POINT, Vector3.create(MAZE_CENTER, 2, 3))
  }

  respawnFromDeath(): void {
    this.teleportFx.deathRespawn(GAME_SPAWN_POINT, Vector3.create(MAZE_CENTER, 2, 3))
  }

  private createShell(): void {
    this.collider(Vector3.create(72, 29.75, 72), Vector3.create(32, 0.5, 28))
    const roofBacking = engine.addEntity()
    // Backing sits above the decorative ceiling, sealing the sky without
    // covering the patterned undersides that players see from the room.
    Transform.create(roofBacking, { position: Vector3.create(72, 36.78, 72), scale: Vector3.create(32.5, 0.48, 28.5) })
    MeshRenderer.setBox(roofBacking)
    MeshCollider.setBox(roofBacking)
    Material.setPbrMaterial(roofBacking, {
      albedoColor: Color4.create(0.012, 0.02, 0.07, 1),
      emissiveColor: Color4.create(0.015, 0.08, 0.18, 1),
      emissiveIntensity: 1.6,
      metallic: 0.82,
      roughness: 0.28
    })
    ;[
      [55.85, 72, 0.45, 6.6, 14], [88.15, 72, 0.45, 6.6, 14],
      [72, 57.85, 16, 6.6, 0.45], [72, 86.15, 16, 6.6, 0.45]
    ].forEach(([x, z, sx, sy, sz]) => this.collider(Vector3.create(x, 32.8, z), Vector3.create(sx, sy, sz)))
  }

  private createSpawnStation(): void {
    // Keep the visual station against the south parcel edge and completely
    // clear of the maze boundary. The arrival point remains safely in-bounds.
    const center = Vector3.create(GAME_SPAWN_POINT.x, GAME_SPAWN_POINT.y, 2.15)

    const model = (src: string, x: number, y: number, z: number, scale: number, yaw = 0): void => {
      const entity = engine.addEntity()
      Transform.create(entity, {
        position: Vector3.create(center.x + x, y, center.z + z),
        scale: Vector3.create(scale, scale, scale),
        rotation: Quaternion.fromEulerDegrees(0, yaw, 0)
      })
      GltfContainer.create(entity, { src })
    }

    // Use the authored Sci-Fi Pack floor modules instead of a colored box.
    for (const x of [-4, 0, 4]) {
      model('assets/asset-packs/component_floor_panel/FloorSciFiPanel_04/FloorSciFiPanel_04.glb', x, 0.03, 0, 0.94)
    }
    model('assets/asset-packs/hallway_door_open/Hallway_Module_Door_02/Hallway_Module_Door_02.glb', 0, 0.02, 0.65, 1.05, 180)
    for (const x of [-5.2, 5.2]) {
      model('assets/asset-packs/dock_column/Dock_Column_01/Dock_Column_01.glb', x, 0.02, -0.25, 0.9)
      model('assets/asset-packs/light_column/Light_02/Light_02.glb', x, 0.02, 0.45, 0.82)
    }
    model('assets/asset-packs/command_console/CommandControl_01/CommandControl_01.glb', 0, 0.02, -0.4, 0.88)
    model('assets/asset-packs/blue_plasma/PlasmaBlue_01/PlasmaBlue_01.glb', -3.6, 0.04, 0.35, 0.82)
    model('assets/asset-packs/pink_plasma/PlasmaPink_01/PlasmaPink_01.glb', 3.6, 0.04, 0.35, 0.82)

    const createReturnStation = (xOffset: number, stationNumber: number): void => {
      model('assets/asset-packs/component_floor_panel/FloorSciFiPanel_04/FloorSciFiPanel_04.glb', xOffset, 0.03, -0.15, 0.72)
      model('assets/asset-packs/vertical_console/KeyboardSciFi_01/KeyboardSciFi_01.glb', xOffset, 0.03, 0.35, 0.78, 180)
      model('assets/asset-packs/light_column/Light_02/Light_02.glb', xOffset - 1.15, 0.02, 0.5, 0.65)
      model('assets/asset-packs/light_column/Light_02/Light_02.glb', xOffset + 1.15, 0.02, 0.5, 0.65)

      // Large vertical target sits in front of the console, facing the open
      // approach. It cannot be occluded by the terminal model or floor.
      const screen = engine.addEntity()
      Transform.create(screen, {
        position: Vector3.create(center.x + xOffset, 1.15, 0.42),
        scale: Vector3.create(1.05, 0.62, 0.14)
      })
      MeshRenderer.setBox(screen)
      MeshCollider.setBox(screen)
      Material.setPbrMaterial(screen, {
        albedoColor: Color4.create(0.015, 0.08, 0.15, 1),
        emissiveColor: Color4.create(0.1, 0.92, 1, 1),
        emissiveIntensity: 8,
        metallic: 0.68,
        roughness: 0.16
      })
      pointerEventsSystem.onPointerDown({
        entity: screen,
        opts: { button: InputAction.IA_PRIMARY, hoverText: 'REDEPLOY TO SKY LOBBY', maxDistance: 10 }
      }, () => this.teleportFx.teleport(LOBBY_CENTER, Vector3.create(72, 31.2, 78), this.onReturnLobby))

      const label = engine.addEntity()
      Transform.create(label, {
        position: Vector3.create(center.x + xOffset, 1.15, 0.26),
        scale: Vector3.create(0.25, 0.25, 0.25)
      })
      TextShape.create(label, {
        text: `REDEPLOY // 0${stationNumber}\nSKY LOBBY\nPRESS E`,
        fontSize: 2.9,
        textColor: Color4.create(0.9, 0.99, 1, 1),
        outlineColor: Color4.create(0, 0.01, 0.05, 1),
        outlineWidth: 0.18
      })
    }

    createReturnStation(-8, 1)
    createReturnStation(8, 2)

    const sign = engine.addEntity()
    Transform.create(sign, { position: Vector3.create(center.x, 3.05, center.z + 0.7), scale: Vector3.create(0.46, 0.46, 0.46) })
    TextShape.create(sign, {
      text: 'RESPAWN // TRANSIT HUB',
      fontSize: 3.4,
      textColor: Color4.create(0.28, 0.94, 1, 1),
      outlineColor: Color4.create(0.01, 0.02, 0.1, 1),
      outlineWidth: 0.15
    })

    // Permanent mission briefing mounted on the entrance wall. The authored
    // sci-fi panel is the backing; the readable text sits just in front.
    const missionPanel = engine.addEntity()
    Transform.create(missionPanel, {
      position: Vector3.create(center.x + 8.3, 2.65, 6.65),
      scale: Vector3.create(2.15, 2.15, 2.15),
      rotation: Quaternion.fromEulerDegrees(0, 180, 0)
    })
    GltfContainer.create(missionPanel, { src: 'assets/asset-packs/cross_panel/PanelSciFi_02/PanelSciFi_02.glb' })

    const missionText = engine.addEntity()
    Transform.create(missionText, {
      position: Vector3.create(center.x + 8.3, 2.65, 6.28),
      scale: Vector3.create(0.34, 0.34, 0.34)
    })
    TextShape.create(missionText, {
      text: 'MAZE VAULT // MISSION\n\nCOLLECT  •  RETURN  •  SECURE\n\nTouch cyan orbs to carry them\nReturn to the central purple Vault\nto bank them before time expires\nAvoid active laser corridors\nOnly SECURED orbs count',
      fontSize: 2.55,
      textColor: Color4.create(0.86, 0.98, 1, 1),
      outlineColor: Color4.create(0, 0.01, 0.04, 1),
      outlineWidth: 0.18
    })
  }

  private createDeploymentBays(): void {
    this.createDeploymentBay(Vector3.create(72, 30.05, 72), 'PUBLIC DEPLOY', 'Shared social maze\nAll players together', this.onPublicDeploy, Color4.create(0.08, 0.95, 1, 1), 3)
  }

  private createDeploymentBay(center: Vector3, title: string, description: string, action: () => void, accent: Color4, noticeOffsetX: number): void {
    const floor = engine.addEntity()
    Transform.create(floor, { position: center, scale: Vector3.create(1.15, 1.15, 1.15) })
    GltfContainer.create(floor, { src: 'assets/asset-packs/component_floor_panel/FloorSciFiPanel_04/FloorSciFiPanel_04.glb' })

    const terminal = engine.addEntity()
    Transform.create(terminal, { position: Vector3.create(center.x, center.y + 0.18, center.z), scale: Vector3.create(1.75, 0.14, 1.75) })
    MeshRenderer.setBox(terminal)
    MeshCollider.setBox(terminal)
    Material.setPbrMaterial(terminal, { albedoColor: Color4.create(0.02, 0.08, 0.16, 1), emissiveColor: accent, emissiveIntensity: 8, metallic: 0.75, roughness: 0.16 })
    pointerEventsSystem.onPointerDown({ entity: terminal, opts: { button: InputAction.IA_PRIMARY, hoverText: title, maxDistance: 7 } }, action)

    const floating = engine.addEntity()
    Transform.create(floating, { position: Vector3.create(center.x, center.y + 2.65, center.z + 0.2), scale: Vector3.create(0.38, 0.38, 0.38) })
    TextShape.create(floating, { text: title, fontSize: 3.4, textColor: accent, outlineColor: Color4.create(0.01, 0.02, 0.08, 1), outlineWidth: 0.14 })

    const board = engine.addEntity()
    Transform.create(board, { position: Vector3.create(center.x + noticeOffsetX, center.y + 1.45, center.z + 1.15), scale: Vector3.create(2.6, 1.18, 0.12) })
    MeshRenderer.setBox(board)
    Material.setPbrMaterial(board, {
      albedoColor: Color4.create(0.006, 0.012, 0.035, 1),
      emissiveColor: Color4.create(0.004, 0.01, 0.025, 1),
      emissiveIntensity: 0.12,
      metallic: 0.38,
      roughness: 0.52
    })
    const notice = engine.addEntity()
    Transform.create(notice, { position: Vector3.create(center.x + noticeOffsetX, center.y + 1.45, center.z + 1.02), scale: Vector3.create(0.3, 0.3, 0.3) })
    TextShape.create(notice, {
      text: `${title}\n\n${description}\nPRESS E`,
      fontSize: 3.25,
      textColor: Color4.create(0.88, 0.98, 1, 1),
      outlineColor: Color4.create(0, 0, 0.015, 1),
      outlineWidth: 0.22
    })
  }

  private createLeaderboardWall(): void {
    const panel = engine.addEntity()
    Transform.create(panel, { position: Vector3.create(60, 32.5, 85.55), scale: Vector3.create(7.2, 3.2, 0.18) })
    MeshRenderer.setBox(panel)
    Material.setPbrMaterial(panel, { albedoColor: Color4.create(0.006, 0.02, 0.06, 1), emissiveColor: Color4.create(0.04, 0.28, 0.5, 1), emissiveIntensity: 2.8, metallic: 0.5, roughness: 0.25 })
    this.leaderboardText = engine.addEntity()
    Transform.create(this.leaderboardText, { position: Vector3.create(60, 32.5, 85.35), rotation: Quaternion.fromEulerDegrees(0, 0, 0), scale: Vector3.create(0.5, 0.5, 0.5) })
    TextShape.create(this.leaderboardText, { text: 'LIVE VAULT LEADERS\n\nAWAITING FIRST DEPOSIT', fontSize: 2.8, textColor: Color4.create(0.38, 0.94, 1, 1), outlineColor: Color4.create(0, 0.02, 0.08, 1), outlineWidth: 0.1 })
  }

  private collider(position: Vector3, scale: Vector3): void {
    const entity = engine.addEntity()
    Transform.create(entity, { position, scale })
    MeshCollider.setBox(entity)
  }

}
