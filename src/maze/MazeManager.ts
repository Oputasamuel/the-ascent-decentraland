import { engine, GltfContainer, LightSource, Material, MeshCollider, MeshRenderer, TextShape, TextureWrapMode, Transform } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector2, Vector3 } from '@dcl/sdk/math'

export const MAZE_WORLD_SIZE = 144
// Leave a proper exterior transit apron between the south station and maze.
export const GRID_OFFSET = 7
const MAZE_GRID_SIZE = 55
const MAZE_MIDDLE = (MAZE_GRID_SIZE - 1) / 2
export const CELL_SIZE = (MAZE_WORLD_SIZE - GRID_OFFSET * 2) / (MAZE_GRID_SIZE - 1)
export const MAZE_CENTER = GRID_OFFSET + MAZE_MIDDLE * CELL_SIZE
const WALL_HEIGHT = 6
const WALL_DEPTH = 0.62

const LANTERN_COUNT = 56
const TECH_WALL_TEXTURE = 'assets/textures/maze/tech-wall.png'

const generateMazeLayout = (): string[] => {
  const grid = Array.from({ length: MAZE_GRID_SIZE }, () => Array<string>(MAZE_GRID_SIZE).fill('#'))
  let seed = 0x5f3759df
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const directions: Array<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  const startRow = MAZE_GRID_SIZE - 2
  const startColumn = MAZE_MIDDLE
  const stack: Array<[number, number]> = [[startRow, startColumn]]
  grid[startRow][startColumn] = '.'

  while (stack.length > 0) {
    const [row, column] = stack[stack.length - 1]
    const shuffled = [...directions]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1))
      ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
    }
    let carved = false
    for (const [dr, dc] of shuffled) {
      const nextRow = row + dr * 2
      const nextColumn = column + dc * 2
      if (nextRow < 1 || nextRow >= MAZE_GRID_SIZE - 1 || nextColumn < 1 || nextColumn >= MAZE_GRID_SIZE - 1) continue
      if (grid[nextRow][nextColumn] !== '#') continue
      grid[row + dr][column + dc] = '.'
      grid[nextRow][nextColumn] = '.'
      stack.push([nextRow, nextColumn])
      carved = true
      break
    }
    if (!carved) stack.pop()
  }

  // Entry and a compact central vault chamber, both connected to the maze.
  grid[MAZE_GRID_SIZE - 1][MAZE_MIDDLE] = '.'
  for (let row = MAZE_MIDDLE - 1; row <= MAZE_MIDDLE + 1; row++) {
    for (let column = MAZE_MIDDLE - 1; column <= MAZE_MIDDLE + 1; column++) grid[row][column] = '.'
  }
  return grid.map((row) => row.join(''))
}

// A deterministic perfect maze: every corridor is reachable, but there is
// only one correct route between locations and many convincing dead ends.
export const MAZE_LAYOUT = generateMazeLayout()

const createBox = (position: Vector3, scale: Vector3, color: Color4, collider = true): void => {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setBox(entity)
  if (collider) MeshCollider.setBox(entity)
  Material.setPbrMaterial(entity, {
    albedoColor: color,
    emissiveColor: Color4.create(0.018, 0.035, 0.09, 1),
    emissiveIntensity: 0.75,
    metallic: 0.28,
    roughness: 0.58
  })
}

const createTechStrip = (position: Vector3, scale: Vector3, color: Color4, intensity: number): void => {
  const strip = engine.addEntity()
  Transform.create(strip, { position, scale })
  MeshRenderer.setBox(strip)
  Material.setPbrMaterial(strip, {
    albedoColor: color,
    emissiveColor: color,
    emissiveIntensity: intensity,
    metallic: 0.45,
    roughness: 0.16
  })
}

const createSciFiAsset = (src: string, position: Vector3, scale = Vector3.One(), rotationY = 0): void => {
  const entity = engine.addEntity()
  Transform.create(entity, {
    position,
    scale,
    rotation: Quaternion.fromAngleAxis(rotationY, Vector3.Up())
  })
  GltfContainer.create(entity, { src })
}

