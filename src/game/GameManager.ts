import { GamePhase, type RoundState } from './GameState'
import { RoundManager } from './RoundManager'
import { MazeManager } from '../maze/MazeManager'
import { OrbManager, ORB_COUNT } from '../orbs/OrbManager'
import { PlayerManager } from '../players/PlayerManager'
import { VaultManager } from '../vault/VaultManager'
import { closeLobby, enterLobbyUi, setCompassHeading, setHudScores, setLeaderboard, setResultsMessage, setRoundHud, setSignPlacementHandler, setTeamObjective, setupUi, type LeaderboardEntry } from '../ui'
import { setMapPlayerPosition } from '../ui'
import { engine, Transform } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { NetworkManager } from '../multiplayer/NetworkManager'
import type { GameNetworkMessage } from '../multiplayer/messages'
import { TrapManager } from '../traps/TrapManager'
import { AudioManager } from '../audio/AudioManager'
import { SignManager } from '../signs/SignManager'
import { LobbyManager } from '../lobby/LobbyManager'
import { TeleportFxManager } from '../effects/TeleportFxManager'
import { EnvironmentFxManager } from '../effects/EnvironmentFxManager'

export class GameManager {
  private readonly playerManager = new PlayerManager()
  private readonly networkManager = new NetworkManager()
  private readonly scores = new Map<string, LeaderboardEntry>()
  private readonly audioManager = new AudioManager()
  private readonly teleportFx = new TeleportFxManager(this.audioManager)
  private readonly environmentFx = new EnvironmentFxManager()
  private readonly signManager = new SignManager((sign) => this.networkManager.send({ type: 'SIGN_PLACED', sign, roundId: this.roundManager.snapshot.roundId, sentAt: Date.now() }))
  private readonly orbManager = new OrbManager(this.playerManager, (orbId) => this.requestOrbClaim(orbId), () => this.audioManager.play('orb'))
  private readonly vaultManager = new VaultManager(this.playerManager, (amount, total, depositedAt) => this.recordDeposit(amount, total, depositedAt))
  private readonly roundManager = new RoundManager()
  private spawnedOrbRoundKey = 'waiting'
  private spawnedTrapRoundId = 'waiting'
  private readonly lobbyManager = new LobbyManager(
    () => { void this.startSession() },
    () => enterLobbyUi(),
    this.teleportFx
  )
  private readonly trapManager = new TrapManager(
    () => this.audioManager.play('trap'),
    () => this.lobbyManager.respawnFromDeath()
  )
  private sessionStarted = false

