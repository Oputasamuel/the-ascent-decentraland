import { engine } from '@dcl/sdk/ecs'
import { GamePhase, type RoundState } from './GameState'
import { ROUND_CONFIG } from './constants'

export type RoundStateListener = (state: Readonly<RoundState>, previousPhase?: GamePhase) => void

export class RoundManager {
  private roundNumber = 0
  private lastReportedSecond = -1
  private readonly listeners = new Set<RoundStateListener>()
  private authoritative = true
  private state: RoundState = {
    roundId: 'waiting',
    phase: GamePhase.WAITING,
    startsAt: 0,
    endsAt: 0,
    availableOrbIds: new Set<string>(),
    players: new Map()
  }

  get snapshot(): Readonly<RoundState> {
    return this.state
  }

  get secondsRemaining(): number {
    return Math.max(0, Math.ceil((this.state.endsAt - Date.now()) / 1000))
  }

  initialize(authoritative = true): void {
    this.authoritative = authoritative
    if (authoritative) this.startNewRound()
    engine.addSystem(() => this.update())
  }
  restart(authoritative = true): void {
    this.authoritative = authoritative
    this.lastReportedSecond = -1
    this.state.availableOrbIds.clear()
    this.state.players.clear()
    if (authoritative) this.startNewRound()
    else {
      const previousPhase = this.state.phase
      Object.assign(this.state, { roundId: 'waiting', phase: GamePhase.WAITING, startsAt: 0, endsAt: 0 })
      this.notify(previousPhase)
    }
  }
  setAuthoritative(value: boolean): void { this.authoritative = value }
  completeObjective(): void {
    if (!this.authoritative || this.state.phase !== GamePhase.PLAYING) return
    this.transitionTo(GamePhase.RESULTS, ROUND_CONFIG.resultsSeconds)
  }
  applyRemoteState(roundId: string, phase: GamePhase, startsAt: number, endsAt: number): void {
    if (this.authoritative) return
    const previousPhase = this.state.phase
    Object.assign(this.state, { roundId, phase, startsAt, endsAt })
    this.lastReportedSecond = -1
    this.notify(previousPhase)
  }

  subscribe(listener: RoundStateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private update(): void {
    const remaining = this.secondsRemaining
    if (remaining !== this.lastReportedSecond) {
      this.lastReportedSecond = remaining
      this.notify()
    }
    if (!this.authoritative || Date.now() < this.state.endsAt) return

    switch (this.state.phase) {
      case GamePhase.COUNTDOWN:
        this.transitionTo(GamePhase.PLAYING, ROUND_CONFIG.durationSeconds)
        break
      case GamePhase.PLAYING:
        this.transitionTo(GamePhase.RESULTS, ROUND_CONFIG.resultsSeconds)
        break
      case GamePhase.RESULTS:
        this.transitionTo(GamePhase.RESETTING, ROUND_CONFIG.resettingSeconds)
        break
      case GamePhase.RESETTING:
        this.startNewRound()
        break
    }
  }

  private startNewRound(): void {
    this.roundNumber++
    this.state.roundId = `local-round-${this.roundNumber}`
    this.transitionTo(GamePhase.COUNTDOWN, ROUND_CONFIG.countdownSeconds)
  }

  private transitionTo(phase: GamePhase, durationSeconds: number): void {
    const previousPhase = this.state.phase
    const now = Date.now()
    this.state.phase = phase
    this.state.startsAt = now
    this.state.endsAt = now + durationSeconds * 1000
    this.lastReportedSecond = -1
    this.notify(previousPhase)
  }

  private notify(previousPhase?: GamePhase): void {
    this.listeners.forEach((listener) => listener(this.state, previousPhase))
  }
}
