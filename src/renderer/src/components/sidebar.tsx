import { useState, useEffect } from "react"
import { NavLink } from "react-router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, Settings, Menu, Pencil, Move3D } from "lucide-react"
import Discord from "./discord"
import Github from "./github"

function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed))
  }, [collapsed])

  const navItems = [
    { to: "/", label: "Discover", icon: <Home size={18} /> },
    { to: "/positioning", label: "Positioning", icon: <Move3D size={18} /> },
    { to: "/editor", label: "Editor", icon: <Pencil size={18} /> }
  ]

  const footerItems = [{ to: "/settings", label: "Settings", icon: <Settings size={18} /> }]

  const linkClasses = ({ isActive }) =>
    cn(
      "group relative flex items-center rounded-md px-2.5 py-2 text-sm transition-all active:scale-95 gap-2",
      isActive
        ? "bg-primary text-primary-foreground"
        : "hover:bg-accent hover:text-accent-foreground"
    )

  const Label = ({ children }) => (
    <span
      className={cn(
        "whitespace-nowrap transition-opacity duration-200",
        collapsed ? "opacity-0 overflow-hidden w-0" : "opacity-100 w-auto"
      )}
    >
      {children}
    </span>
  )
  // use custom tooltip and not shadcn to fit the sidebar style
  const Tooltip = ({ text }) =>
    collapsed ? (
      <span
        className={cn(
          "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50",
          "rounded-md bg-popover text-popover-foreground px-2 py-1 text-xs shadow",
          "opacity-0 scale-95 transition group-hover:opacity-100 group-hover:scale-100"
        )}
      >
        {text}
      </span>
    ) : null

  return (
    <aside
      className={cn(
        "left-0 top-[var(--titlebar-height)] h-full bg-background border-r flex flex-col transition-[width] duration-300 ease-in-out",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className={cn("flex items-center justify-between p-2", collapsed && "border-b")}>
        <Button
          variant="ghost"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </Button>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClasses}
            aria-label={collapsed ? label : undefined}
          >
            <span className="flex items-center justify-center w-5 h-5">{icon}</span>
            <Label>{label}</Label>
            <Tooltip text={label} />
          </NavLink>
        ))}
      </nav>

      <nav className="flex flex-col gap-1 p-2 mt-auto border-t">
        {footerItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClasses}
            aria-label={collapsed ? label : undefined}
          >
            <span className="flex items-center justify-center w-5 h-5">{icon}</span>
            <Label>{label}</Label>
            <Tooltip text={label} />
          </NavLink>
        ))}

        <a
          href="https://discord.com/invite/En5YJYWj3Z"
          target="_blank"
          className={cn(
            "group relative flex items-center rounded-md px-2.5 py-2 text-sm transition-all active:scale-95 gap-2",
            "hover:bg-accent hover:text-accent-foreground"
          )}
          aria-label={collapsed ? "Discord" : undefined}
        >
          <span className="flex items-center justify-center">
            <Discord className="w-5 h-5 fill-primary" />
          </span>
          <Label>Discord</Label>
          <Tooltip text="Discord" />
        </a>
        <a
          href="https://github.com/Parcoil/dotline"
          target="_blank"
          className={cn(
            "group relative flex items-center rounded-md px-2.5 py-2 text-sm transition-all active:scale-95 gap-2",
            "hover:bg-accent hover:text-accent-foreground"
          )}
          aria-label={collapsed ? "Discord" : undefined}
        >
          <span className="flex items-center justify-center">
            <Github className="w-5 h-5 fill-secondary-foreground" />
          </span>
          <Label>Github</Label>
          <Tooltip text="Github" />
        </a>
      </nav>
    </aside>
  )
}

export default Sidebar
