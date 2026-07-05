import { useEffect, useMemo, useState } from "react"
import { Routes, Route } from "react-router"
import { Crosshair } from "@/components/crosshair"
import { CrosshairConfig } from "@/types/crosshair"
import { defaultConfig } from "@/types/crosshair"
import Editor from "@/pages/editor"
import Discover from "@/pages/discover"
import Titlebar from "./components/titlebar"
import Sidebar from "./components/sidebar"
import Positioning from "./pages/positioning"
import Settings from "./pages/settings"
import packageJson from "../../../package.json"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { OverlayProvider } from "@/hooks/overlay"
import { CrosshairConfigProvider } from "@/hooks/crosshair-config"

function Overlay() {
  const [config, setConfig] = useState<CrosshairConfig>(defaultConfig)

  useEffect(() => {
    const listener = (_event: unknown, cfg: CrosshairConfig) => setConfig(cfg)
    window.electron.ipcRenderer.on("overlay:config", listener as any)
    return () => {
      window.electron.ipcRenderer.removeListener("overlay:config", listener as any)
    }
  }, [])

  useEffect(() => {
    const savedRaw = localStorage.getItem("currentConfig")
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw) as Partial<CrosshairConfig>
        const merged = { ...defaultConfig, ...saved }
        setConfig(merged)
        window.electron.ipcRenderer.invoke("overlay:update-config", merged)
      } catch {}
    }
  }, [])

  return <Crosshair config={config} />
}

function RoutedApp() {
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState<number>(0)
  const isDownloaded = useMemo(() => downloadPercent >= 100, [downloadPercent])
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [patchNotesOpen, setPatchNotesOpen] = useState(false)
  const [patchNotes, setPatchNotes] = useState("")

  useEffect(() => {
    const seen = localStorage.getItem("onboardingSeen")
    if (!seen) setOnboardingOpen(true)

    const version = packageJson.version
    fetch(`https://api.github.com/repos/Parcoil/dotline/releases/tags/v${version}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.body) {
          const body = data.body
          const stored = localStorage.getItem("patchNotes")
          if (stored !== body) {
            setPatchNotes(body)
            setPatchNotesOpen(true)
            localStorage.setItem("patchNotes", body)
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleDismissOnboarding = () => {
    localStorage.setItem("onboardingSeen", "true")
    setOnboardingOpen(false)
  }

  useEffect(() => {
    const onAvailable = (_e: unknown, payload: { version?: string }) => {
      setUpdateVersion(payload?.version ?? null)
      setUpdateOpen(true)
      setIsDownloading(false)
      setDownloadPercent(0)
    }
    const onNotAvailable = () => {
      toast.success("You're up to date")
    }
    const onError = (_e: unknown, payload: { message: string }) => {
      toast.error(payload?.message ?? "Update error")
      setIsDownloading(false)
    }
    const onProgress = (_e: unknown, payload: { percent: number }) => {
      setIsDownloading(true)
      setDownloadPercent(Math.max(0, Math.min(100, payload.percent || 0)))
    }
    const onDownloaded = () => {
      setIsDownloading(false)
      setDownloadPercent(100)
    }

    window.electron.ipcRenderer.on("updater:available", onAvailable as any)
    window.electron.ipcRenderer.on("updater:not-available", onNotAvailable as any)
    window.electron.ipcRenderer.on("updater:error", onError as any)
    window.electron.ipcRenderer.on("updater:download-progress", onProgress as any)
    window.electron.ipcRenderer.on("updater:downloaded", onDownloaded as any)
    return () => {
      window.electron.ipcRenderer.removeListener("updater:available", onAvailable as any)
      window.electron.ipcRenderer.removeListener("updater:not-available", onNotAvailable as any)
      window.electron.ipcRenderer.removeListener("updater:error", onError as any)
      window.electron.ipcRenderer.removeListener("updater:download-progress", onProgress as any)
      window.electron.ipcRenderer.removeListener("updater:downloaded", onDownloaded as any)
    }
  }, [])

  const handleUpdateNow = async () => {
    if (isDownloaded) {
      await window.electron.ipcRenderer.invoke("updater:install")
      return
    }
    setIsDownloading(true)
    setDownloadPercent(0)
    await window.electron.ipcRenderer.invoke("updater:download")
  }

  const handleRemindLater = () => {
    setUpdateOpen(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/positioning" element={<Positioning />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/editor" element={<Editor />} />
          </Routes>
        </main>
      </div>
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent showCloseButton={!isDownloading}>
          <DialogHeader>
            <DialogTitle>Update available{updateVersion ? ` (${updateVersion})` : ""}</DialogTitle>
            <DialogDescription>
              {isDownloaded
                ? "The update has been downloaded. Restart to install now."
                : isDownloading
                  ? `Downloading update… ${Math.floor(downloadPercent)}%`
                  : "A new version is available. Would you like to update now?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {!isDownloading && (
              <Button variant="ghost" onClick={handleRemindLater}>
                Remind me later
              </Button>
            )}
            <Button onClick={handleUpdateNow} disabled={isDownloading}>
              {isDownloaded ? "Restart and install" : isDownloading ? "Downloading…" : "Update now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Welcome to Dotline</AlertDialogTitle>
            <AlertDialogDescription>
              The app is in alpha. Please report bugs and request features on our GitHub repository.
              you can also report a issue in settings
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* <Button
               variant="outline"
               onClick={() => {
                 try {
                   window.open("https://github.com/Parcoil/dotline/issues/new/choose", "_blank")
                 } catch {}
               }}
             >
               Report / Request
             </Button> */}
            <Button onClick={handleDismissOnboarding}>Got it</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={patchNotesOpen} onOpenChange={() => {}}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Patch Notes for v{packageJson.version}</DialogTitle>
            <DialogDescription asChild>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{patchNotes}</pre>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                localStorage.setItem("patchNotes", patchNotes)
                setPatchNotesOpen(false)
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster richColors closeButton />
    </div>
  )
}

function App() {
  const params = new URLSearchParams(window.location.search)
  const isOverlay = params.get("overlay") === "1"

  useEffect(() => {
    if (!isOverlay) {
      const discordRpcDisabled = localStorage.getItem("discordRpcDisabled")
      if (discordRpcDisabled !== "1" && discordRpcDisabled !== "true") {
        window.electron.ipcRenderer.invoke("start-discord-rpc").catch(() => {})
      }
    }
  }, [isOverlay])

  return isOverlay ? (
    <Overlay />
  ) : (
    <OverlayProvider>
      <CrosshairConfigProvider>
        <RoutedApp />
      </CrosshairConfigProvider>
    </OverlayProvider>
  )
}

export default App
