import ReactEcs, { Input, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { GamePhase } from './game/GameState'
import { MAZE_LAYOUT, MAZE_WORLD_SIZE } from './maze/MazeManager'

type MapWallRun = { row: number; start: number; length: number }
export type LeaderboardEntry = { playerId: string; displayName: string; securedTotal: number }

const MAP_WALLS: MapWallRun[] = []
MAZE_LAYOUT.forEach((row, rowIndex) => {
  let runStart = -1
  for (let column = 0; column <= row.length; column++) {
    const wall = column < row.length && row[column] === '#'
    if (wall && runStart < 0) runStart = column
    if (!wall && runStart >= 0) {
      MAP_WALLS.push({ row: rowIndex, start: runStart, length: column - runStart })
      runStart = -1
    }
  }
})

const hudState = {
  carriedOrbs: 0,
  securedOrbs: 0,
  vaultMessage: '',
  trapMessage: '',
  phase: GamePhase.WAITING,
  secondsRemaining: 0,
  resultsMessage: '',
  mapExpanded: false,
  mapX: 0.5,
  mapY: 0.5
  , leaderboard: [] as LeaderboardEntry[], leaderboardExpanded: false, teamSecured: 0, teamTarget: 120,
  signToolOpen: false, signText: '', signStatus: ''
  , compassHeading: 0
  , lobbyPrompt: true
}
let signPlacementHandler: ((symbol: string) => void) | undefined
export const setSignPlacementHandler = (handler: (symbol: string) => void): void => { signPlacementHandler = handler }
export const enterLobbyUi = (): void => {
  hudState.lobbyPrompt = true
  hudState.resultsMessage = ''
  hudState.mapExpanded = false
  hudState.leaderboardExpanded = false
  hudState.signToolOpen = false
}
export const closeLobby = (): void => { hudState.lobbyPrompt = false }
export const setSignStatus = (status: string): void => { hudState.signStatus = status }
export const setTeamObjective = (secured: number, target: number): void => { hudState.teamSecured = secured; hudState.teamTarget = target }
const placeSign = (symbol: string): void => { if (signPlacementHandler) signPlacementHandler(symbol) }
export const setLeaderboard = (entries: LeaderboardEntry[]): void => {
  hudState.leaderboard = [...entries].sort((a, b) => b.securedTotal - a.securedTotal || a.displayName.localeCompare(b.displayName)).slice(0, 5)
}

export const setHudScores = (carriedOrbs: number, securedOrbs: number): void => {
  hudState.carriedOrbs = carriedOrbs
  hudState.securedOrbs = securedOrbs
}

export const setVaultMessage = (message: string): void => {
  hudState.vaultMessage = message
}
export const setTrapMessage = (message: string): void => { hudState.trapMessage = message }

export const setRoundHud = (phase: GamePhase, secondsRemaining: number): void => {
  hudState.phase = phase
  hudState.secondsRemaining = secondsRemaining
}

export const setResultsMessage = (message: string): void => {
  hudState.resultsMessage = message
}

export const setMapPlayerPosition = (x: number, z: number): void => {
  hudState.mapX = Math.max(0, Math.min(1, x / MAZE_WORLD_SIZE))
  hudState.mapY = Math.max(0, Math.min(1, 1 - z / MAZE_WORLD_SIZE))
}
export const setCompassHeading = (heading: number): void => { hudState.compassHeading = (heading + 360) % 360 }

export function setupUi(): void {
  ReactEcsRenderer.setUiRenderer(uiMenu, { virtualWidth: 1920, virtualHeight: 1080 })
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const phaseLabel = (): string => {
  if (hudState.phase === GamePhase.COUNTDOWN) return `START // ${hudState.secondsRemaining}`
  if (hudState.phase === GamePhase.PLAYING) return formatTime(hudState.secondsRemaining)
  if (hudState.phase === GamePhase.RESULTS) return 'TIME // 00:00'
  if (hudState.phase === GamePhase.RESETTING) return 'SYSTEM // RESET'
  return 'SYSTEM // WAIT'
}

const NeonPanel = (props: { children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[] }) => (
  <UiEntity
    uiTransform={{
      width: '100%',
      height: '100%',
      padding: 7,
      alignItems: 'center',
      justifyContent: 'center'
    }}
    uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/panel-blue.png' }, textureMode: 'stretch' }}
  >
    <UiEntity uiTransform={{ width: '100%', height: '100%', borderRadius: 5, alignItems: 'center', justifyContent: 'center' }} uiBackground={{ color: Color4.create(0.008, 0.02, 0.055, 0.94) }}>
      {props.children}
    </UiEntity>
  </UiEntity>
)

const MiniMap = () => {
  const mapSize = hudState.mapExpanded ? 520 : 190
  const gridSize = mapSize - 48
  const cell = gridSize / MAZE_LAYOUT.length
  const markerSize = hudState.mapExpanded ? 16 : 10

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: hudState.mapExpanded ? { top: 42, right: 24 } : { top: 24, right: 24 },
        width: mapSize,
        height: mapSize,
        padding: 8,
        borderWidth: 2,
        borderRadius: 10,
        borderColor: Color4.create(0.72, 0.25, 1, 0.95),
        zIndex: hudState.mapExpanded ? 20 : 5
      }}
      uiBackground={{ color: Color4.create(0.012, 0.022, 0.055, 0.95) }}
      onMouseDown={() => { hudState.mapExpanded = !hudState.mapExpanded; hudState.leaderboardExpanded = false; hudState.signToolOpen = false }}
    >
      <Label
        value={hudState.mapExpanded ? 'TACTICAL MAP // TAP TO COLLAPSE' : 'MAP // TAP TO EXPAND'}
        fontSize={hudState.mapExpanded ? 22 : 13}
        color={Color4.create(0.75, 0.42, 1, 1)}
        uiTransform={{ positionType: 'absolute', position: { top: 4, left: 8 }, width: gridSize, height: 30 }}
      />
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: 38, left: 16 },
          width: gridSize,
          height: gridSize,
          overflow: 'hidden'
        }}
        uiBackground={{ color: Color4.create(0.025, 0.065, 0.095, 1) }}
      >
        {MAP_WALLS.map((wall) => (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: wall.row * cell, left: wall.start * cell },
              width: Math.max(1, wall.length * cell),
              height: Math.max(1, cell),
              pointerFilter: 'none'
            }}
            uiBackground={{ color: Color4.create(0.08, 0.58, 0.72, 0.92) }}
          />
        ))}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: gridSize * 0.5 - 5, left: gridSize * 0.5 - 5 },
            width: 10,
            height: 10,
            borderRadius: 5,
            pointerFilter: 'none'
          }}
          uiBackground={{ color: Color4.create(0.72, 0.25, 1, 1) }}
        />
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              top: hudState.mapY * gridSize - markerSize / 2,
              left: hudState.mapX * gridSize - markerSize / 2
            },
            width: markerSize,
            height: markerSize,
            borderRadius: markerSize / 2,
            borderWidth: 2,
            borderColor: Color4.White(),
            pointerFilter: 'none'
          }}
          uiBackground={{ color: Color4.create(1, 0.18, 0.48, 1) }}
        />
      </UiEntity>
    </UiEntity>
  )
}

