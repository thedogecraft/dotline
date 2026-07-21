import { useEffect, useMemo, useState } from "react"
import { createHashRouter, RouterProvider, Outlet } from "react-router"
import { Crosshair } from "@/components/crosshair"
import { CrosshairConfig, CrosshairLibraryItem } from "@/types/crosshair"
import { defaultConfig } from "@/types/crosshair"
import Editor from "@/pages/editor"
import Discover from "@/pages/discover"
import ErrorBoundary from "@/components/ErrorBoundary"
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
import Markdown from "react-markdown"

function Overlay(): React.JSX.Element {
  const [config, setConfig] = useState<CrosshairConfig>(defaultConfig)

  useEffect(() => {
    const listener = (_event: unknown, cfg: CrosshairConfig): void => setConfig(cfg)
    window.electron.ipcRenderer.on("overlay:config", listener as (...args: unknown[]) => void)
    return () => {
      window.electron.ipcRenderer.removeListener(
        "overlay:config",
        listener as (...args: unknown[]) => void
      )
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
      } catch {
        /* ignored */
      }
    }
  }, [])

  return <Crosshair config={config} />
}

function Layout(): React.JSX.Element {
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState<number>(0)
  const isDownloaded = useMemo(() => downloadPercent >= 100, [downloadPercent])
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [patchNotesOpen, setPatchNotesOpen] = useState(false)
  const [patchNotes, setPatchNotes] = useState("")
  const [importedFileData, setImportedFileData] = useState<{
    config: CrosshairConfig
    name?: string
  } | null>(null)

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

  const handleDismissOnboarding = (): void => {
    localStorage.setItem("onboardingSeen", "true")
    setOnboardingOpen(false)
  }

  useEffect(() => {
    const onFileOpened = (_e: unknown, data: { config: CrosshairConfig; name?: string }): void => {
      setImportedFileData(data)
    }
    window.electron.ipcRenderer.on(
      "config:opened-file",
      onFileOpened as (...args: unknown[]) => void
    )
    return () => {
      window.electron.ipcRenderer.removeListener(
        "config:opened-file",
        onFileOpened as (...args: unknown[]) => void
      )
    }
  }, [])

  useEffect(() => {
    const onAvailable = (_e: unknown, payload: { version?: string }): void => {
      setUpdateVersion(payload?.version ?? null)
      setUpdateOpen(true)
      setIsDownloading(false)
      setDownloadPercent(0)
    }
    const onNotAvailable = (): void => {
      toast.success("You're up to date")
    }
    const onError = (_e: unknown, payload: { message: string }): void => {
      toast.error(payload?.message ?? "Update error")
      setIsDownloading(false)
    }
    const onProgress = (_e: unknown, payload: { percent: number }): void => {
      setIsDownloading(true)
      setDownloadPercent(Math.max(0, Math.min(100, payload.percent || 0)))
    }
    const onDownloaded = (): void => {
      setIsDownloading(false)
      setDownloadPercent(100)
    }

    window.electron.ipcRenderer.on("updater:available", onAvailable as (...args: unknown[]) => void)
    window.electron.ipcRenderer.on(
      "updater:not-available",
      onNotAvailable as (...args: unknown[]) => void
    )
    window.electron.ipcRenderer.on("updater:error", onError as (...args: unknown[]) => void)
    window.electron.ipcRenderer.on(
      "updater:download-progress",
      onProgress as (...args: unknown[]) => void
    )
    window.electron.ipcRenderer.on(
      "updater:downloaded",
      onDownloaded as (...args: unknown[]) => void
    )
    return () => {
      window.electron.ipcRenderer.removeListener(
        "updater:available",
        onAvailable as (...args: unknown[]) => void
      )
      window.electron.ipcRenderer.removeListener(
        "updater:not-available",
        onNotAvailable as (...args: unknown[]) => void
      )
      window.electron.ipcRenderer.removeListener(
        "updater:error",
        onError as (...args: unknown[]) => void
      )
      window.electron.ipcRenderer.removeListener(
        "updater:download-progress",
        onProgress as (...args: unknown[]) => void
      )
      window.electron.ipcRenderer.removeListener(
        "updater:downloaded",
        onDownloaded as (...args: unknown[]) => void
      )
    }
  }, [])

  const handleUpdateNow = async (): Promise<void> => {
    if (isDownloaded) {
      await window.electron.ipcRenderer.invoke("updater:install")
      return
    }
    setIsDownloading(true)
    setDownloadPercent(0)
    await window.electron.ipcRenderer.invoke("updater:download")
  }

  const handleRemindLater = (): void => {
    setUpdateOpen(false)
  }

  const handleImportFile = (): void => {
    if (!importedFileData) return
    const { config, name } = importedFileData
    const LS_KEY = "crosshairLibrary"
    const raw = localStorage.getItem(LS_KEY)
    const library: CrosshairLibraryItem[] = raw ? JSON.parse(raw) : []
    const item: CrosshairLibraryItem = {
      id: Math.random().toString(36).slice(2, 10),
      name: name || "Imported",
      createdAt: Date.now(),
      config
    }
    library.unshift(item)
    localStorage.setItem(LS_KEY, JSON.stringify(library))
    setImportedFileData(null)
    window.dispatchEvent(new CustomEvent("dotline-library-changed"))
    toast.success(`Imported "${item.name}" from file`)
  }

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
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
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Patch Notes for v{packageJson.version}</DialogTitle>

            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <div className="prose m-0 p-0 prose-headings:m-0 prose-headings:text-2xl prose-headings:text-primary prose-paragraph:mb-2 dark:prose-invert prose-ul:m-0 prose-li:m-0">
                <Markdown>{patchNotes}</Markdown>
              </div>
            </div>
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
      <AlertDialog
        open={importedFileData !== null}
        onOpenChange={(open) => {
          if (!open) setImportedFileData(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Crosshair File</AlertDialogTitle>
            <AlertDialogDescription>
              {importedFileData ? (
                <>
                  A crosshair configuration file was opened.
                  {importedFileData.name ? (
                    <>
                      {" "}
                      Name: <strong>{importedFileData.name}</strong>
                    </>
                  ) : null}{" "}
                  Would you like to import it into your library?
                </>
              ) : (
                "Would you like to import this crosshair configuration into your library?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setImportedFileData(null)}>
              Cancel
            </Button>
            <Button onClick={handleImportFile}>Import</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster richColors closeButton />
    </div>
  )
}

function App(): React.JSX.Element {
  const params = new URLSearchParams(window.location.search)
  const isOverlay = params.get("overlay") === "1"

  const router = useMemo(
    () =>
      createHashRouter([
        {
          path: "/",
          element: (
            <OverlayProvider>
              <CrosshairConfigProvider>
                <ErrorBoundary>
                  <Layout />
                </ErrorBoundary>
              </CrosshairConfigProvider>
            </OverlayProvider>
          ),
          children: [
            { index: true, element: <Discover /> },
            { path: "positioning", element: <Positioning /> },
            { path: "settings", element: <Settings /> },
            { path: "editor", element: <Editor /> }
          ]
        }
      ]),
    []
  )

  useEffect(() => {
    if (!isOverlay) {
      const discordRpcDisabled = localStorage.getItem("discordRpcDisabled")
      if (discordRpcDisabled !== "1" && discordRpcDisabled !== "true") {
        window.electron.ipcRenderer.invoke("start-discord-rpc").catch(() => {})
      }
    }
  }, [isOverlay])

  return isOverlay ? <Overlay /> : <RouterProvider router={router} />
}

export default App