const createWallBox = (position: Vector3, scale: Vector3): void => {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)
  const repeat = Math.max(1, Math.max(scale.x, scale.z) / CELL_SIZE)
  Material.setPbrMaterial(entity, {
    texture: Material.Texture.Common({
      src: TECH_WALL_TEXTURE,
      wrapMode: TextureWrapMode.TWM_REPEAT,
      tiling: Vector2.create(repeat, 2)
    }),
    albedoColor: Color4.create(0.42, 0.48, 0.64, 1),
    emissiveColor: Color4.create(0.018, 0.045, 0.12, 1),
    emissiveIntensity: 1.25,
    metallic: 0.46,
    roughness: 0.48
  })
}

export class MazeManager {
  build(): void {
    this.createMazeWalls()
    this.createJumpBarrier()
    this.createWallLights()
    this.createGameplayProps()
    this.createVaultPlaceholder()
    this.createEntranceMarker()
    this.createExteriorDecor()
  }

  private createExteriorDecor(): void {
    const lightColumn = 'assets/asset-packs/light_column/Light_02/Light_02.glb'
    const antenna = 'assets/asset-packs/blue_antenna_dish/Antenna_02/Antenna_02.glb'
    const battery = 'assets/asset-packs/wired_battery_pack/Battery_03/Battery_03.glb'
    const crate = 'assets/asset-packs/grey_blue_crate/CrateBlueBig_01/CrateBlueBig_01.glb'
    const solar = 'assets/asset-packs/solar_panel/SolarPanel_01/SolarPanel_01.glb'

    for (let index = 0; index < 14; index++) {
      const offset = 5 + index * 10.2
      createSciFiAsset(lightColumn, Vector3.create(-4.5, 0, offset), Vector3.create(1.1, 1.35, 1.1))
      createSciFiAsset(lightColumn, Vector3.create(148.5, 0, offset), Vector3.create(1.1, 1.35, 1.1), 180)
    }

    ;[
      [-8, -8, antenna, 35], [152, -8, antenna, -35],
      [-8, 152, antenna, 145], [152, 152, antenna, 215],
      [26, -6, solar, 0], [52, -7, battery, 15], [92, -7, crate, -12], [118, -6, solar, 0],
      [26, 150, crate, 175], [52, 151, solar, 180], [92, 151, battery, 190], [118, 150, crate, 170]
    ].forEach(([x, z, src, angle], index) => {
      const scale = index < 4 ? Vector3.create(1.45, 1.45, 1.45) : Vector3.create(1.2, 1.2, 1.2)
      createSciFiAsset(src as string, Vector3.create(x as number, 0, z as number), scale, angle as number)
    })

    const console = 'assets/asset-packs/vertical_console/KeyboardSciFi_01/KeyboardSciFi_01.glb'
    const orangeCrate = 'assets/asset-packs/orange_crate/CrateOrange_01/CrateOrange_01.glb'
    const blueCrate = 'assets/asset-packs/small_blue_crate/CrateBlue_01/CrateBlue_01.glb'
    for (let index = 0; index < 10; index++) {
      const x = 10 + index * 13.7
      createSciFiAsset(index % 2 === 0 ? orangeCrate : blueCrate, Vector3.create(x, 0, -5.5), Vector3.create(1.15, 1.15, 1.15), index * 29)
      createSciFiAsset(console, Vector3.create(x, 0, 149.5), Vector3.create(1.08, 1.08, 1.08), 180)
    }

    this.createDenseForest()
  }