const SignTool = () => hudState.signToolOpen ? (
  <UiEntity uiTransform={{ positionType: 'absolute', position: { top: '20%', left: '22%' }, width: '56%', height: 390, padding: 10, flexDirection: 'column', borderWidth: 2, borderRadius: 10, borderColor: Color4.create(0.18, 0.88, 1, 0.82), zIndex: 50 }} uiBackground={{ color: Color4.create(0.015, 0.035, 0.09, 0.34) }}>
    <UiEntity uiTransform={{ width: '100%', height: '100%', padding: 18, flexDirection: 'column' }} uiBackground={{ color: Color4.create(0.006, 0.018, 0.05, 0.48) }}>
      <UiEntity uiTransform={{ width: '100%', height: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <UiEntity uiTransform={{ width: 360, height: 50 }} uiBackground={{ texture: { src: 'assets/ui/branding/signal-terminal.png' }, textureMode: 'stretch' }} />
        <UiEntity uiTransform={{ width: 110, height: 44, alignItems: 'center', justifyContent: 'center' }} uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/button-alert.png' }, textureMode: 'stretch' }} onMouseDown={() => { hudState.signToolOpen = false }}><Label value="CLOSE" fontSize={15} color={Color4.White()} /></UiEntity>
      </UiEntity>
      <UiEntity uiTransform={{ width: '100%', flexGrow: 1, flexDirection: 'column' }}>
        <UiEntity uiTransform={{ width: '100%', height: 52, flexDirection: 'row', justifyContent: 'space-evenly' }}>
          {['LEFT', 'RIGHT', 'VAULT', 'DANGER'].map((symbol) => <UiEntity uiTransform={{ width: '23%', height: 44, alignItems: 'center', justifyContent: 'center' }} uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/button-blue.png' }, textureMode: 'stretch' }} onMouseDown={() => placeSign(symbol)}><Label value={symbol} fontSize={14} color={Color4.create(0.03, 0.13, 0.22, 1)} /></UiEntity>)}
        </UiEntity>
        <Input placeholder="Type arrow, word, or emoji" value={hudState.signText} fontSize={17} color={Color4.White()} placeholderColor={Color4.create(0.5, 0.6, 0.72, 1)} disabled={false} onChange={(value) => { hudState.signText = value.slice(0, 8) }} onSubmit={(value) => { placeSign(value); hudState.signText = '' }} uiTransform={{ width: '100%', height: 54, padding: 8, borderWidth: 1, borderColor: Color4.create(0.45, 0.28, 0.8, 1) }} uiBackground={{ color: Color4.create(0.025, 0.05, 0.11, 1) }} />
        <UiEntity uiTransform={{ width: '100%', height: 48, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label value={hudState.signStatus || 'LOOK AT WALL, THEN PLACE'} fontSize={13} color={Color4.create(0.66, 0.72, 0.9, 1)} />
          <UiEntity uiTransform={{ width: 110, height: 42, alignItems: 'center', justifyContent: 'center' }} uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/button-blue.png' }, textureMode: 'stretch' }} onMouseDown={() => { placeSign(hudState.signText); hudState.signText = '' }}><Label value="PLACE" fontSize={15} color={Color4.create(0.03, 0.13, 0.22, 1)} /></UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  </UiEntity>
 ) : (!hudState.mapExpanded && !hudState.leaderboardExpanded ? (
  <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 282, right: 24 }, width: 190, height: 46, alignItems: 'center', justifyContent: 'center', zIndex: 8 }} uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/button-blue.png' }, textureMode: 'stretch' }} onMouseDown={() => { hudState.signToolOpen = true; hudState.mapExpanded = false; hudState.leaderboardExpanded = false }}>
    <Label value="SIGNALS" fontSize={15} color={Color4.create(0.03, 0.13, 0.22, 1)} />
  </UiEntity>
 ) : null)

const compassLabel = (bearing: number): string => {
  const normalized = (bearing + 360) % 360
  const cardinals: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }
  return cardinals[normalized] ?? String(normalized)
}

const CompassBar = () => {
  const heading = hudState.compassHeading
  const centerTick = Math.round(heading / 15) * 15
  const ticks = Array.from({ length: 13 }, (_, index) => centerTick + (index - 6) * 15)
  return (
    <UiEntity uiTransform={{ positionType: 'absolute', position: { bottom: 20, left: '31%' }, width: '38%', height: 62, zIndex: 18, overflow: 'hidden' }}>
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 2, left: 10 }, width: '97%', height: 44, overflow: 'hidden' }} uiBackground={{ color: Color4.create(0.004, 0.014, 0.035, 0.55) }}>
        {ticks.map((rawBearing) => {
          const normalized = (rawBearing + 360) % 360
          let delta = normalized - heading
          if (delta > 180) delta -= 360
          if (delta < -180) delta += 360
          const major = normalized % 45 === 0
          return <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 2, left: `${50 + delta / 1.8}%` }, width: major ? 54 : 42, height: 48, alignItems: 'center', flexDirection: 'column', pointerFilter: 'none' }}>
            <Label value={compassLabel(normalized)} font="monospace" fontSize={major ? 20 : 12} color={major ? Color4.create(0.35, 0.96, 1, 1) : Color4.create(0.62, 0.72, 0.82, 1)} uiTransform={{ height: 27 }} />
            <UiEntity uiTransform={{ width: major ? 3 : 2, height: major ? 17 : 10 }} uiBackground={{ color: major ? Color4.create(0.75, 0.32, 1, 1) : Color4.create(0.38, 0.72, 0.82, 0.85) }} />
          </UiEntity>
        })}
      </UiEntity>
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: '49.4%' }, width: 10, height: 17, pointerFilter: 'none' }} uiBackground={{ color: Color4.create(1, 0.24, 0.52, 1) }} />
      <UiEntity uiTransform={{ positionType: 'absolute', position: { bottom: 1, left: '44%' }, width: '12%', height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Color4.create(0.72, 0.25, 1, 1), pointerFilter: 'none' }} uiBackground={{ color: Color4.create(0.01, 0.02, 0.06, 0.94) }}>
        <Label value={String(Math.round(heading)).padStart(3, '0')} font="monospace" fontSize={14} color={Color4.White()} />
      </UiEntity>
    </UiEntity>
  )
}

