import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function Section({
  title,
  defaultOpen = true,
  children,
  className
}: SectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn("border-b border-border last:border-b-0", className)}>
      <button
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        {title}
      </button>
      {open && <div className="px-4 pb-3 space-y-3">{children}</div>}
    </div>
  )
}
