import type { PlayerRoundState } from '../players/PlayerRoundState'

export enum GamePhase {
  WAITING = 'WAITING',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  RESULTS = 'RESULTS',
  RESETTING = 'RESETTING'
}

export type RoundState = {
  roundId: string
  phase: GamePhase
  startsAt: number
  endsAt: number
  availableOrbIds: Set<string>
  players: Map<string, PlayerRoundState>
}