export const uiMenu = () => (
  <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute', position: { top: 0, left: 0 } }}>
    {hudState.lobbyPrompt && <UiEntity uiTransform={{ positionType: 'absolute', position: { bottom: 64, left: '27%' }, width: '46%', height: 82, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 10, borderColor: Color4.create(0.18, 0.88, 1, 0.9), zIndex: 90 }} uiBackground={{ color: Color4.create(0.005, 0.02, 0.06, 0.72) }}><Label value="PUBLIC DEPLOYMENT BAY // PRESS E" font="monospace" fontSize={20} color={Color4.create(0.35, 0.95, 1, 1)} /></UiEntity>}
    {!hudState.lobbyPrompt && <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%' }}>
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 12, left: 0 },
        width: '100%',
        height: 66,
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none'
      }}
    >
      <Label value={phaseLabel()} fontSize={38} color={Color4.create(0.35, 0.94, 1, 1)} />
    </UiEntity>

    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 78, left: '31%' },
        width: '38%',
        height: 76
      }}
    >
      <NeonPanel>
        <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
          <Label value={`CARRY ${hudState.carriedOrbs}`} fontSize={20} color={Color4.create(0.2, 0.92, 1, 1)} />
          <Label value={`SECURE ${hudState.securedOrbs}`} fontSize={20} color={Color4.create(0.78, 0.42, 1, 1)} />
          <Label value={`TEAM ${hudState.teamSecured}/${hudState.teamTarget}`} fontSize={20} color={hudState.teamSecured >= hudState.teamTarget ? Color4.create(0.3, 1, 0.55, 1) : Color4.create(0.32, 0.9, 1, 1)} />
        </UiEntity>
      </NeonPanel>
    </UiEntity>

    <MiniMap />
    <SignTool />
    <CompassBar />

    {!hudState.mapExpanded && !hudState.signToolOpen && <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 228, right: 24 }, width: 190, height: 46, alignItems: 'center', justifyContent: 'center', zIndex: 8 }} uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/button-blue.png' }, textureMode: 'stretch' }} onMouseDown={() => { hudState.leaderboardExpanded = !hudState.leaderboardExpanded; hudState.signToolOpen = false }}><Label value={hudState.leaderboardExpanded ? 'RANKINGS // CLOSE' : 'RANKINGS'} fontSize={14} color={Color4.create(0.03, 0.13, 0.22, 1)} /></UiEntity>}
    {hudState.leaderboardExpanded && !hudState.mapExpanded && !hudState.signToolOpen && (
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 282, right: 24 }, width: 280, height: 220, padding: 16, flexDirection: 'column', zIndex: 12 }} uiBackground={{ texture: { src: 'assets/ui/kenney-scifi/panel-blue.png' }, textureMode: 'stretch' }}>
        <Label value="LIVE // SECURED" fontSize={19} color={Color4.create(0.35, 0.94, 1, 1)} uiTransform={{ height: 32 }} />
        {hudState.leaderboard.length === 0 && <Label value="AWAITING DEPOSITS" fontSize={14} color={Color4.create(0.55, 0.62, 0.75, 1)} />}
        {hudState.leaderboard.map((entry, index) => (
          <UiEntity uiTransform={{ width: '100%', height: 32, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Label value={`${index + 1}. ${entry.displayName.slice(0, 16)}`} fontSize={15} color={index === 0 ? Color4.create(0.86, 0.65, 1, 1) : Color4.White()} />
            <Label value={`${entry.securedTotal}`} fontSize={16} color={Color4.create(0.2, 0.92, 1, 1)} />
          </UiEntity>
        ))}
      </UiEntity>
    )}

    {hudState.vaultMessage !== '' && (
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { bottom: 150, left: '32%' }, width: '36%', height: 86 }}
      >
        <NeonPanel>
          <Label value={hudState.vaultMessage} fontSize={31} color={Color4.create(0.86, 0.65, 1, 1)} />
        </NeonPanel>
      </UiEntity>
    )}
    {hudState.trapMessage !== '' && (
      <UiEntity uiTransform={{ positionType: 'absolute', position: { bottom: 248, left: '34%' }, width: '32%', height: 66, borderWidth: 2, borderRadius: 8, borderColor: Color4.create(1, 0.1, 0.38, 1), alignItems: 'center', justifyContent: 'center' }} uiBackground={{ color: Color4.create(0.12, 0.01, 0.05, 0.94) }}>
        <Label value={hudState.trapMessage} fontSize={24} color={Color4.create(1, 0.3, 0.55, 1)} />
      </UiEntity>
    )}

    {hudState.resultsMessage !== '' && (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '28%', left: '27%' },
          width: '46%',
          height: '38%',
          padding: 32,
          borderWidth: 3,
          borderRadius: 14,
          borderColor: Color4.create(0.72, 0.25, 1, 1),
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30
        }}
        uiBackground={{ color: Color4.create(0.015, 0.025, 0.07, 0.98) }}
      >
        <Label value={hudState.resultsMessage} fontSize={40} textAlign="middle-center" color={Color4.create(0.82, 0.7, 1, 1)} />
      </UiEntity>
    )}
    </UiEntity>}
  </UiEntity>
)