  initialize(): void {
    setupUi()
    this.lobbyManager.build()
    this.environmentFx.build()
    this.lobbyManager.enterLobby()
    this.audioManager.initialize()
    setSignPlacementHandler((symbol) => {
      if (this.roundManager.snapshot.phase === GamePhase.PLAYING) this.signManager.requestPlacement(symbol, this.networkManager.localPlayerId)
    })
    setTeamObjective(0, ORB_COUNT)
    this.playerManager.subscribe((state) => setHudScores(state.carriedOrbs, state.securedOrbs))
    new MazeManager().build()
    this.orbManager.spawn()
    this.vaultManager.initialize()
    this.trapManager.build()
    this.roundManager.subscribe((state, previousPhase) => this.handleRoundState(state, previousPhase))
    this.networkManager.subscribe((message) => this.handleNetworkMessage(message))
    engine.addSystem(() => {
      const playerTransform = Transform.getOrNull(engine.PlayerEntity)
      if (playerTransform) setMapPlayerPosition(playerTransform.position.x, playerTransform.position.z)
      const cameraTransform = Transform.getOrNull(engine.CameraEntity)
      if (cameraTransform) {
        const rotation = cameraTransform.rotation
        const forwardX = 2 * (rotation.x * rotation.z + rotation.w * rotation.y)
        const forwardZ = 1 - 2 * (rotation.x * rotation.x + rotation.y * rotation.y)
        setCompassHeading((Math.atan2(forwardX, forwardZ) * 180 / Math.PI + 360) % 360)
      }
    })
  }
  private async startSession(): Promise<void> {
    const firstSession = !this.sessionStarted
    this.networkManager.setRoom('public')
    if (firstSession) {
      this.sessionStarted = true
      await this.startMultiplayer()
    } else {
      this.signManager.reset()
      this.scores.clear()
      this.playerManager.resetRound()
      this.refreshLeaderboard()
      setResultsMessage('')
      this.roundManager.restart(this.networkManager.isCoordinator)
      if (!this.networkManager.isCoordinator) this.networkManager.send({ type: 'STATE_REQUESTED', playerId: this.networkManager.localPlayerId, roundId: 'unknown', sentAt: Date.now() })
    }
    closeLobby()
    this.lobbyManager.enterGame()
  }
  private async startMultiplayer(): Promise<void> {
    await this.networkManager.connect()
    const player = getPlayer()
    this.playerManager.setIdentity(this.networkManager.localPlayerId, player?.name ?? 'Player')
    this.roundManager.initialize(this.networkManager.isCoordinator)
    if (!this.networkManager.isCoordinator) this.networkManager.send({ type: 'STATE_REQUESTED', playerId: this.networkManager.localPlayerId, roundId: 'unknown', sentAt: Date.now() })
  }
  private requestOrbClaim(orbId: string): void {
    const state = this.roundManager.snapshot
    if (state.phase !== GamePhase.PLAYING) return
    this.networkManager.send({ type: 'ORB_CLAIM_REQUESTED', orbId, playerId: this.networkManager.localPlayerId, roundId: state.roundId, sentAt: Date.now() })
  }
  private recordDeposit(amount: number, securedTotal: number, depositedAt: number): void {
    this.audioManager.play('deposit')
    const player = this.playerManager.snapshot
    this.networkManager.send({ type: 'DEPOSIT_RECORDED', playerId: player.playerId, displayName: player.displayName, amount, securedTotal, depositedAt, roundId: this.roundManager.snapshot.roundId, sentAt: Date.now() })
  }
  private refreshLeaderboard(): void {
    const entries = [...this.scores.values()]
    setLeaderboard(entries)
    this.lobbyManager.setLeaderboard(entries)
    const teamSecured = [...this.scores.values()].reduce((total, player) => total + player.securedTotal, 0)
    setTeamObjective(teamSecured, ORB_COUNT)
    if (teamSecured >= ORB_COUNT && this.networkManager.isCoordinator) this.roundManager.completeObjective()
  }
  private resultsText(): string {
    const ranked = [...this.scores.values()].sort((a, b) => b.securedTotal - a.securedTotal || a.displayName.localeCompare(b.displayName))
    const rows = ranked.length ? ranked.slice(0, 5).map((entry, index) => `${index + 1}. ${entry.displayName}  //  ${entry.securedTotal}`).join('\n') : 'NO ORBS SECURED'
    const teamSecured = ranked.reduce((total, entry) => total + entry.securedTotal, 0)
    return `${teamSecured >= ORB_COUNT ? 'TEAM SUCCESS // VAULT COMPLETE' : 'TIME EXPIRED // VAULT INCOMPLETE'}\nTEAM BANKED ${teamSecured} / ${ORB_COUNT}\n\n${rows}`
  }
  private handleNetworkMessage(message: GameNetworkMessage): void {
    const state = this.roundManager.snapshot
    this.roundManager.setAuthoritative(this.networkManager.isCoordinator)
    if (message.type === 'PLAYER_HELLO' && !this.networkManager.isCoordinator) {
      // Handles simultaneous joins and coordinator handoff. A client may have
      // initially considered itself coordinator before learning about a lower
      // stable player ID, so always reconcile against the elected coordinator.
      this.networkManager.send({ type: 'STATE_REQUESTED', playerId: this.networkManager.localPlayerId, roundId: state.roundId, sentAt: Date.now() })
      return
    }
    if (message.type === 'STATE_REQUESTED' && this.networkManager.isCoordinator) {
      this.networkManager.send({ type: 'STATE_SNAPSHOT', targetPlayerId: message.playerId, roundId: state.roundId, phase: state.phase, startsAt: state.startsAt, endsAt: state.endsAt, claimedOrbIds: this.orbManager.claimedIds, scores: [...this.scores.values()], signs: this.signManager.snapshot, sentAt: Date.now() }); return
    }
    if (message.type === 'STATE_SNAPSHOT' && message.targetPlayerId === this.networkManager.localPlayerId) {
      this.roundManager.applyRemoteState(message.roundId, message.phase, message.startsAt, message.endsAt)
      this.scores.clear(); message.scores.forEach((score) => this.scores.set(score.playerId, score)); this.refreshLeaderboard()
      message.signs.forEach((sign) => this.signManager.add(sign))
      message.claimedOrbIds.forEach((id) => this.orbManager.resolveClaim(id, 'already-claimed')); return
    }
    if (message.type === 'PHASE_CHANGED' && !this.networkManager.isCoordinator) {
      this.roundManager.applyRemoteState(message.roundId, message.phase, message.startsAt, message.endsAt); return
    }
    if (message.type === 'ORB_CLAIM_REQUESTED' && this.networkManager.isCoordinator) {
      const accepted = message.roundId === state.roundId && state.phase === GamePhase.PLAYING && !this.orbManager.claimedIds.includes(message.orbId)
      // Reserve immediately on the authority before broadcasting the result;
      // otherwise two requests received in the same message turn can both win.
      if (accepted) this.orbManager.resolveClaim(message.orbId, message.playerId)
      this.networkManager.send({ ...message, type: 'ORB_CLAIM_RESOLVED', accepted, sentAt: Date.now() }); return
    }
    if (message.type === 'ORB_CLAIM_RESOLVED' && message.accepted && message.roundId === state.roundId) this.orbManager.resolveClaim(message.orbId, message.playerId)
    if (message.type === 'SIGN_PLACED' && message.roundId === state.roundId) this.signManager.add(message.sign)
    if (message.type === 'DEPOSIT_RECORDED' && message.roundId === state.roundId) {
      const current = this.scores.get(message.playerId)
      if (!current || message.securedTotal >= current.securedTotal) this.scores.set(message.playerId, { playerId: message.playerId, displayName: message.displayName, securedTotal: message.securedTotal })
      this.refreshLeaderboard()
    }
  }

