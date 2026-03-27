import { useReducer, useCallback } from 'react'

export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

type Action =
  | { type: 'PAN'; dx: number; dy: number }
  | { type: 'ZOOM'; delta: number; cursorX: number; cursorY: number }
  | { type: 'RESET' }
  | { type: 'PAN_TO'; cx: number; cy: number; vw: number; vh: number }

const MIN_SCALE = 0.2
const MAX_SCALE = 3
const ZOOM_SENSITIVITY = 0.003

function reducer(state: CanvasTransform, action: Action): CanvasTransform {
  switch (action.type) {
    case 'PAN':
      return { ...state, x: state.x + action.dx, y: state.y + action.dy }

    case 'ZOOM': {
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, state.scale * (1 - action.delta * ZOOM_SENSITIVITY)),
      )
      // Zoom anchored to cursor position
      return {
        scale: newScale,
        x: action.cursorX - (action.cursorX - state.x) * (newScale / state.scale),
        y: action.cursorY - (action.cursorY - state.y) * (newScale / state.scale),
      }
    }

    case 'RESET':
      return { x: 0, y: 0, scale: 1 }

    case 'PAN_TO':
      // Center canvas coordinate (cx, cy) in the viewport
      return {
        ...state,
        x: action.vw / 2 - action.cx * state.scale,
        y: action.vh / 2 - action.cy * state.scale,
      }

    default:
      return state
  }
}

export function useCanvas() {
  const [transform, dispatch] = useReducer(reducer, { x: 0, y: 0, scale: 1 })

  const pan = useCallback((dx: number, dy: number) => {
    dispatch({ type: 'PAN', dx, dy })
  }, [])

  const zoom = useCallback(
    (delta: number, cursorX: number, cursorY: number) => {
      dispatch({ type: 'ZOOM', delta, cursorX, cursorY })
    },
    [],
  )

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const panTo = useCallback((cx: number, cy: number, vw: number, vh: number) => {
    dispatch({ type: 'PAN_TO', cx, cy, vw, vh })
  }, [])

  return { transform, pan, zoom, reset, panTo }
}
