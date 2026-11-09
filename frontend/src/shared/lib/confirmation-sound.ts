const files = [
  'puclim-success.mp3',
  'confirmation-1.mp3',
  'confirmation-2.mp3',
  'confirmation-3.mp3',
]
const seen = new Set<string>()
let context: AudioContext | undefined
let buffers: Promise<AudioBuffer[]> | undefined
let previous = -1
let source: AudioBufferSourceNode | undefined
const unlockTones = new Set<OscillatorNode>()
let playbackGeneration = 0
const preferenceEvent = 'puclim:sound-preference'
export function soundEnabled() {
  try {
    return localStorage.getItem('puclim.confirmation-sounds') !== 'off'
  } catch {
    return true
  }
}
export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem('puclim.confirmation-sounds', enabled ? 'on' : 'off')
  } catch {
    /* Session still works without storage. */
  }
  if (!enabled) stopConfirmation()
  window.dispatchEvent(new Event(preferenceEvent))
}
export function subscribeSound(callback: () => void) {
  window.addEventListener(preferenceEvent, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(preferenceEvent, callback)
    window.removeEventListener('storage', callback)
  }
}
export function primeConfirmation() {
  if (!soundEnabled() || !window.AudioContext) return
  try {
    context ??= new AudioContext()
    void context.resume().catch(() => undefined)
    buffers ??= Promise.all(
      files.map(async (file) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}sounds/${file}`,
        )
        if (!response.ok) throw new Error('Audio unavailable')
        return context!.decodeAudioData(await response.arrayBuffer())
      }),
    ).catch((error) => {
      buffers = undefined
      throw error
    })
    void buffers.catch(() => undefined)
  } catch {
    /* Sound is supplementary; the operation must remain usable. */
  }
}
export function stopConfirmation() {
  playbackGeneration++
  for (const tone of unlockTones) {
    try {
      tone.stop()
    } catch {
      /* Already ended. */
    }
  }
  unlockTones.clear()
  try {
    source?.stop()
  } catch {
    /* Already ended. */
  }
  source = undefined
}

/** Prime in a user gesture; browsers that block autoplay keep visual feedback. */
export function primeUnlockSound() {
  if (!soundEnabled() || !window.AudioContext) return
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended')
      void context.resume().catch(() => undefined)
  } catch {
    /* Sound is supplementary. */
  }
}

/** A short earned-reward melody shares the interface's sound preference. */
export function playUnlockSound(): boolean {
  if (
    !soundEnabled() ||
    !context ||
    context.state !== 'running' ||
    document.hidden
  )
    return false
  try {
    stopConfirmation()
    const audio = context
    for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
      const tone = audio.createOscillator()
      const gain = audio.createGain()
      const start = audio.currentTime + index * 0.09
      tone.type = 'sine'
      tone.frequency.value = frequency
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.045, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22)
      tone.connect(gain)
      gain.connect(audio.destination)
      unlockTones.add(tone)
      tone.onended = () => {
        unlockTones.delete(tone)
        tone.disconnect()
        gain.disconnect()
      }
      tone.start(start)
      tone.stop(start + 0.24)
    }
    return true
  } catch {
    stopConfirmation()
    return false
  }
}
export async function playConfirmation(): Promise<number | null> {
  if (!soundEnabled() || !context || !buffers || document.hidden) return null
  const generation = ++playbackGeneration
  try {
    const available = await buffers
    if (
      generation !== playbackGeneration ||
      !soundEnabled() ||
      document.hidden ||
      context.state !== 'running'
    )
      return null
    const choices = available.map((_, i) => i).filter((i) => i !== previous)
    previous = choices[Math.floor(Math.random() * choices.length)]
    const buffer = available[previous]
    stopConfirmation()
    const gain = context.createGain()
    let peak = 0,
      square = 0
    const samples = buffer.getChannelData(0)
    for (const sample of samples) {
      peak = Math.max(peak, Math.abs(sample))
      square += sample * sample
    }
    const rms = Math.sqrt(square / samples.length)
    gain.gain.value = Math.min(
      0.35,
      0.08 / Math.max(rms, 0.001),
      0.6 / Math.max(peak, 0.001),
    )
    gain.connect(context.destination)
    source = context.createBufferSource()
    source.buffer = buffer
    source.connect(gain)
    const current = source
    current.onended = () => {
      current.disconnect()
      gain.disconnect()
      if (source === current) source = undefined
    }
    source.start()
    return buffer.duration
  } catch {
    return null
  }
}
export function celebrateSuccess(kind: 'quiz' | 'redemption', id: string) {
  const key = `${kind}:${id}`
  if (seen.has(key)) return
  seen.add(key)
  window.dispatchEvent(
    new CustomEvent('puclim:celebrate', { detail: { kind, id } }),
  )
}
