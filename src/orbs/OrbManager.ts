import {
  engine,
  GltfContainer,
  Transform,
  TriggerArea,
  triggerAreaEventsSystem
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import type { Entity } from '@dcl/sdk/ecs'
import { CELL_SIZE, GRID_OFFSET, MAZE_CENTER, MAZE_LAYOUT } from '../maze/MazeManager'
import { PlayerManager } from '../players/PlayerManager'

export const ORB_COUNT = 240
const ORB_HEIGHT = 1.05

type OrbSpawn = {
  id: string
  position: Vector3
}

const seededRandom = (seedText: string): (() => number) => {
  let seed = 2166136261
  for (let index = 0; index < seedText.length; index++) {
    seed ^= seedText.charCodeAt(index)
    seed = Math.imul(seed, 16777619)
  }
  return () => {
    seed += 0x6D2B79F5
    let value = seed
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

const createOrbSpawns = (roundSeed: string): OrbSpawn[] => {
  const candidates: Vector3[] = []
  MAZE_LAYOUT.forEach((row, rowIndex) => {
    row.split('').forEach((cell, columnIndex) => {
      if (cell !== '.') return
      const x = GRID_OFFSET + columnIndex * CELL_SIZE
      const z = GRID_OFFSET + (MAZE_LAYOUT.length - 1 - rowIndex) * CELL_SIZE
      const distanceFromVault = Math.hypot(x - MAZE_CENTER, z - MAZE_CENTER)
      const isEntranceLane = z < 9 && Math.abs(x - MAZE_CENTER) < 5
      if (distanceFromVault > 6 && !isEntranceLane) candidates.push(Vector3.create(x, ORB_HEIGHT, z))
    })
  })

  const random = seededRandom(roundSeed)
  for (let index = candidates.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = candidates[index]
    candidates[index] = candidates[swapIndex]
    candidates[swapIndex] = current
  }
  return Array.from({ length: ORB_COUNT }, (_, index) => {
    return {
      id: `orb-${String(index + 1).padStart(3, '0')}`,
      position: candidates[index]
    }
  })
}

export class OrbManager {
  private readonly collectedOrbIds = new Set<string>()
  private readonly activeOrbEntities = new Map<string, Entity>()
  private orbAnimationTime = 0
  private animationCursor = 0
  private animationSystemAdded = false
  private collectionEnabled = false

  constructor(private readonly playerManager: PlayerManager, private readonly requestClaim: (orbId: string) => void, private readonly onLocalCollected: () => void = () => undefined) {}

  spawn(roundSeed = 'waiting'): void {
    createOrbSpawns(roundSeed).forEach((orb) => this.createOrb(orb))
    if (!this.animationSystemAdded) {
      this.animationSystemAdded = true
      engine.addSystem((dt) => this.animateOrbs(dt))
    }
  }

  setCollectionEnabled(enabled: boolean): void {
    this.collectionEnabled = enabled
  }

  reset(roundSeed: string): void {
    this.activeOrbEntities.forEach((entity) => {
      triggerAreaEventsSystem.removeOnTriggerEnter(entity)
      engine.removeEntityWithChildren(entity)
    })
    this.activeOrbEntities.clear()
    this.collectedOrbIds.clear()
    this.spawn(roundSeed)
  }

  private createOrb(orb: OrbSpawn): void {
    const entity = engine.addEntity()
    Transform.create(entity, {
      position: orb.position,
      scale: Vector3.create(0.24, 0.24, 0.24)
    })
    GltfContainer.create(entity, { src: 'assets/models/pickups/time-orb.glb' })
    TriggerArea.setSphere(entity)
    this.activeOrbEntities.set(orb.id, entity)
    triggerAreaEventsSystem.onTriggerEnter(entity, (event) => {
      if (event.trigger?.entity !== engine.PlayerEntity) return
      if (!this.collectionEnabled) return
      this.requestClaim(orb.id)
    })
  }

  resolveClaim(orbId: string, winnerPlayerId: string): void {
    if (this.collectedOrbIds.has(orbId)) return
    const entity = this.activeOrbEntities.get(orbId)
    if (!entity) return
    this.collectedOrbIds.add(orbId)
    this.activeOrbEntities.delete(orbId)
    if (winnerPlayerId === this.playerManager.snapshot.playerId) { this.playerManager.collectOrb(); this.onLocalCollected() }
    triggerAreaEventsSystem.removeOnTriggerEnter(entity)
    engine.removeEntityWithChildren(entity)
  }
  get claimedIds(): string[] { return [...this.collectedOrbIds] }

  private animateOrbs(deltaTime: number): void {
    this.orbAnimationTime += deltaTime
    const entities = [...this.activeOrbEntities.values()]
    if (entities.length === 0) return
    // Update a small batch per frame so the expanded pickup field remains mobile-friendly.
    for (let offset = 0; offset < Math.min(20, entities.length); offset++) {
      const entity = entities[(this.animationCursor + offset) % entities.length]
      const transform = Transform.getMutableOrNull(entity)
      if (!transform) continue
      const pulse = 0.24 + Math.sin(this.orbAnimationTime * 3.2 + Number(entity) * 0.37) * 0.02
      transform.scale = Vector3.create(pulse, pulse, pulse)
      transform.position.y = ORB_HEIGHT + Math.sin(this.orbAnimationTime * 2.1 + Number(entity)) * 0.16
      transform.rotation = Quaternion.fromEulerDegrees(0, this.orbAnimationTime * 42 + Number(entity) * 13, 0)
    }
    this.animationCursor = (this.animationCursor + 20) % entities.length
  }
}
