import type { Item } from '@/types'
import type { CanvasTransform } from '@/hooks/useCanvas'

const MM_W = 160
const MM_H = 100
const PAD = 30 // canvas-unit padding around items

// Axis-aligned bounding box of a rotated rect (cx,cy = center, w, h, deg)
function rotatedAABB(cx: number, cy: number, w: number, h: number, deg: number) {
  const r = (deg * Math.PI) / 180
  const cos = Math.abs(Math.cos(r))
  const sin = Math.abs(Math.sin(r))
  const hw = (w * cos + h * sin) / 2
  const hh = (w * sin + h * cos) / 2
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh }
}

interface Props {
  items: Item[]
  transform: CanvasTransform
  viewportW: number
  viewportH: number
  onPanTo: (cx: number, cy: number) => void
}

export function Minimap({ items, transform, viewportW, viewportH, onPanTo }: Props) {
  if (items.length === 0) return null

  // World bounding box — account for rotation
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const item of items) {
    const cx = item.x + item.width / 2
    const cy = item.y + item.height / 2
    const rot = item.rotation ?? 0
    if (rot === 0) {
      minX = Math.min(minX, item.x); minY = Math.min(minY, item.y)
      maxX = Math.max(maxX, item.x + item.width); maxY = Math.max(maxY, item.y + item.height)
    } else {
      const b = rotatedAABB(cx, cy, item.width, item.height, rot)
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY)
    }
  }
  minX -= PAD; minY -= PAD; maxX += PAD; maxY += PAD

  const worldW = maxX - minX
  const worldH = maxY - minY
  const mmScale = Math.min(MM_W / worldW, MM_H / worldH)

  // Center the scaled content inside the fixed minimap rect
  const scaledW = worldW * mmScale
  const scaledH = worldH * mmScale
  const ox = (MM_W - scaledW) / 2
  const oy = (MM_H - scaledH) / 2

  function toMm(cx: number, cy: number) {
    return { x: (cx - minX) * mmScale + ox, y: (cy - minY) * mmScale + oy }
  }

  // Viewport rectangle in canvas coords
  const vpLeft = -transform.x / transform.scale
  const vpTop  = -transform.y / transform.scale
  const vpW    = viewportW / transform.scale
  const vpH    = viewportH / transform.scale
  const vp     = toMm(vpLeft, vpTop)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cx = (mx - ox) / mmScale + minX
    const cy = (my - oy) / mmScale + minY
    onPanTo(cx, cy)
  }

  return (
    <div
      className="absolute bottom-20 right-5 rounded-lg border border-border bg-background/90 backdrop-blur-sm shadow-md overflow-hidden cursor-crosshair z-10 opacity-60 hover:opacity-100 transition-opacity"
      style={{ width: MM_W, height: MM_H }}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Cards */}
      {items.map((item) => {
        const cx = item.x + item.width / 2
        const cy = item.y + item.height / 2
        const mmC = toMm(cx, cy)
        const w = Math.max(3, item.width * mmScale)
        const h = Math.max(3, item.height * mmScale)
        const rot = item.rotation ?? 0
        return (
          <div
            key={item.id}
            className="absolute rounded-[2px] bg-primary/25 border border-primary/20"
            style={{
              left: mmC.x - w / 2,
              top:  mmC.y - h / 2,
              width: w,
              height: h,
              transform: rot ? `rotate(${rot}deg)` : undefined,
              transformOrigin: 'center',
            }}
          />
        )
      })}

      {/* Viewport indicator */}
      <div
        className="absolute border border-primary rounded-[2px] bg-primary/10 pointer-events-none"
        style={{
          left:   vp.x,
          top:    vp.y,
          width:  Math.max(6, vpW * mmScale),
          height: Math.max(6, vpH * mmScale),
        }}
      />
    </div>
  )
}
