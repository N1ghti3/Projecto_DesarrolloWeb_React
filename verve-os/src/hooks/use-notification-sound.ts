// useNotificationSound - Reproduce un beep de notificación con Web Audio API.
// No requiere archivos de audio: genera el tono sintéticamente.
'use client'
import { useCallback, useRef } from 'react'

export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctxRef.current = new AC()
    }
    // El AudioContext puede empezar suspendido hasta que hay interacción del usuario
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {})
    }
    return ctxRef.current
  }, [])

  const play = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return

    const now = ctx.currentTime
    // Dos tonos cortos ascendentes (tipo "campanilla" de bar)
    const tones = [
      { freq: 880, start: 0, dur: 0.12 }, // La5
      { freq: 1320, start: 0.14, dur: 0.18 }, // Mi6 (agudo, llamativo)
    ]

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      // Envelope suave para evitar clicks
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    })
  }, [getCtx])

  return { play }
}
