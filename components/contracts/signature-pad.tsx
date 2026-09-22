"use client"

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react"
import { Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface SignaturePadHandle {
  toDataUrl: () => string | null
  clear: () => void
  isEmpty: () => boolean
  resize: () => void
}

// Ink & stroke tuning for a natural, pen-like feel
const INK_COLOR = "#000080"
const BASE_WIDTH = 2.6 // CSS px for slow, deliberate strokes
const MIN_WIDTH = 1.15 // CSS px floor for very fast strokes
const WIDTH_SMOOTHING = 0.35

interface SigPoint {
  x: number
  y: number
  width: number
}

interface Props {
  label: string
  description?: string
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { label, description },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef<SigPoint[]>([])
  const lastTimeRef = useRef(0)
  const [empty, setEmpty] = useState(true)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // If the element is hidden (e.g. other step), width/height will be 0.
    // We should not attempt to resize to 0.
    if (rect.width === 0 || rect.height === 0) return

    const newWidth = Math.floor(rect.width * dpr)
    const newHeight = Math.floor(rect.height * dpr)

    if (canvas.width === newWidth && canvas.height === newHeight) return

    // Save the current content before resizing
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext("2d")
    if (tempCtx && canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0)
    }

    canvas.width = newWidth
    canvas.height = newHeight
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = INK_COLOR
    ctx.fillStyle = INK_COLOR

    // Restore the content if it wasn't empty
    if (tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })
    observer.observe(canvas)

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      observer.disconnect()
    }
  }, [resizeCanvas])

  const getPos = useCallback((e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  // Draws one segment of the stroke. With three points it renders a smooth
  // quadratic curve through the mid-points (instead of jagged straight
  // lines), which is what makes the signature look hand-written.
  const strokeSegment = useCallback(
    (a: SigPoint, b: SigPoint, c: SigPoint | null) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      ctx.beginPath()
      ctx.lineWidth = b.width
      if (c) {
        const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const m2 = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }
        ctx.moveTo(m1.x, m1.y)
        ctx.quadraticCurveTo(b.x, b.y, m2.x, m2.y)
      } else {
        ctx.moveTo(a.x, a.y)
        ctx.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2)
      }
      ctx.stroke()
    },
    [],
  )

  // Pen-like line width: slow & deliberate strokes are thicker, quick
  // strokes thinner — smoothed over the previous segment to avoid flicker.
  const nextWidth = useCallback(
    (prevWidth: number, dist: number, dt: number, pressure: number) => {
      const speed = dist / Math.max(dt, 1) // px per ms
      const t = Math.min(speed / 1.4, 1) // 0 = slow, 1 = fast
      let target = BASE_WIDTH + (MIN_WIDTH - BASE_WIDTH) * t
      if (pressure > 0 && pressure !== 0.5) {
        // Stylus/pen pressure: press harder → slightly thicker line
        target *= 0.7 + pressure * 0.6
        target = Math.min(target, BASE_WIDTH * 1.4)
      }
      return Math.max(MIN_WIDTH, prevWidth + (target - prevWidth) * WIDTH_SMOOTHING)
    },
    [],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const p = getPos(e)
    pointsRef.current = [{ x: p.x, y: p.y, width: BASE_WIDTH }]
    lastTimeRef.current = performance.now()

    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      // Ink dot so a single tap still leaves a visible mark
      ctx.beginPath()
      ctx.arc(p.x, p.y, BASE_WIDTH / 2, 0, Math.PI * 2)
      ctx.fillStyle = INK_COLOR
      ctx.fill()
    }
    setEmpty(false)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const native = e.nativeEvent
    // Use coalesced events when available so fast strokes keep every
    // intermediate point instead of only the last reported one.
    const coalesced: PointerEvent[] =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : []
    const events = coalesced.length > 0 ? [...coalesced, native] : [native]

    const now = performance.now()
    const perEvent = Math.max(now - lastTimeRef.current, 1) / events.length

    for (const ev of events) {
      const pts = pointsRef.current
      const prev = pts[pts.length - 1]
      if (!prev) continue
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      const dist = Math.hypot(x - prev.x, y - prev.y)
      if (dist < 0.75) continue // ignore micro jitter
      const width = nextWidth(prev.width, dist, perEvent, ev.pressure ?? 0.5)
      const point: SigPoint = { x, y, width }
      pts.push(point)
      const n = pts.length
      if (n >= 3) strokeSegment(pts[n - 3], pts[n - 2], point)
      else strokeSegment(pts[n - 2], point, null)
    }

    lastTimeRef.current = now
    if (pointsRef.current.length > 1) setEmpty(false)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const pts = pointsRef.current
    const ctx = canvasRef.current?.getContext("2d")
    // Finish the stroke: connect the last mid-point to the final position
    if (ctx && pts.length >= 2) {
      const a = pts[pts.length - 2]
      const b = pts[pts.length - 1]
      ctx.beginPath()
      ctx.lineWidth = b.width
      ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    pointsRef.current = []
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setEmpty(true)
  }, [])

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty: () => empty,
    toDataUrl: () => {
      if (empty) return null
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.toDataURL("image/png")
    },
    resize: resizeCanvas,
  }))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={empty}
        >
          <Eraser className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <canvas
          ref={canvasRef}
          aria-label={`${label} canvas`}
          role="img"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          className="block h-44 w-full touch-none rounded-lg"
          style={{ cursor: "crosshair" }}
        />
      </div>
    </div>
  )
})
