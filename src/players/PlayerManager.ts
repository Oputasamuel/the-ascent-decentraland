import type { PlayerRoundState } from './PlayerRoundState'

export type PlayerStateListener = (state: Readonly<PlayerRoundState>) => void

export class PlayerManager {
  private readonly state: PlayerRoundState = {
    playerId: 'local-player',
    displayName: 'Player',
    carriedOrbs: 0,
    securedOrbs: 0,
    lastDepositAt: 0
  }

  private readonly listeners = new Set<PlayerStateListener>()

  get snapshot(): Readonly<PlayerRoundState> {
    return this.state
  }
  setIdentity(playerId: string, displayName: string): void {
    this.state.playerId = playerId; this.state.displayName = displayName; this.notify()
  }

  collectOrb(amount = 1): void {
    this.state.carriedOrbs += amount
    this.notify()
  }

  depositCarried(depositedAt: number): number {
    const amount = this.state.carriedOrbs
    if (amount <= 0) return 0
    this.state.securedOrbs += amount
    this.state.carriedOrbs = 0
    this.state.lastDepositAt = depositedAt
    this.notify()
    return amount
  }

  discardCarried(): number {
    const discarded = this.state.carriedOrbs
    this.state.carriedOrbs = 0
    this.notify()
    return discarded
  }

  resetRound(): void {
    this.state.carriedOrbs = 0
    this.state.securedOrbs = 0
    this.state.lastDepositAt = 0
    this.notify()
  }

  subscribe(listener: PlayerStateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }
}