  private createDenseForest(): void {
    const trees = [
      'assets/asset-packs/green_acacia_tree/Tree_Forest_Green_01/Tree_Forest_Green_01.glb',
      'assets/asset-packs/clustered_green_acacia_tree/Tree_Forest_Green_03/Tree_Forest_Green_03.glb',
      'assets/asset-packs/tall_green_acacia_tree/Tree_Forest_Green_04/Tree_Forest_Green_04.glb',
      'assets/asset-packs/turquoise_acacia_tree/Tree_Forest_Turquoise_01/Tree_Forest_Turquoise_01.glb',
      'assets/asset-packs/blue_acacia_tree/Tree_Forest_Blue_01/Tree_Forest_Blue_01.glb'
    ]
    let treeIndex = 0
    let treeCandidateIndex = 0
    const plant = (x: number, z: number, size: number): void => {
      // Deterministically remove one of every four placements.
      const shouldSkip = treeCandidateIndex % 4 === 3
      treeCandidateIndex++
      if (shouldSkip) return
      createSciFiAsset(
        trees[treeIndex % trees.length],
        Vector3.create(x, -0.03, z),
        Vector3.create(size, size, size),
        (treeIndex * 83) % 360
      )
      treeIndex++
    }

    // Moderate clusters live in the broad generated landscape, well beyond
    // the maze walls. Clear radii are reserved around all redeploy stations.
    const stations = [Vector3.create(-8, 0, 38), Vector3.create(152, 0, 76), Vector3.create(72, 0, 152)]
    const isStationClearing = (x: number, z: number): boolean => stations.some((station) => {
      const dx = x - station.x
      const dz = z - station.z
      return dx * dx + dz * dz < 58
    })
    const outerBands = [
      { axis: 'west', fixed: -10, start: 8, end: 136 },
      { axis: 'east', fixed: 154, start: 8, end: 136 },
      { axis: 'south', fixed: -10, start: 8, end: 136 },
      { axis: 'north', fixed: 154, start: 8, end: 136 }
    ] as const

    outerBands.forEach((band, bandIndex) => {
      for (let distance = band.start + bandIndex * 2.1; distance <= band.end; distance += 10.5) {
        const drift = ((treeIndex % 5) - 2) * 1.35
        const x = band.axis === 'west' || band.axis === 'east' ? band.fixed + drift : distance
        const z = band.axis === 'south' || band.axis === 'north' ? band.fixed + drift : distance
        if (!isStationClearing(x, z)) plant(x, z, 0.82 + (treeIndex % 4) * 0.13)
      }
    })

    // Small natural-looking groves around existing rock areas, not a tree wall.
    ;[
      [-13, 18], [-14, 63], [-12, 111], [157, 28], [158, 118],
      [24, -14], [118, -13], [25, 157], [120, 158]
    ].forEach(([baseX, baseZ], groveIndex) => {
      for (let member = 0; member < 3; member++) {
        const angle = (groveIndex * 71 + member * 127) * Math.PI / 180
        const radius = 2.4 + member * 1.7
        const x = baseX + Math.cos(angle) * radius
        const z = baseZ + Math.sin(angle) * radius
        if (!isStationClearing(x, z)) plant(x, z, 0.78 + member * 0.12)
      }
    })
  }

  private createJumpBarrier(): void {
    const min = GRID_OFFSET - 0.42
    const max = GRID_OFFSET + (MAZE_LAYOUT.length - 1) * CELL_SIZE + 0.42
    const center = (min + max) / 2
    const span = max - min
    const height = 22
    const thickness = 0.32
    const entranceGap = 9
    const southSegment = (span - entranceGap) / 2
    const addBarrier = (position: Vector3, scale: Vector3): void => {
      const barrier = engine.addEntity()
      Transform.create(barrier, { position, scale })
      MeshCollider.setBox(barrier)
    }

    // West, east and north are continuous. South keeps the intended entrance.
    addBarrier(Vector3.create(min, height / 2, center), Vector3.create(thickness, height, span))
    addBarrier(Vector3.create(max, height / 2, center), Vector3.create(thickness, height, span))
    addBarrier(Vector3.create(center, height / 2, max), Vector3.create(span, height, thickness))
    addBarrier(
      Vector3.create(min + southSegment / 2, height / 2, min),
      Vector3.create(southSegment, height, thickness)
    )
    addBarrier(
      Vector3.create(max - southSegment / 2, height / 2, min),
      Vector3.create(southSegment, height, thickness)
    )
  }

  private createGameplayProps(): void {
    const floorBeacon = 'assets/asset-packs/floor_light_disc/Light_04/Light_04.glb'
    const verticalLight = 'assets/asset-packs/vertical_floor_light/LightFloor_01/LightFloor_01.glb'
    const panel = 'assets/asset-packs/cross_panel/PanelSciFi_02/PanelSciFi_02.glb'
    const candidates: Array<{ row: number; column: number }> = []

    for (let row = 3; row < MAZE_LAYOUT.length - 3; row += 5) {
      for (let column = 3; column < MAZE_LAYOUT[row].length - 3; column += 7) {
        if (MAZE_LAYOUT[row][column] !== '.') continue
        candidates.push({ row, column })
      }
    }

    candidates.slice(0, 24).forEach(({ row, column }, index) => {
      const x = GRID_OFFSET + column * CELL_SIZE
      const z = GRID_OFFSET + (MAZE_LAYOUT.length - 1 - row) * CELL_SIZE
      createSciFiAsset(
        index % 3 === 0 ? verticalLight : floorBeacon,
        Vector3.create(x, 0.03, z),
        index % 3 === 0 ? Vector3.create(0.72, 0.72, 0.72) : Vector3.create(0.9, 0.9, 0.9),
        index * 37
      )
      if (index % 6 === 0) {
        createSciFiAsset(panel, Vector3.create(x, 0.06, z), Vector3.create(0.55, 0.55, 0.55), index * 41)
      }
    })

    // Strong visual anchors at the entrance and vault make orientation easier.
    for (const x of [MAZE_CENTER - 5, MAZE_CENTER + 5]) {
      createSciFiAsset(verticalLight, Vector3.create(x, 0, 3.2), Vector3.create(1.1, 1.1, 1.1))
      createSciFiAsset(verticalLight, Vector3.create(x, 0, MAZE_WORLD_SIZE - 3.2), Vector3.create(1.1, 1.1, 1.1), 180)
    }
  }

