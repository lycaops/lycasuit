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
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      // If the element is hidden (e.g. step 2 when starting), width/height will be 0.
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
      ctx.strokeStyle = "#000080"
      ctx.lineWidth = 2.5

      // Restore the content if it wasn't empty
      if (tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height)
      }
    }

    const observer = new ResizeObserver(() => {
      resize()
    })
    observer.observe(canvas)

    resize()
    window.addEventListener("resize", resize)
    return () => {
      window.removeEventListener("resize", resize)
      observer.disconnect()
    }
  }, [])

  const getPos = useCallback((e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastRef.current = getPos(e)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !lastRef.current) return

    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastRef.current = p
    setEmpty(false)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false
    lastRef.current = null
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
    resize: () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      if (rect.width === 0 || rect.height === 0) return

      const newWidth = Math.floor(rect.width * dpr)
      const newHeight = Math.floor(rect.height * dpr)
      
      // Save content
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
      ctx.strokeStyle = "#000080"
      ctx.lineWidth = 2.5

      // Restore content
      if (tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height)
      }
    }
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
          onPointerLeave={onPointerUp}
          className="block h-44 w-full touch-none rounded-lg"
          style={{ cursor: "crosshair" }}
        />
      </div>
    </div>
  )
})
