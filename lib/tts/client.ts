// lib/tts/client.ts
// Hands-free voice helper — fetches MP3 from `/api/tts` (xAI Ara by default),
// plays it through an <audio> element, and falls back gracefully to the
// browser's speechSynthesis on any failure so hands-free never goes silent.
//
// Consumers (FullCardModal) build one instance per modal. Call `play(text)`
// on a step tap, `stop()` on dismiss, and `onEnd(cb)` to advance state.

function speechSynthAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function playWithSpeechSynth(
  text: string,
  lang: string,
  onEnd: () => void
): () => void {
  if (!speechSynthAvailable()) {
    onEnd()
    return () => {}
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.trim())
  u.lang = lang === 'es' ? 'es-ES' : 'en-US'
  u.rate = 0.88
  u.pitch = 1.0
  u.volume = 1.0
  u.onend = () => onEnd()
  u.onerror = () => onEnd()
  window.speechSynthesis.speak(u)
  return () => {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
  }
}

export class TtsPlayer {
  private audio: HTMLAudioElement | null = null
  private objectUrl: string | null = null
  private endHandler: (() => void) | null = null
  private loadingHandler: ((loading: boolean) => void) | null = null
  private cancelFallback: (() => void) | null = null
  private aborter: AbortController | null = null

  onEnd(cb: (() => void) | null) {
    this.endHandler = cb
  }

  /**
   * Fires with `true` right before fetching the TTS audio and `false` as
   * soon as playback begins (or falls back, or errors). Consumers use this
   * to show a spinner so the user knows the tap registered during the
   * 1–2 second network round-trip.
   */
  onLoadingChange(cb: ((loading: boolean) => void) | null) {
    this.loadingHandler = cb
  }

  async play(text: string, lang: string = 'en'): Promise<void> {
    this.stop()
    const trimmed = text.trim()
    if (!trimmed) {
      this.endHandler?.()
      return
    }

    this.loadingHandler?.(true)
    this.aborter = new AbortController()
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, lang }),
        signal: this.aborter.signal,
      })
      if (!res.ok) throw new Error(`tts ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      this.objectUrl = url

      const audio = new Audio(url)
      audio.preload = 'auto'
      // iOS Safari: required so <audio> obeys user-initiated play() without
      // requiring a silent-mode toggle.
      ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
      audio.onended = () => {
        this.cleanupAudio()
        this.endHandler?.()
      }
      audio.onerror = () => {
        // Server returned something that didn't decode — fall back.
        this.cleanupAudio()
        this.loadingHandler?.(false)
        this.cancelFallback = playWithSpeechSynth(trimmed, lang, () => {
          this.endHandler?.()
        })
      }
      audio.onplaying = () => {
        this.loadingHandler?.(false)
      }
      this.audio = audio
      await audio.play()
    } catch (err) {
      // Aborted (user tapped another step or closed) — stay silent.
      if (err instanceof DOMException && err.name === 'AbortError') {
        this.loadingHandler?.(false)
        return
      }
      // Any other failure — fall back to browser speechSynthesis so the user
      // still gets audio even if the network or provider blips.
      this.loadingHandler?.(false)
      this.cancelFallback = playWithSpeechSynth(trimmed, lang, () => {
        this.endHandler?.()
      })
    }
  }

  stop() {
    if (this.aborter) {
      try { this.aborter.abort() } catch { /* noop */ }
      this.aborter = null
    }
    this.cleanupAudio()
    if (this.cancelFallback) {
      this.cancelFallback()
      this.cancelFallback = null
    }
    if (speechSynthAvailable()) {
      try { window.speechSynthesis.cancel() } catch { /* noop */ }
    }
    this.loadingHandler?.(false)
  }

  private cleanupAudio() {
    if (this.audio) {
      try { this.audio.pause() } catch { /* noop */ }
      this.audio = null
    }
    if (this.objectUrl) {
      try { URL.revokeObjectURL(this.objectUrl) } catch { /* noop */ }
      this.objectUrl = null
    }
  }
}

/** True if the environment can play TTS in some form (xAI or browser). */
export function ttsAvailable(): boolean {
  // We always attempt /api/tts first; only return false if neither TTS path
  // could possibly work. The network side can't be pre-detected, so this is
  // essentially: "do we have Web Audio or speechSynthesis as a fallback?"
  return typeof window !== 'undefined' && (
    typeof Audio !== 'undefined' || 'speechSynthesis' in window
  )
}
