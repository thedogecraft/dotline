import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon, X, Square, Minus } from "lucide-react"
import dotlineImage from "../../../../resources/dotline.png"
import data from "../../../../package.json"
import { Switch } from "@/components/ui/switch"
import { useOverlayVisibility } from "@/hooks/overlay"
function Titlebar(): React.JSX.Element {
  const { theme, setTheme } = useTheme()
  const { enabled, setEnabled } = useOverlayVisibility()

  const handleWindowControl = (action: "minimize" | "maximize" | "close"): void => {
    // @ts-ignore - electron API type mismatch
    window.electron?.ipcRenderer?.send("window-control", action)
  }

  return (
    <header
      className="flex items-center justify-between p-2 select-none bg-background border-b "
      style={{
        // @ts-ignore - CSS custom property not in type definitions
        WebkitAppRegion: "drag",
        userSelect: "none",
        height: 42,
        /* @ts-ignore - CSS custom property not in type definitions */
        ["--titlebar-height" as string]: "42px"
      }}
    >
      <div className="flex items-center gap-2 text-base font-semibold">
        <img src={dotlineImage} alt="" className="w-5 h-5" />
        Dotline
        <div className="rounded-full bg-accent pl-2 pr-2 text-xs pt-1 pb-1 ">
          <p>Alpha</p>
        </div>
        <p className="text-sm text-muted-foreground">v{data.version}</p>
      </div>
      {/* @ts-ignore - CSS custom property not in type definitions */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: "no-drag" }}>
        <div className="flex items-center gap-2 mr-2">
          <span className="text-xs text-muted-foreground">Crosshair</span>
          <Switch checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleWindowControl("minimize")}
          title="Minimize"
          aria-label="Minimize window"
        >
          <Minus size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleWindowControl("maximize")}
          title="Maximize"
          aria-label="Maximize window"
        >
          <Square size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleWindowControl("close")}
          title="Close"
          aria-label="Close window"
        >
          <X size={18} />
        </Button>
      </div>
    </header>
  )
}

export default Titlebar