  private handleRoundState(state: Readonly<RoundState>, previousPhase?: GamePhase): void {
    setRoundHud(state.phase, this.roundManager.secondsRemaining)
    const orbRoundKey = `${state.roundId}:${state.startsAt}`
    if (state.roundId !== 'waiting' && orbRoundKey !== this.spawnedOrbRoundKey) {
      this.spawnedOrbRoundKey = orbRoundKey
      // All clients receive the same startsAt value, producing the same random
      // layout while ensuring every timed game gets a new placement seed.
      this.orbManager.reset(orbRoundKey)
    }
    if (state.roundId !== 'waiting' && state.roundId !== this.spawnedTrapRoundId) {
      this.spawnedTrapRoundId = state.roundId
      this.trapManager.reset(state.roundId)
    }
    if (this.networkManager.isCoordinator && previousPhase !== undefined && previousPhase !== state.phase) this.networkManager.send({ type: 'PHASE_CHANGED', roundId: state.roundId, phase: state.phase, startsAt: state.startsAt, endsAt: state.endsAt, sentAt: Date.now() })
    if (previousPhase === undefined || previousPhase === state.phase) return

    switch (state.phase) {
      case GamePhase.COUNTDOWN:
        this.trapManager.setEnabled(false)
        this.orbManager.setCollectionEnabled(false)
        this.vaultManager.setDepositsEnabled(false)
        setResultsMessage('')
        break
      case GamePhase.PLAYING:
        this.audioManager.play('round')
        this.trapManager.setEnabled(true)
        this.orbManager.setCollectionEnabled(true)
        this.vaultManager.setDepositsEnabled(true)
        break
      case GamePhase.RESULTS: {
        this.trapManager.setEnabled(false)
        this.orbManager.setCollectionEnabled(false)
        this.vaultManager.setDepositsEnabled(false)
        const discarded = this.playerManager.discardCarried()
        setResultsMessage(`${this.resultsText()}\n\nYOUR UNBANKED LOST: ${discarded}`)
        break
      }
      case GamePhase.RESETTING:
        this.signManager.reset()
        this.scores.clear()
        this.refreshLeaderboard()
        this.playerManager.resetRound()
        setResultsMessage('')
        break
    }
  }
}