  private createGround(): void {
    createBox(
      Vector3.create(50, -0.1, 50),
      Vector3.create(100, 0.2, 100),
      Color4.create(0.075, 0.095, 0.15, 1)
    )
  }

  private createMazeWalls(): void {
    MAZE_LAYOUT.forEach((row, rowIndex) => {
      let runStart = -1
      for (let column = 0; column <= row.length; column++) {
        const isWall = column < row.length && row[column] === '#'
        if (isWall && runStart < 0) runStart = column
        if (!isWall && runStart >= 0) {
          if (column - runStart > 1) this.createHorizontalWall(rowIndex, runStart, column - 1)
          runStart = -1
        }
      }
    })

    for (let column = 0; column < MAZE_LAYOUT[0].length; column++) {
      let runStart = -1
      for (let row = 0; row <= MAZE_LAYOUT.length; row++) {
        const isWall = row < MAZE_LAYOUT.length && MAZE_LAYOUT[row][column] === '#'
        if (isWall && runStart < 0) runStart = row
        if (!isWall && runStart >= 0) {
          if (row - runStart > 1) this.createVerticalWall(column, runStart, row - 1)
          runStart = -1
        }
      }
    }

    MAZE_LAYOUT.forEach((row, rowIndex) => {
      for (let column = 0; column < row.length; column++) {
        if (row[column] !== '#') continue
        const hasNeighbour =
          row[column - 1] === '#' || row[column + 1] === '#' ||
          MAZE_LAYOUT[rowIndex - 1]?.[column] === '#' || MAZE_LAYOUT[rowIndex + 1]?.[column] === '#'
        if (!hasNeighbour) this.createWallPillar(rowIndex, column)
      }
    })
  }

  private createHorizontalWall(row: number, startColumn: number, endColumn: number): void {
    const cellCount = endColumn - startColumn + 1
    const centerColumn = (startColumn + endColumn) / 2
    const x = GRID_OFFSET + centerColumn * CELL_SIZE
    const z = GRID_OFFSET + (MAZE_LAYOUT.length - 1 - row) * CELL_SIZE
    createWallBox(
      Vector3.create(x, WALL_HEIGHT / 2, z),
      Vector3.create((cellCount - 1) * CELL_SIZE + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH)
    )
    if ((row + startColumn) % 2 === 0) {
      const width = Math.max(0.5, (cellCount - 1) * CELL_SIZE + WALL_DEPTH - 0.42)
      const primary = (row + endColumn) % 3 === 0
        ? Color4.create(0.12, 0.72, 1, 1)
        : Color4.create(0.68, 0.18, 1, 1)
      createTechStrip(Vector3.create(x, 1.45, z), Vector3.create(width, 0.1, WALL_DEPTH + 0.045), primary, 14)
      if (cellCount >= 5) {
        const secondary = primary.b > 0.95
          ? Color4.create(0.72, 0.2, 1, 1)
          : Color4.create(0.12, 0.78, 1, 1)
        createTechStrip(Vector3.create(x, 4.35, z), Vector3.create(width * 0.56, 0.075, WALL_DEPTH + 0.05), secondary, 18)
      }
      if (cellCount >= 3) {
        const offset = Math.min(width * 0.28, 2.8)
        createTechStrip(
          Vector3.create(x - offset, 2.85, z),
          Vector3.create(0.085, 1.35, WALL_DEPTH + 0.055),
          Color4.create(0.18, 0.82, 1, 1),
          17
        )
        createTechStrip(
          Vector3.create(x + offset, 3.25, z),
          Vector3.create(0.07, 0.68, WALL_DEPTH + 0.06),
          Color4.create(0.74, 0.2, 1, 1),
          20
        )
      }
    }
  }

