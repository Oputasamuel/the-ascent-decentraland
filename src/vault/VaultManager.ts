import { engine, Transform, TriggerArea, triggerAreaEventsSystem } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { PlayerManager } from '../players/PlayerManager'
import { setVaultMessage } from '../ui'
import { MAZE_CENTER } from '../maze/MazeManager'

const DEPOSIT_DURATION_SECONDS = 1
const FEEDBACK_DURATION_SECONDS = 2.25

export class VaultManager {
  private depositTimeRemaining = 0
  private feedbackTimeRemaining = 0
  private isPlayerInside = false
  private depositsEnabled = false

  constructor(
    private readonly playerManager: PlayerManager,
    private readonly onDeposit: (amount: number, securedTotal: number, depositedAt: number) => void
  ) {}

  initialize(): void {
    const trigger = engine.addEntity()
    Transform.create(trigger, {
      position: Vector3.create(MAZE_CENTER, 1.25, MAZE_CENTER),
      scale: Vector3.create(5.4, 2.5, 5.4)
    })
    TriggerArea.setBox(trigger)

    triggerAreaEventsSystem.onTriggerEnter(trigger, (event) => {
      if (event.trigger?.entity !== engine.PlayerEntity) return
      this.isPlayerInside = true
      this.beginDeposit()
    })

    triggerAreaEventsSystem.onTriggerExit(trigger, (event) => {
      if (event.trigger?.entity !== engine.PlayerEntity) return
      this.isPlayerInside = false
      if (this.depositTimeRemaining > 0) {
        this.depositTimeRemaining = 0
        setVaultMessage('DEPOSIT CANCELLED')
        this.feedbackTimeRemaining = 1.25
      }
    })

    engine.addSystem((deltaTime) => this.update(deltaTime))
  }

  setDepositsEnabled(enabled: boolean): void {
    this.depositsEnabled = enabled
    if (!enabled) {
      this.depositTimeRemaining = 0
      this.feedbackTimeRemaining = 0
      setVaultMessage('')
    }
  }

  private beginDeposit(): void {
    if (!this.depositsEnabled) return
    const carried = this.playerManager.snapshot.carriedOrbs
    if (carried <= 0) {
      setVaultMessage('COLLECT ORBS BEFORE BANKING')
      this.feedbackTimeRemaining = 1.5
      return
    }
    this.feedbackTimeRemaining = 0
    this.depositTimeRemaining = DEPOSIT_DURATION_SECONDS
    setVaultMessage(`DEPOSITING ${carried} ORBS...`)
  }

  private update(deltaTime: number): void {
    if (this.depositTimeRemaining > 0) {
      if (!this.depositsEnabled) {
        this.depositTimeRemaining = 0
        return
      }
      this.depositTimeRemaining -= deltaTime
      if (this.depositTimeRemaining <= 0 && this.isPlayerInside) {
        const depositedAt = Date.now()
        const amount = this.playerManager.depositCarried(depositedAt)
        if (amount > 0) {
          this.onDeposit(amount, this.playerManager.snapshot.securedOrbs, depositedAt)
          setVaultMessage(`+${amount} SECURED`)
          this.feedbackTimeRemaining = FEEDBACK_DURATION_SECONDS
        }
      }
    }

    if (this.feedbackTimeRemaining > 0) {
      this.feedbackTimeRemaining -= deltaTime
      if (this.feedbackTimeRemaining <= 0) setVaultMessage('')
    }
  }
}
