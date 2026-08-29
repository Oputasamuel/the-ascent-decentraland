import type { GameNetwork, NetworkMessageHandler } from './types'
import type { GameNetworkMessage } from './messages'
import { MessageBus } from '@dcl/sdk/message-bus'
import { getPlayer, onLeaveScene } from '@dcl/sdk/players'

export class NetworkManager implements GameNetwork {
  private readonly bus = new MessageBus()
  private readonly handlers = new Set<NetworkMessageHandler>()
  private readonly activePlayerIds = new Set<string>()
  private readonly listenedChannels = new Set<string>()
  private connected = false
  private channel = 'maze-vault-v1-public'
  private playerId = `guest-${Math.random().toString(36).slice(2)}`
  get localPlayerId(): string { return this.playerId }
  get isCoordinator(): boolean { return [...this.activePlayerIds].sort()[0] === this.playerId }
  setRoom(roomId: string): void {
    const safeRoom = roomId.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'public'
    const nextChannel = `maze-vault-v1-${safeRoom}`
    if (nextChannel === this.channel && (!this.connected || this.listenedChannels.has(nextChannel))) return
    this.channel = nextChannel
    if (this.connected) {
      this.activePlayerIds.clear()
      this.activePlayerIds.add(this.playerId)
      this.listen(this.channel)
      this.announcePresence()
    }
  }
  async connect(): Promise<void> {
    if (this.connected) return
    this.connected = true
    const player = getPlayer()
    if (player) this.playerId = player.userId
    this.activePlayerIds.add(this.playerId)
    this.listen(this.channel)
    onLeaveScene((userId) => {
      this.activePlayerIds.delete(userId)
      // Re-announce after membership changes so every remaining client
      // recalculates the same coordinator and can request a fresh snapshot.
      this.announcePresence()
    })
    this.announcePresence()
  }
  private listen(channel: string): void {
    if (this.listenedChannels.has(channel)) return
    this.listenedChannels.add(channel)
    this.bus.on(channel, (payload: unknown) => {
      // MessageBus listeners cannot be removed, so inactive room listeners
      // remain dormant and never leak old-room state into the current room.
      if (channel !== this.channel) return
      if (!this.isMessage(payload)) return
      if (payload.type === 'PLAYER_HELLO') {
        const isNew = !this.activePlayerIds.has(payload.playerId)
        this.activePlayerIds.add(payload.playerId)
        if (isNew && payload.playerId !== this.playerId) this.announcePresence()
      }
      this.handlers.forEach((handler) => handler(payload))
    })
  }
  disconnect(): void { this.connected = false; this.handlers.clear() }
  send(message: GameNetworkMessage): void { if (this.connected) this.bus.emit(this.channel, message) }
  subscribe(handler: NetworkMessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
  private announcePresence(): void { this.send({ type: 'PLAYER_HELLO', playerId: this.playerId, roundId: 'presence', sentAt: Date.now() }) }
  private isMessage(value: unknown): value is GameNetworkMessage {
    if (!value || typeof value !== 'object') return false
    const item = value as { type?: unknown; roundId?: unknown; sentAt?: unknown }
    return typeof item.type === 'string' && typeof item.roundId === 'string' && typeof item.sentAt === 'number'
  }
}
