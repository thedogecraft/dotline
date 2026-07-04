import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Crosshair } from "@/components/crosshair"
import { CrosshairConfig, CrosshairLibraryItem, defaultConfig } from "@/types/crosshair"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { presets } from "@/lib/presets"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Paintbrush, Import, Save, Trash2, Pencil, Download } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"

const LS_KEY = "crosshairLibrary"

function loadLibrary(): CrosshairLibraryItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLibrary(items: CrosshairLibraryItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function Discover() {
  const navigate = useNavigate()
  const [library, setLibrary] = useState<CrosshairLibraryItem[]>([])
  const [current, setCurrent] = useState<CrosshairConfig>(defaultConfig)
  const [query, setQuery] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<null | { id: string; name: string }>(null)

  useEffect(() => {
    setLibrary(loadLibrary())
    const savedRaw = localStorage.getItem("currentConfig")
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw)
        setCurrent({ ...defaultConfig, ...saved })
      } catch {}
    }
  }, [])

  const addPresetToLibrary = (cfg: CrosshairConfig, name?: string) => {
    const item: CrosshairLibraryItem = {
      id: makeId(),
      name: name || `Crosshair ${library.length + 1}`,
      createdAt: Date.now(),
      config: cfg
    }
    const next = [item, ...library]
    setLibrary(next)
    saveLibrary(next)
    toast.success(`Preset "${item.name}" added to library`)
  }

  const applyConfig = async (cfg: CrosshairConfig) => {
    localStorage.setItem("currentConfig", JSON.stringify(cfg))
    setCurrent(cfg)
    await window.electron.ipcRenderer.invoke("overlay:update-config", cfg)
    toast.success("Crosshair applied")
  }

  const importPresetFile = async () => {
    const imported = (await window.electron.ipcRenderer.invoke(
      "config:import"
    )) as CrosshairConfig | null
    if (imported) {
      addPresetToLibrary({ ...defaultConfig, ...imported }, "Imported")
      toast.success("Preset imported successfully")
    } else {
      toast.error("Failed to import preset")
    }
  }
  const exportItem = async (item: CrosshairLibraryItem) => {
    try {
      await window.electron.ipcRenderer.invoke("config:export", item.config)
      toast.success(`Exported "${item.name}"`)
    } catch {
      toast.error("Failed to export preset")
    }
  }
  const deleteItem = (id: string) => {
    const next = library.filter((i) => i.id !== id)
    setLibrary(next)
    saveLibrary(next)
    toast.success("Preset deleted")
  }

  const saveCurrentToLibrary = () => {
    addPresetToLibrary(current, "Current Config")
    toast.success("Current config saved to library")
  }

  const editItem = (item: CrosshairLibraryItem) => {
    navigate("/editor", {
      state: { itemId: item.id, initialConfig: item.config, itemName: item.name }
    })
  }

  const scaleConfigForPreview = (cfg: CrosshairConfig, size: number): CrosshairConfig => {
    const base = Math.max((cfg.length + cfg.gap) * 2 + cfg.thickness * 2, 64)
    const scale = Math.min(1, size / base)
    return {
      ...cfg,
      enabled: true,
      length: Math.max(1, Math.round(cfg.length * scale)),
      gap: Math.max(0, Math.round(cfg.gap * scale)),
      thickness: Math.max(1, Math.round(cfg.thickness * scale))
    }
  }

  const CrosshairCard = ({
    name,
    config,
    actions,
    previewSize = 140,
    creator,
    style
  }: {
    name: string
    config: CrosshairConfig
    previewSize?: number
    creator?: string
    style?: string
    actions: React.ReactNode
  }) => (
    <Card className="group">
      <CardContent className="pt-4 space-y-2 flex flex-col items-center">
        <div
          className="rounded-md border bg-foreground/40 dark:bg-background relative flex items-center justify-center shadow-sm transition-shadow group-hover:shadow-md"
          style={{ width: previewSize, height: previewSize }}
        >
          <Crosshair mode="embed" config={scaleConfigForPreview(config, previewSize)} />
        </div>
        <p className="text-sm font-medium truncate w-full text-center">{name}</p>
        {creator && <p className="text-xs text-muted-foreground text-center">By {creator}</p>}
        {style && <p className="text-xs text-muted-foreground text-center">Type: {style}</p>}
        <div className="flex gap-2 mt-2">{actions}</div>
      </CardContent>
    </Card>
  )
  const TooltipButton = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
  const askDelete = (item: CrosshairLibraryItem) => {
    setPendingDelete({ id: item.id, name: item.name })
    setConfirmOpen(true)
  }
  const confirmDelete = () => {
    if (pendingDelete) {
      deleteItem(pendingDelete.id)
      setConfirmOpen(false)
      setPendingDelete(null)
    }
  }

  const q = query.trim().toLowerCase()
  const matches = (text?: string) => (text || "").toLowerCase().includes(q)
  const filteredLibrary = q
    ? library.filter(
        (i) => matches(i.name) || matches(i.config.creator) || matches(String(i.config.style))
      )
    : library
  const filteredPresets = q
    ? presets.filter(
        (p) => matches(p.name) || matches(p.config.creator) || matches(String(p.config.style))
      )
    : presets
  return (
    <div className="space-y-8 px-4 md:px-0 max-w-[1200px] mx-auto">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
        <div>
          <h1 className="text-3xl font-bold">Discover Crosshairs</h1>
          <p className="text-muted-foreground">Manage your saved crosshairs or explore presets</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" onClick={importPresetFile}>
            <Import className="w-4 h-4 mr-2" /> Import Preset
          </Button>
          <Button onClick={saveCurrentToLibrary}>
            <Save className="w-4 h-4 mr-2" /> Save Current
          </Button>
        </div>
      </header>

      <div className="flex gap-2 mb-2">
        <p className="text-xs text-primary">Library: {library.length} presets</p>
        <p className="text-xs text-primary">-</p>
        <p className="text-xs text-primary">Presets: {presets.length} presets</p>
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger
            value="library"
            className="dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
          >
            <Home className="w-4 h-4 mr-2" /> Library
          </TabsTrigger>

          <TabsTrigger
            value="presets"
            className="dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
          >
            <Paintbrush className="w-4 h-4 mr-2" /> Presets
          </TabsTrigger>
        </TabsList>
        <div className="flex gap-2 mb-1 mt-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library and presets..."
          />
        </div>
        <TabsContent value="library">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredLibrary.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {library.length === 0 && !q
                    ? "No saved crosshairs yet."
                    : "No matching results in your library."}
                </CardContent>
              </Card>
            ) : (
              filteredLibrary.map((item) => (
                <CrosshairCard
                  key={item.id}
                  name={item.name}
                  config={item.config}
                  actions={
                    <>
                      <Button size="sm" onClick={() => applyConfig(item.config)}>
                        Apply
                      </Button>
                      <TooltipButton label="Edit this crosshair">
                        <Button size="sm" variant="secondary" onClick={() => editItem(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipButton>
                      <TooltipButton label="Export this crosshair configuration">
                        <Button size="sm" variant="outline" onClick={() => exportItem(item)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipButton>
                      <TooltipButton label="Delete this crosshair">
                        <Button size="sm" variant="destructive" onClick={() => askDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipButton>
                    </>
                  }
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="presets">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {filteredPresets.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No matching results in presets.
                </CardContent>
              </Card>
            ) : (
              filteredPresets.map((preset) => (
                <CrosshairCard
                  key={preset.name}
                  name={preset.name}
                  config={preset.config}
                  previewSize={140}
                  creator={preset.config.creator}
                  style={preset.config.style}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPresetToLibrary(preset.config, preset.name)}
                      >
                        Import
                      </Button>
                      <Button size="sm" onClick={() => applyConfig(preset.config)}>
                        Apply
                      </Button>
                    </>
                  }
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent forceMount>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete preset?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  You are about to delete "{pendingDelete.name}" from your library. This action
                  cannot be undone.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Discover
