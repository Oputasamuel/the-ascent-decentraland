import {
  engine,
  GltfContainer,
  LightSource,
  Transform,
  TriggerArea,
  triggerAreaEventsSystem,
  type Entity
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { CELL_SIZE, GRID_OFFSET, MAZE_CENTER, MAZE_LAYOUT } from '../maze/MazeManager'
import { setTrapMessage } from '../ui'

const LASER_TRAP_COUNT = 48
const COOLDOWN_MS = 2200
const BEAM_LENGTH = CELL_SIZE + 0.04
const EMITTER_MODEL = 'assets/models/lasers/laser-emitter.glb'
const LASER_BEAM_MODEL = 'assets/models/lasers/neon-red-laser.glb'

type BeamAxis = 'x' | 'z'
type LaserBehavior = 'jump' | 'pulse' | 'sweep' | 'vertical'
type CorridorCell = { row: number; column: number; beamAxis: BeamAxis }

type LaserTrap = {
  beam: Entity
  visuals: Array<{ entity: Entity; offsetY: number }>
  emitters: [Entity, Entity]
  checkpoint: Vector3
  behavior: LaserBehavior
  beamAxis: BeamAxis
  basePosition: Vector3
  baseScale: Vector3
  phase: number
  active: boolean
}

const cellPosition = (row: number, column: number, y = 0): Vector3 =>
  Vector3.create(
    GRID_OFFSET + column * CELL_SIZE,
    y,
    GRID_OFFSET + (MAZE_LAYOUT.length - 1 - row) * CELL_SIZE
  )

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

const MAZE_ENTRANCE_CHECKPOINT = Vector3.create(MAZE_CENTER, 1, 1.6)

const corridorCandidates = (): CorridorCell[] => {
  const cells: CorridorCell[] = []
  MAZE_LAYOUT.forEach((line, row) => line.split('').forEach((cell, column) => {
    if (cell !== '.' || row < 3 || row > MAZE_LAYOUT.length - 4) return
    const left = line[column - 1]
    const right = line[column + 1]
    const above = MAZE_LAYOUT[row - 1]?.[column]
    const below = MAZE_LAYOUT[row + 1]?.[column]
    const verticalCorridor = left === '#' && right === '#' && above === '.' && below === '.'
    const horizontalCorridor = above === '#' && below === '#' && left === '.' && right === '.'
    if (!verticalCorridor && !horizontalCorridor) return
    const position = cellPosition(row, column)
    const nearVault = Math.hypot(position.x - MAZE_CENTER, position.z - MAZE_CENTER) < 13
    const nearEntrance = position.z < 14 && Math.abs(position.x - MAZE_CENTER) < 8
    if (!nearVault && !nearEntrance) cells.push({ row, column, beamAxis: verticalCorridor ? 'x' : 'z' })
  }))
  return cells
}

const createDefinitions = (roundSeed: string): Array<CorridorCell & { behavior: LaserBehavior; phase: number }> => {
  const random = seededRandom(roundSeed + '-lasers')
  const candidates = corridorCandidates()
  for (let index = candidates.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = candidates[index]
    candidates[index] = candidates[swapIndex]
    candidates[swapIndex] = current
  }
  // Farthest-point sampling prevents a shuffled candidate list from forming
  // dense trap clusters. The shuffled first choice keeps every round unique,
  // then each additional laser fills the largest unguarded part of the maze.
  const selected: CorridorCell[] = candidates.length > 0 ? [candidates.shift()!] : []
  while (selected.length < LASER_TRAP_COUNT && candidates.length > 0) {
    let bestIndex = 0
    let bestDistance = -1
    candidates.forEach((candidate, index) => {
      const nearestTrapDistance = selected.reduce((nearest, existing) => {
        const distance = Math.abs(existing.row - candidate.row) + Math.abs(existing.column - candidate.column)
        return Math.min(nearest, distance)
      }, Number.POSITIVE_INFINITY)
      if (nearestTrapDistance > bestDistance) {
        bestDistance = nearestTrapDistance
        bestIndex = index
      }
    })
    selected.push(candidates.splice(bestIndex, 1)[0])
  }
  const behaviors: LaserBehavior[] = ['jump', 'pulse', 'sweep', 'vertical']
  return selected.map((cell, index) => ({
    ...cell,
    behavior: behaviors[(index + Math.floor(random() * behaviors.length)) % behaviors.length],
    phase: random() * Math.PI * 2
  }))
}

export class TrapManager {
  private enabled = false
  private cooldownUntil = 0
  private messageSeconds = 0
  private elapsed = 0
  private readonly traps: LaserTrap[] = []
  private animationSystemAdded = false

  constructor(
    private readonly onTrapHit: () => void = () => undefined,
    private readonly onPlayerDeath: () => void = () => undefined
  ) {}

  build(): void {
    if (this.animationSystemAdded) return
    this.animationSystemAdded = true
    engine.addSystem((deltaTime) => {
      this.elapsed += deltaTime
      this.animateLasers()
      if (this.messageSeconds <= 0) return
      this.messageSeconds -= deltaTime
      if (this.messageSeconds <= 0) setTrapMessage('')
    })
  }

  reset(roundSeed: string): void {
    this.traps.forEach((trap) => {
      triggerAreaEventsSystem.removeOnTriggerEnter(trap.beam)
      engine.removeEntity(trap.beam)
      trap.visuals.forEach((visual) => engine.removeEntity(visual.entity))
      trap.emitters.forEach((emitter) => engine.removeEntity(emitter))
    })
    this.traps.length = 0
    this.elapsed = 0
    createDefinitions(roundSeed).forEach((definition) => this.createLaser(definition))
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.cooldownUntil = 0
      this.messageSeconds = 0
      setTrapMessage('')
    }
    this.traps.forEach((trap) => this.setBeamActive(trap, enabled && trap.behavior !== 'pulse'))
  }

  private createLaser(definition: CorridorCell & { behavior: LaserBehavior; phase: number }): void {
    const isGate = definition.behavior === 'pulse' || definition.behavior === 'sweep'
    const height = definition.behavior === 'jump' ? 0.58 : definition.behavior === 'vertical' ? 1.35 : 1.5
    const basePosition = cellPosition(definition.row, definition.column, height)
    const baseScale = definition.beamAxis === 'x'
      ? Vector3.create(BEAM_LENGTH, isGate ? 2.8 : 0.18, 0.18)
      : Vector3.create(0.18, isGate ? 2.8 : 0.18, BEAM_LENGTH)
    const beam = engine.addEntity()
    Transform.create(beam, { position: basePosition, scale: baseScale })
    LightSource.create(beam, {
      active: false,
      color: { r: 1, g: 0.015, b: 0.025 },
      intensity: 2100,
      range: 7,
      shadow: false,
      type: LightSource.Type.Point({})
    })

    const rayOffsets = isGate ? [-0.9, 0, 0.9] : [0]
    const visuals: Array<{ entity: Entity; offsetY: number }> = []
    rayOffsets.forEach((offsetY) => {
      const visual = engine.addEntity()
      const rotation = definition.beamAxis === 'x'
        ? Quaternion.fromEulerDegrees(0, 0, 90)
        : Quaternion.fromEulerDegrees(90, 0, 0)
      Transform.create(visual, {
        position: Vector3.create(basePosition.x, basePosition.y + offsetY, basePosition.z),
        rotation,
        scale: Vector3.create(0.085, BEAM_LENGTH, 0.085)
      })
      visuals.push({ entity: visual, offsetY })
    })

    const emitterOffset = CELL_SIZE / 2 - 0.07
    const emitterPositions: [Vector3, Vector3] = definition.beamAxis === 'x'
      ? [
          Vector3.create(basePosition.x - emitterOffset, height, basePosition.z),
          Vector3.create(basePosition.x + emitterOffset, height, basePosition.z)
        ]
      : [
          Vector3.create(basePosition.x, height, basePosition.z - emitterOffset),
          Vector3.create(basePosition.x, height, basePosition.z + emitterOffset)
        ]
    const emitters = emitterPositions.map((position, index) => {
      const emitter = engine.addEntity()
      const yaw = definition.beamAxis === 'x' ? (index === 0 ? 90 : -90) : (index === 0 ? 0 : 180)
      Transform.create(emitter, {
        position,
        rotation: Quaternion.fromEulerDegrees(0, yaw, definition.behavior === 'vertical' ? 90 : 0),
        scale: Vector3.create(0.32, 0.32, 0.32)
      })
      GltfContainer.create(emitter, { src: EMITTER_MODEL })
      return emitter
    }) as [Entity, Entity]

    const trap: LaserTrap = {
      beam,
      visuals,
      emitters,
      checkpoint: MAZE_ENTRANCE_CHECKPOINT,
      behavior: definition.behavior,
      beamAxis: definition.beamAxis,
      basePosition,
      baseScale,
      phase: definition.phase,
      active: false
    }
    this.traps.push(trap)
    this.setBeamActive(trap, false)

    triggerAreaEventsSystem.onTriggerEnter(beam, (event) => {
      if (event.trigger?.entity !== engine.PlayerEntity || !this.enabled || !trap.active || Date.now() < this.cooldownUntil) return
      this.cooldownUntil = Date.now() + COOLDOWN_MS
      this.onTrapHit()
      const label = trap.behavior === 'jump'
        ? 'LOW LASER // JUMP REQUIRED'
        : trap.behavior === 'pulse'
          ? 'PULSE LASER // TIME THE GAP'
          : trap.behavior === 'sweep'
            ? 'SWEEP LASER // ROUTE SETBACK'
            : 'VERTICAL LASER // ROUTE SETBACK'
      setTrapMessage(label)
      this.messageSeconds = 1.8
      this.onPlayerDeath()
    })
  }

  private setBeamActive(trap: LaserTrap, active: boolean): void {
    if (trap.active === active) return
    trap.active = active
    if (active) {
      TriggerArea.setBox(trap.beam)
      trap.visuals.forEach((visual) => {
        GltfContainer.createOrReplace(visual.entity, { src: LASER_BEAM_MODEL })
      })
    } else {
      TriggerArea.deleteFrom(trap.beam)
      trap.visuals.forEach((visual) => GltfContainer.deleteFrom(visual.entity))
    }
    const light = LightSource.getMutableOrNull(trap.beam)
    if (light) light.active = active
  }

  private animateLasers(): void {
    for (const trap of this.traps) {
      const beamTransform = Transform.getMutableOrNull(trap.beam)
      if (!beamTransform) continue
      const wave = Math.sin(this.elapsed * 1.65 + trap.phase)
      let x = trap.basePosition.x
      let y = trap.basePosition.y
      let z = trap.basePosition.z

      if (trap.behavior === 'sweep') {
        if (trap.beamAxis === 'x') z += wave * 0.82
        else x += wave * 0.82
      }
      if (trap.behavior === 'vertical') y = 1.35 + wave * 0.92

      beamTransform.position = Vector3.create(x, y, z)
      beamTransform.scale = trap.baseScale
      trap.visuals.forEach((visual) => {
        const visualTransform = Transform.getMutableOrNull(visual.entity)
        if (!visualTransform) return
        visualTransform.position = Vector3.create(x, y + visual.offsetY, z)
        const thickness = 0.082 + Math.sin(this.elapsed * 18 + trap.phase) * 0.006
        visualTransform.scale = Vector3.create(thickness, BEAM_LENGTH, thickness)
      })
      trap.emitters.forEach((emitter, index) => {
        const emitterTransform = Transform.getMutableOrNull(emitter)
        if (!emitterTransform) return
        const side = index === 0 ? -1 : 1
        emitterTransform.position = trap.beamAxis === 'x'
          ? Vector3.create(x + side * (CELL_SIZE / 2 - 0.07), y, z)
          : Vector3.create(x, y, z + side * (CELL_SIZE / 2 - 0.07))
      })
      const light = LightSource.getMutableOrNull(trap.beam)
      if (light && trap.active) light.intensity = 1950 + Math.sin(this.elapsed * 16 + trap.phase) * 250

      const pulseActive = (this.elapsed + trap.phase) % 4.2 < 2.45
      const shouldBeActive = this.enabled && (trap.behavior !== 'pulse' || pulseActive)
      this.setBeamActive(trap, shouldBeActive)
    }
  }
}
