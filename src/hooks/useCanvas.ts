import { useRef, useCallback, useState } from 'react'

export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.2
const MAX_SCALE = 3
const ZOOM_SENSITIVITY = 0.003

export function useCanvas() {
  // Mutable ref — updated synchronously on every event, never causes re-renders
  const transformRef = useRef<CanvasTransform>({ x: 0, y: 0, scale: 1 })
  // Direct ref to the world div — transform applied here, bypassing React
  const worldRef = useRef<HTMLDivElement | null>(null)
  // RAF handle for throttling React state updates (zoom %, minimap)
  const rafRef = useRef<number | null>(null)
  // React state — only updated once per animation frame for UI elements
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 })

  function applyToDOM(t: CanvasTransform) {
    transformRef.current = t
    if (worldRef.current) {
      worldRef.current.style.transform =
        `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`
    }
    // Throttle React re-renders to one per animation frame
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setTransform({ ...transformRef.current })
      })
    }
  }

  const pan = useCallback((dx: number, dy: number) => {
    const t = transformRef.current
    applyToDOM({ ...t, x: t.x + dx, y: t.y + dy })
  }, [])

  const zoom = useCallback((delta: number, cursorX: number, cursorY: number) => {
    const t = transformRef.current
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * (1 - delta * ZOOM_SENSITIVITY)))
    applyToDOM({
      scale: newScale,
      x: cursorX - (cursorX - t.x) * (newScale / t.scale),
      y: cursorY - (cursorY - t.y) * (newScale / t.scale),
    })
  }, [])

  const reset = useCallback(() => {
    const t = { x: 0, y: 0, scale: 1 }
    applyToDOM(t)
    setTransform(t)
  }, [])

  const panTo = useCallback((cx: number, cy: number, vw: number, vh: number) => {
    const t = transformRef.current
    applyToDOM({ ...t, x: vw / 2 - cx * t.scale, y: vh / 2 - cy * t.scale })
  }, [])

  const scaleTo = useCallback((scale: number, vw: number, vh: number) => {
    const t = transformRef.current
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    const cx = vw / 2
    const cy = vh / 2
    applyToDOM({
      scale: newScale,
      x: cx - (cx - t.x) * (newScale / t.scale),
      y: cy - (cy - t.y) * (newScale / t.scale),
    })
  }, [])

  return { transform, transformRef, worldRef, pan, zoom, reset, panTo, scaleTo }
}
