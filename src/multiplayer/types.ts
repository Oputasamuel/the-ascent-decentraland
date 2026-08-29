import type { GameNetworkMessage } from './messages'

export type NetworkMessageHandler = (message: GameNetworkMessage) => void

export interface GameNetwork {
  readonly localPlayerId: string
  readonly isCoordinator: boolean
  setRoom(roomId: string): void
  connect(): Promise<void>
  disconnect(): void
  send(message: GameNetworkMessage): void
  subscribe(handler: NetworkMessageHandler): () => void
}
