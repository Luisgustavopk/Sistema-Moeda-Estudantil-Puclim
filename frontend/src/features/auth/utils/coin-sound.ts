import { soundEnabled } from '@/shared/lib/confirmation-sound'

let context: AudioContext | undefined
let generation = 0
const voices = new Set<OscillatorNode>()

export function stopCoinSound() {
  generation++
  for (const voice of voices) {
    try {
      voice.stop()
    } catch {
      // A nota já terminou.
    }
  }
  voices.clear()
}

/** Timbre metálico curto, sintetizado somente após um gesto do usuário. */
export async function playCoinSound(): Promise<boolean> {
  if (!soundEnabled() || !window.AudioContext || document.hidden) return false
  stopCoinSound()
  const current = generation
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') await context.resume()
    if (current !== generation || !soundEnabled() || document.hidden)
      return false
    const start = context.currentTime
    for (const [index, frequency] of [1568, 2349, 3729].entries()) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.985,
        start + 0.5,
      )
      envelope.gain.setValueAtTime(0, start)
      envelope.gain.linearRampToValueAtTime(0.055 / (index + 1), start + 0.008)
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.65)
      oscillator.connect(envelope)
      envelope.connect(context.destination)
      voices.add(oscillator)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
        voices.delete(oscillator)
      }
      oscillator.start(start)
      oscillator.stop(start + 0.7)
    }
    return true
  } catch {
    // A interação visual continua disponível se o navegador bloquear áudio.
    return false
  }
}
