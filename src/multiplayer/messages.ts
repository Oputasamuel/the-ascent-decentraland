import type { GamePhase } from '../game/GameState'
type RoundMessage = { roundId: string; sentAt: number }
export type NetworkScore = { playerId: string; displayName: string; securedTotal: number }
export type NetworkSign = { signId: string; playerId: string; symbol: string; position: { x: number; y: number; z: number }; normal: { x: number; y: number; z: number } }
export type PlayerHelloMessage = RoundMessage & { type: 'PLAYER_HELLO'; playerId: string }
export type StateRequestedMessage = RoundMessage & { type: 'STATE_REQUESTED'; playerId: string }
export type StateSnapshotMessage = RoundMessage & { type: 'STATE_SNAPSHOT'; targetPlayerId: string; phase: GamePhase; startsAt: number; endsAt: number; claimedOrbIds: string[]; scores: NetworkScore[]; signs: NetworkSign[] }
export type SignPlacedMessage = RoundMessage & { type: 'SIGN_PLACED'; sign: NetworkSign }
export type PhaseChangedMessage = RoundMessage & { type: 'PHASE_CHANGED'; phase: GamePhase; startsAt: number; endsAt: number }
export type OrbClaimRequestedMessage = RoundMessage & { type: 'ORB_CLAIM_REQUESTED'; orbId: string; playerId: string }
export type OrbClaimResolvedMessage = RoundMessage & { type: 'ORB_CLAIM_RESOLVED'; orbId: string; playerId: string; accepted: boolean }
export type DepositRecordedMessage = RoundMessage & { type: 'DEPOSIT_RECORDED'; playerId: string; displayName: string; amount: number; securedTotal: number; depositedAt: number }
export type GameNetworkMessage = PlayerHelloMessage | StateRequestedMessage | StateSnapshotMessage | PhaseChangedMessage | OrbClaimRequestedMessage | OrbClaimResolvedMessage | DepositRecordedMessage | SignPlacedMessage