  private createVerticalWall(column: number, startRow: number, endRow: number): void {
    const cellCount = endRow - startRow + 1
    const centerRow = (startRow + endRow) / 2
    const x = GRID_OFFSET + column * CELL_SIZE
    const z = GRID_OFFSET + (MAZE_LAYOUT.length - 1 - centerRow) * CELL_SIZE
    createWallBox(
      Vector3.create(x, WALL_HEIGHT / 2, z),
      Vector3.create(WALL_DEPTH, WALL_HEIGHT, (cellCount - 1) * CELL_SIZE + WALL_DEPTH)
    )
    if ((column + startRow) % 2 === 1) {
      const depth = Math.max(0.5, (cellCount - 1) * CELL_SIZE + WALL_DEPTH - 0.42)
      const primary = (column + endRow) % 3 === 0
        ? Color4.create(0.14, 0.78, 1, 1)
        : Color4.create(0.7, 0.2, 1, 1)
      createTechStrip(Vector3.create(x, 1.45, z), Vector3.create(WALL_DEPTH + 0.045, 0.1, depth), primary, 14)
      if (cellCount >= 5) {
        const secondary = primary.b > 0.95
          ? Color4.create(0.74, 0.22, 1, 1)
          : Color4.create(0.12, 0.8, 1, 1)
        createTechStrip(Vector3.create(x, 4.35, z), Vector3.create(WALL_DEPTH + 0.05, 0.075, depth * 0.56), secondary, 18)
      }
      if (cellCount >= 3) {
        const offset = Math.min(depth * 0.28, 2.8)
        createTechStrip(
          Vector3.create(x, 2.85, z - offset),
          Vector3.create(WALL_DEPTH + 0.055, 1.35, 0.085),
          Color4.create(0.18, 0.82, 1, 1),
          17
        )
        createTechStrip(
          Vector3.create(x, 3.25, z + offset),
          Vector3.create(WALL_DEPTH + 0.06, 0.68, 0.07),
          Color4.create(0.74, 0.2, 1, 1),
          20
        )
      }
    }
  }

  private createWallPillar(row: number, column: number): void {
    const position = Vector3.create(
      GRID_OFFSET + column * CELL_SIZE,
      WALL_HEIGHT / 2,
      GRID_OFFSET + (MAZE_LAYOUT.length - 1 - row) * CELL_SIZE
    )
    createWallBox(
      position,
      Vector3.create(WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH)
    )
    if ((row + column) % 4 === 0) {
      createTechStrip(
        Vector3.create(position.x, 2.8, position.z),
        Vector3.create(WALL_DEPTH + 0.055, 0.3, WALL_DEPTH + 0.055),
        Color4.create(0.76, 0.22, 1, 1),
        20
      )
    }
  }

  private createWallLights(): void {
    const wallCells: Vector3[] = []
    MAZE_LAYOUT.forEach((row, rowIndex) => {
      if (rowIndex < 2 || rowIndex > MAZE_LAYOUT.length - 3) return
      for (let column = 2; column < row.length - 2; column++) {
        if (row[column] !== '#') continue
        wallCells.push(Vector3.create(
          GRID_OFFSET + column * CELL_SIZE,
          2.15,
          GRID_OFFSET + (MAZE_LAYOUT.length - 1 - rowIndex) * CELL_SIZE
        ))
      }
    })

    Array.from({ length: LANTERN_COUNT }, (_, index) => {
      const position = wallCells[Math.floor((index * wallCells.length) / LANTERN_COUNT)]
      const cyan = index % 3 === 0
      const color = cyan ? Color4.create(0.38, 0.94, 1, 1) : Color4.create(0.76, 0.25, 1, 1)

      const fixture = engine.addEntity()
      Transform.create(fixture, {
        position: Vector3.create(position.x, 2.15, position.z),
        scale: Vector3.create(0.82, 1.2, 0.24)
      })
      MeshRenderer.setBox(fixture)
      Material.setPbrMaterial(fixture, {
        albedoColor: Color4.create(0.08, 0.09, 0.13, 1),
        metallic: 0.8,
        roughness: 0.3
      })

      createTechStrip(
        Vector3.create(position.x - 0.27, 2.15, position.z - 0.22),
        Vector3.create(0.075, 0.82, 0.075),
        Color4.create(0.14, 0.78, 1, 1),
        22
      )
      createTechStrip(
        Vector3.create(position.x + 0.27, 2.15, position.z - 0.22),
        Vector3.create(0.075, 0.82, 0.075),
        Color4.create(0.72, 0.2, 1, 1),
        22
      )

      const crystal = engine.addEntity()
      Transform.create(crystal, {
        position: Vector3.create(position.x, 2.15, position.z - 0.33),
        scale: Vector3.create(0.38, 0.78, 0.38)
      })
      MeshRenderer.setCylinder(crystal)
      Material.setPbrMaterial(crystal, {
        albedoColor: color,
        emissiveColor: color,
        emissiveIntensity: 34,
        metallic: 0.42,
        roughness: 0.15
      })
      LightSource.create(crystal, {
        active: true,
        color: cyan ? { r: 0.25, g: 0.9, b: 1 } : { r: 0.72, g: 0.18, b: 1 },
        intensity: 9000,
        range: 18,
        shadow: false,
        type: LightSource.Type.Point({})
      })
    })
  }

