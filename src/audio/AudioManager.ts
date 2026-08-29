import { AudioSource, engine, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { MAZE_CENTER } from '../maze/MazeManager'
export type GameSound = 'orb' | 'deposit' | 'trap' | 'round' | 'teleport' | 'death'
const clips: Record<GameSound, string> = {
  orb: 'assets/audio/orb-pickup.ogg',
  deposit: 'assets/audio/vault-deposit.ogg',
  trap: 'assets/audio/trap-hit.ogg',
  round: 'assets/audio/round-start.ogg',
  teleport: 'assets/audio/teleport.ogg',
  death: 'assets/audio/trap-hit.ogg'
}
export class AudioManager {
  private readonly globalSource = engine.addEntity()
  private readonly ambienceSource = engine.addEntity()
  private enabled = false
  initialize(): void {
    Transform.create(this.globalSource, { position: Vector3.Zero() })
    Transform.create(this.ambienceSource, { position: Vector3.create(MAZE_CENTER, 3.2, MAZE_CENTER) })
    AudioSource.create(this.ambienceSource, { audioClipUrl: 'assets/audio/maze-overdrive.ogg', playing: false, loop: true, volume: 0.42, global: true })
    this.enable()
  }
  enable(): void {
    this.enabled = true
    AudioSource.playSound(this.ambienceSource, 'assets/audio/maze-overdrive.ogg', true)
    this.play('round')
  }
  disable(): void {
    this.enabled = false
    AudioSource.stopSound(this.ambienceSource, true)
    AudioSource.stopSound(this.globalSource, true)
  }
  setEnabled(enabled: boolean): void {
    if (enabled) this.enable()
    else this.disable()
  }
  play(sound: GameSound): void {
    if (!this.enabled) return
    AudioSource.createOrReplace(this.globalSource, { audioClipUrl: clips[sound], playing: false, loop: false, volume: sound === 'trap' ? 0.85 : 0.68, global: true, currentTime: 0 })
    AudioSource.playSound(this.globalSource, clips[sound], true)
  }
}
