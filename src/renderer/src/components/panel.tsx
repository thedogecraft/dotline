import { useState, useRef, useCallback, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const LS_KEY = "editorSplitPosition"

function loadSplit(): number {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw != null) {
      const n = Number(raw)
      if (n >= 20 && n <= 80) return n
    }
  } catch {
    /* ignored */
  }
  return 45
}

interface SplitPanelProps {
  left: ReactNode
  right: ReactNode
  defaultSplit?: number
  minLeft?: number
  maxLeft?: number
  className?: string
}

export function SplitPanel({
  left,
  right,
  defaultSplit,
  minLeft = 20,
  maxLeft = 80,
  className
}: SplitPanelProps): React.JSX.Element {
  const [split, setSplit] = useState(defaultSplit ?? loadSplit)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      const clamped = Math.min(maxLeft, Math.max(minLeft, pct))
      setSplit(clamped)
    },
    [minLeft, maxLeft]
  )

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(split))
  }, [split])

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full overflow-hidden", className)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="overflow-auto" style={{ width: `${split}%` }}>
        {left}
      </div>

      <div
        className="relative flex-shrink-0 cursor-col-resize group"
        style={{ width: 12 }}
        onPointerDown={onPointerDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/50 transition-colors" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-border group-hover:bg-primary/70 transition-colors" />
      </div>

      <div className="overflow-auto flex-1" style={{ width: `${100 - split}%` }}>
        {right}
      </div>
    </div>
  )
}