  private createVaultPlaceholder(): void {
    const levels = [7.6, 6.5, 5.4, 4.3, 3.25, 2.25]
    levels.forEach((size, index) => {
      const y = 0.22 + index * 0.42
      createBox(Vector3.create(MAZE_CENTER, y, MAZE_CENTER), Vector3.create(size, 0.42, size), Color4.create(0.11 + index * 0.018, 0.045, 0.22 + index * 0.035, 1))
      createTechStrip(Vector3.create(MAZE_CENTER, y + 0.215, MAZE_CENTER), Vector3.create(size + 0.08, 0.045, size + 0.08), index % 2 === 0 ? Color4.create(0.12, 0.78, 1, 1) : Color4.create(0.72, 0.18, 1, 1), 20)
    })

    const beacon = engine.addEntity()
    Transform.create(beacon, {
      position: Vector3.create(MAZE_CENTER, 3.65, MAZE_CENTER),
      scale: Vector3.create(1.65, 1.65, 1.65)
    })
    MeshRenderer.setSphere(beacon)
    Material.setPbrMaterial(beacon, {
      albedoColor: Color4.create(0.58, 0.24, 1, 1),
      emissiveColor: Color4.create(0.5, 0.12, 1, 1),
      emissiveIntensity: 10,
      metallic: 0.3,
      roughness: 0.18
    })

    const ring = engine.addEntity()
    Transform.create(ring, { position: Vector3.create(MAZE_CENTER, 2.78, MAZE_CENTER), scale: Vector3.create(2.25, 0.06, 2.25) })
    MeshRenderer.setCylinder(ring)
    Material.setPbrMaterial(ring, { albedoColor: Color4.create(0.16, 0.82, 1, 1), emissiveColor: Color4.create(0.12, 0.75, 1, 1), emissiveIntensity: 18, metallic: 0.7, roughness: 0.12 })

    let vaultTime = 0
    engine.addSystem((dt) => {
      vaultTime += dt
      const beaconTransform = Transform.getMutableOrNull(beacon)
      const ringTransform = Transform.getMutableOrNull(ring)
      if (beaconTransform) {
        const size = 1.65 + Math.sin(vaultTime * 2.6) * 0.18
        beaconTransform.scale = Vector3.create(size, size, size)
        beaconTransform.rotation = Quaternion.fromEulerDegrees(0, vaultTime * 42, 0)
      }
      if (ringTransform) {
        const ringSize = 2.25 + Math.sin(vaultTime * 1.8) * 0.22
        ringTransform.scale = Vector3.create(ringSize, 0.06, ringSize)
      }
    })
  }

  private createEntranceMarker(): void {
    const marker = engine.addEntity()
    Transform.create(marker, {
      position: Vector3.create(MAZE_CENTER, 3.35, 1.15),
      rotation: Quaternion.fromEulerDegrees(0, 0, 0)
    })
    TextShape.create(marker, {
      text: 'MAZE VAULT',
      fontSize: 4,
      textColor: Color4.create(0.72, 0.44, 1, 1),
      outlineColor: Color4.Black(),
      outlineWidth: 0.14
    })
  }
}
