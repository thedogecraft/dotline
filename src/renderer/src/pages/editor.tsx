import { useEffect, useState, useRef, useMemo } from "react"
import { CrosshairConfig } from "../../../types/crosshair"
import type { CrosshairLibraryItem } from "../../../types/crosshair"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Slider } from "../components/ui/slider"
import { Button } from "../components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card"
import { defaultConfig } from "../../../types/crosshair"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select"
import { Crosshair } from "@/components/crosshair"
import { ColorPicker } from "@/components/ui/color-picker"
import { useLocation, useBlocker } from "react-router"
import { toast } from "sonner"
import { useCrosshairConfig } from "@/hooks/crosshair-config"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from "@/components/ui/alert-dialog"
import { Moon, Sun, Plus, Pencil } from "lucide-react"

const LS_KEY = "crosshairLibrary"

function loadLibrary(): CrosshairLibraryItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveLibrary(items: CrosshairLibraryItem[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

type PendingAction = "navigate" | "create-new" | "edit" | null

function Editor(): React.JSX.Element {
  const location = useLocation()
  type EditorNavState = { initialConfig?: CrosshairConfig; itemId?: string; itemName?: string }
  const state = (location.state ?? {}) as EditorNavState
  const navInitial = state.initialConfig
  const { config, setConfig } = useCrosshairConfig()

  const [editingItemId, setEditingItemId] = useState<string | undefined>(state.itemId)
  const [editingItemName, setEditingItemName] = useState<string | undefined>(state.itemName)
  const editingExisting = !!editingItemId

  const [saveName, setSaveName] = useState<string>(state.itemName ?? "")
  const [previewDark, setPreviewDark] = useState(
    () => localStorage.getItem("previewDark") === "true"
  )
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportName, setExportName] = useState("")
  const [exportFormat, setExportFormat] = useState<"dotline" | "json">("dotline")

  const baselineConfig = useRef<string>(JSON.stringify(config))
  const dirty = useMemo(() => JSON.stringify(config) !== baselineConfig.current, [config])

  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)
  const [library, setLibrary] = useState<CrosshairLibraryItem[]>([])

  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (blocker.state === "blocked") {
      setPendingAction("navigate")
      setUnsavedDialogOpen(true)
    }
  }, [blocker.state])

  useEffect(() => {
    if (navInitial) {
      const savedRaw = localStorage.getItem("currentConfig")
      let currentConfig = defaultConfig
      if (savedRaw) {
        try {
          currentConfig = { ...defaultConfig, ...JSON.parse(savedRaw) }
        } catch {
          /* ignored */
        }
      }
      const newOffsetX = navInitial.offsetX ?? currentConfig.offsetX
      const newOffsetY = navInitial.offsetY ?? currentConfig.offsetY
      const offsetChanged =
        (newOffsetX ?? 0) !== (currentConfig.offsetX ?? 0) ||
        (newOffsetY ?? 0) !== (currentConfig.offsetY ?? 0)

      setConfig(navInitial)
      baselineConfig.current = JSON.stringify(navInitial)

      if (offsetChanged) {
        toast.success(`Crosshair changed offset — X: ${newOffsetX ?? 0}, Y: ${newOffsetY ?? 0}`)
      }
    }
  }, [navInitial, setConfig])

  useEffect(() => {
    if (editingItemName) {
      setSaveName(editingItemName)
    }
  }, [editingItemName])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (dirty) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const handleChange = <K extends keyof CrosshairConfig>(
    key: K,
    value: CrosshairConfig[K]
  ): void => {
    setConfig({ ...config, [key]: value })
  }

  const save = async (): Promise<void> => {
    toast.success("Applied current config")
  }

  const saveOverwriteOrNew = (): void => {
    if (editingExisting && editingItemId) {
      const lib = loadLibrary()
      const idx = lib.findIndex((i) => i.id === editingItemId)
      if (idx !== -1) {
        const updatedName = saveName.trim() || editingItemName || lib[idx].name
        lib[idx] = { ...lib[idx], name: updatedName, config }
        saveLibrary(lib)
        toast.success(`Saved to "${updatedName}"`)
        baselineConfig.current = JSON.stringify(config)
        return
      }
    }
    const lib = loadLibrary()
    const item: CrosshairLibraryItem = {
      id: makeId(),
      name: saveName && saveName.trim() ? saveName.trim() : `Crosshair ${lib.length + 1}`,
      createdAt: Date.now(),
      config
    }
    const next = [item, ...lib]
    saveLibrary(next)
    setSaveName("")
    toast.success(`Saved "${item.name}" to library`)
    baselineConfig.current = JSON.stringify(config)
  }

  const handleExport = async (): Promise<void> => {
    const name = exportName.trim() || editingItemName || "Crosshair"
    try {
      await window.electron.ipcRenderer.invoke("config:export", {
        name,
        config,
        format: exportFormat
      })
      toast.success(`Exported current config as .${exportFormat}`)
      setExportDialogOpen(false)
    } catch {
      toast.error("Failed to export config")
    }
  }

  const handleExportClick = (): void => {
    setExportName(editingItemName || saveName || "")
    setExportDialogOpen(true)
  }

  const handleImport = async (): Promise<void> => {
    const imported = await window.electron.ipcRenderer.invoke("config:import")
    if (imported) {
      const importedRecord = imported as Record<string, unknown>
      const cfg = (importedRecord.config as CrosshairConfig) ?? imported
      const name = importedRecord.name as string | undefined

      const savedRaw = localStorage.getItem("currentConfig")
      let currentConfig = defaultConfig
      if (savedRaw) {
        try {
          currentConfig = { ...defaultConfig, ...JSON.parse(savedRaw) }
        } catch {
          /* ignored */
        }
      }
      const newOffsetX = cfg.offsetX ?? currentConfig.offsetX
      const newOffsetY = cfg.offsetY ?? currentConfig.offsetY
      const offsetChanged =
        (newOffsetX ?? 0) !== (currentConfig.offsetX ?? 0) ||
        (newOffsetY ?? 0) !== (currentConfig.offsetY ?? 0)

      setConfig(cfg)
      baselineConfig.current = JSON.stringify(cfg)
      if (name) setSaveName(name)

      if (offsetChanged) {
        toast.success(
          `Crosshair imported — offset changed to X: ${newOffsetX ?? 0}, Y: ${newOffsetY ?? 0}`
        )
      } else {
        toast.success("Imported config successfully")
      }
    } else {
      toast.error("Import cancelled or failed")
    }
  }

  const saveToLibrary = (): void => {
    const lib = loadLibrary()
    const item: CrosshairLibraryItem = {
      id: makeId(),
      name: saveName && saveName.trim() ? saveName.trim() : `Crosshair ${lib.length + 1}`,
      createdAt: Date.now(),
      config
    }
    const next = [item, ...lib]
    saveLibrary(next)
    setSaveName("")
    toast.success(`Saved "${item.name}" to library`)
    baselineConfig.current = JSON.stringify(config)
  }

  const scaleConfigForPreview = (cfg: CrosshairConfig, size: number): CrosshairConfig => {
    const base =
      cfg.style === "image"
        ? Math.max(cfg.imageSize ?? 32, 64)
        : Math.max((cfg.length + cfg.gap) * 2 + cfg.thickness * 2, 64)
    const scale = Math.min(1, size / base)
    return {
      ...cfg,
      enabled: true,
      ...(cfg.style === "image"
        ? { imageSize: Math.max(1, Math.round((cfg.imageSize ?? 32) * scale)) }
        : {
            length: Math.max(1, Math.round(cfg.length * scale)),
            gap: Math.max(0, Math.round(cfg.gap * scale)),
            thickness: Math.max(1, Math.round(cfg.thickness * scale))
          })
    }
  }

  const executePendingAction = (): void => {
    const action = pendingAction
    setPendingAction(null)

    switch (action) {
      case "navigate":
        if (blocker.state === "blocked") {
          blocker.proceed?.()
        }
        break
      case "create-new":
        setConfig(defaultConfig)
        baselineConfig.current = JSON.stringify(defaultConfig)
        setSaveName("")
        setEditingItemId(undefined)
        setEditingItemName(undefined)
        toast.success("Started new crosshair")
        break
      case "edit":
        setLibrary(loadLibrary())
        setLibraryPickerOpen(true)
        break
    }
  }

  const handleUnsavedSave = (): void => {
    saveOverwriteOrNew()
    setUnsavedDialogOpen(false)
    executePendingAction()
  }

  const handleUnsavedDiscard = (): void => {
    setUnsavedDialogOpen(false)
    executePendingAction()
  }

  const handleUnsavedCancel = (): void => {
    setUnsavedDialogOpen(false)
    setPendingAction(null)
    if (blocker.state === "blocked") {
      blocker.reset?.()
    }
  }

  const handleCreateNew = (): void => {
    if (dirty) {
      setPendingAction("create-new")
      setUnsavedDialogOpen(true)
    } else {
      setConfig(defaultConfig)
      baselineConfig.current = JSON.stringify(defaultConfig)
      setSaveName("")
      setEditingItemId(undefined)
      setEditingItemName(undefined)
      toast.success("Started new crosshair")
    }
  }

  const handleEditClick = (): void => {
    if (dirty) {
      setPendingAction("edit")
      setUnsavedDialogOpen(true)
    } else {
      setLibrary(loadLibrary())
      setLibraryPickerOpen(true)
    }
  }

  const handleLibraryPick = (item: CrosshairLibraryItem): void => {
    setLibraryPickerOpen(false)
    setConfig(item.config)
    baselineConfig.current = JSON.stringify(item.config)
    setEditingItemId(item.id)
    setEditingItemName(item.name)
    setSaveName(item.name)
    toast.success(`Editing "${item.name}"`)
  }

  const unsavedDialogTitle = useMemo(() => {
    switch (pendingAction) {
      case "create-new":
        return "Unsaved Changes"
      case "edit":
        return "Unsaved Changes"
      case "navigate":
        return "Leave Editor?"
      default:
        return "Unsaved Changes"
    }
  }, [pendingAction])

  const unsavedDialogDescription = useMemo(() => {
    switch (pendingAction) {
      case "create-new":
        return "You have unsaved changes. Do you want to save before creating a new crosshair?"
      case "edit":
        return "You have unsaved changes. Do you want to save before editing a different crosshair?"
      case "navigate":
        return "You have unsaved changes that will be lost if you leave the editor."
      default:
        return "You have unsaved changes."
    }
  }, [pendingAction])

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold ">Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {editingExisting
              ? `Editing: ${editingItemName ?? "Saved crosshair"}`
              : "Creating: New crosshair"}
            {dirty && <span className="ml-2 text-yellow-500">(unsaved)</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create New
          </Button>
          <Button variant="outline" onClick={handleEditClick}>
            <Pencil className="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          <div className="w-px bg-border" />
          <Button variant="outline" onClick={() => setConfig(defaultConfig)}>
            Reset
          </Button>
          <Button onClick={save}>Apply to Current</Button>
          <Button variant="outline" onClick={saveOverwriteOrNew}>
            {editingExisting ? `Update "${saveName.trim() || editingItemName}"` : "Save to library"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 lg:sticky lg:top-4 lg:self-start">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = !previewDark
                    setPreviewDark(next)
                    localStorage.setItem("previewDark", String(next))
                  }}
                  title={previewDark ? "Switch to light background" : "Switch to dark background"}
                >
                  {previewDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div
                  className={`rounded-md border relative flex items-center justify-center ${previewDark ? "bg-neutral-900" : "bg-white"}`}
                  style={{ width: 320, height: 320 }}
                >
                  <Crosshair mode="embed" config={scaleConfigForPreview(config, 300)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 flex gap-2 justify-center items-center">
            <Button onClick={handleImport} variant="outline" size="sm">
              Import
            </Button>
            <Button onClick={handleExportClick} variant="outline" size="sm">
              Export
            </Button>
            <Button onClick={save} size="sm">
              Apply to Current
            </Button>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{editingExisting ? "Name & Save" : "Save to Library"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={editingExisting ? "Rename crosshair" : "Give your crosshair a name"}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <Button onClick={saveToLibrary}>{editingExisting ? "Save as New" : "Save"}</Button>
              </div>
              {editingExisting && (
                <p className="text-xs text-muted-foreground">
                  Change the name above and click <strong>Update</strong> in the header to save, or
                  click <strong>Save as New</strong> to create a copy.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-4 overflow-y-auto max-h-screen pr-2">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label>Style</Label>
                <Select
                  value={config.style}
                  onValueChange={(v) => handleChange("style", v as CrosshairConfig["style"])}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="dot">Dot</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="x">X</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color-picker">Color</Label>
                <ColorPicker
                  value={config.color}
                  onChange={(value) => handleChange("color", value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {config.style === "image" && (
            <Card>
              <CardHeader>
                <CardTitle>Image Settings (URL Recommended)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="image-url">Image URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="image-url"
                      type="text"
                      value={config.imageUrl ?? ""}
                      onChange={(e) => handleChange("imageUrl", e.target.value)}
                      placeholder="Enter image URL or upload"
                      className="flex-1"
                    />
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string
                            handleChange("imageUrl", base64)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("image-upload")?.click()}
                    >
                      Upload
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: Image URLs are recommended for better performance. Uploading will make the
                    file bigger and slower to load. Use image URLs when possible.
                  </p>
                </div>
                <div className="gap-3 flex flex-col">
                  <div className="flex justify-between">
                    <Label>Image Scale</Label>
                    <span className="text-sm text-muted-foreground">{config.imageSize ?? 32}</span>
                  </div>
                  <Slider
                    value={[config.imageSize ?? 32]}
                    onValueChange={(val) => handleChange("imageSize", val[0])}
                    min={8}
                    max={512}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="gap-3 flex flex-col">
                <div className="flex justify-between">
                  <Label>Opacity</Label>
                  <span className="text-sm text-muted-foreground">{config.opacity.toFixed(2)}</span>
                </div>
                <Slider
                  value={[config.opacity]}
                  onValueChange={(val) => handleChange("opacity", val[0])}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>

              <div className="gap-3 flex flex-col">
                <div className="flex justify-between">
                  <Label>Thickness</Label>
                  <span className="text-sm text-muted-foreground">{config.thickness}</span>
                </div>
                <Slider
                  value={[config.thickness]}
                  onValueChange={(val) => handleChange("thickness", val[0])}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="gap-3 flex flex-col">
                <div className="flex justify-between">
                  <Label>Length</Label>
                  <span className="text-sm text-muted-foreground">{config.length}</span>
                </div>
                <Slider
                  value={[config.length]}
                  onValueChange={(val) => handleChange("length", val[0])}
                  min={2}
                  max={50}
                  step={1}
                />
              </div>

              <div className="gap-3 flex flex-col">
                <div className="flex justify-between">
                  <Label>Gap</Label>
                  <span className="text-sm text-muted-foreground">{config.gap}</span>
                </div>
                <Slider
                  value={[config.gap]}
                  onValueChange={(val) => handleChange("gap", val[0])}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
              <div className="gap-3 flex flex-col">
                <div className="flex justify-between">
                  <Label>Rotation</Label>
                  <span className="text-sm text-muted-foreground">{config.rotation ?? 0}°</span>
                </div>
                <Slider
                  value={[config.rotation ?? 0]}
                  onValueChange={(val) => handleChange("rotation", val[0])}
                  min={0}
                  max={360}
                  step={1}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Outline</Label>
                <Switch
                  checked={config.outline ?? false}
                  onCheckedChange={(checked) => {
                    const next = { ...config, outline: !!checked }
                    if (checked) {
                      if (!next.outlineColor) next.outlineColor = "#000000"
                      if (next.outlineThickness == null) next.outlineThickness = 1
                      if (next.outlineOpacity == null) next.outlineOpacity = 1
                    }
                    setConfig(next)
                  }}
                />
              </div>

              {config.outline && (
                <>
                  <div>
                    <Label>Outline Color</Label>
                    <ColorPicker
                      value={config.outlineColor ?? "#000000"}
                      onChange={(value) => handleChange("outlineColor", value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="gap-3 flex flex-col">
                    <div className="flex justify-between">
                      <Label>Outline Thickness</Label>
                      <span className="text-sm text-muted-foreground">
                        {config.outlineThickness ?? 1}
                      </span>
                    </div>
                    <Slider
                      value={[config.outlineThickness ?? 1]}
                      onValueChange={(val) => handleChange("outlineThickness", val[0])}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>

                  <div className="gap-3 flex flex-col">
                    <div className="flex justify-between">
                      <Label>Outline Opacity</Label>
                      <span className="text-sm text-muted-foreground">
                        {config.outlineOpacity ?? 1}
                      </span>
                    </div>
                    <Slider
                      value={[config.outlineOpacity ?? 1]}
                      onValueChange={(val) => handleChange("outlineOpacity", val[0])}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <Label>Center Dot</Label>
                <Switch
                  checked={config.centerDot}
                  onCheckedChange={(checked) => handleChange("centerDot", !!checked)}
                />
              </div>
              {config.centerDot && (
                <>
                  <div className="gap-3 flex flex-col">
                    <div className="flex justify-between">
                      <Label>Center Dot Size</Label>
                      <span className="text-sm text-muted-foreground">
                        {config.centerDotSize ?? Math.max(1, config.thickness / 2)}
                      </span>
                    </div>
                    <Slider
                      value={[config.centerDotSize ?? Math.max(1, config.thickness / 2)]}
                      onValueChange={(val) => handleChange("centerDotSize", val[0])}
                      min={1}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div>
                    <Label>Center Dot Color</Label>
                    <ColorPicker
                      value={config.centerDotColor ?? config.color}
                      onChange={(value) => handleChange("centerDotColor", value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="gap-3 flex flex-col">
                    <div className="flex justify-between">
                      <Label>Center Dot Opacity</Label>
                      <span className="text-sm text-muted-foreground">
                        {(config.centerDotOpacity ?? config.opacity).toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[config.centerDotOpacity ?? config.opacity]}
                      onValueChange={(val) => handleChange("centerDotOpacity", val[0])}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Center Dot Shape</Label>
                    <Select
                      value={config.centerDotShape ?? "circle"}
                      onValueChange={(v) =>
                        handleChange("centerDotShape", v as "circle" | "square")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Center Dot Outline</Label>
                    <Switch
                      checked={!!config.centerDotOutline}
                      onCheckedChange={(checked) => {
                        const next = { ...config, centerDotOutline: !!checked }
                        if (checked) {
                          if (!next.centerDotOutlineColor) next.centerDotOutlineColor = "#000000"
                          if (next.centerDotOutlineThickness == null)
                            next.centerDotOutlineThickness = 1
                          if (next.centerDotOutlineOpacity == null) next.centerDotOutlineOpacity = 1
                        }
                        setConfig(next)
                      }}
                    />
                  </div>

                  {config.centerDotOutline && (
                    <>
                      <div>
                        <Label>Center Dot Outline Color</Label>
                        <ColorPicker
                          value={config.centerDotOutlineColor ?? "#000000"}
                          onChange={(value) => handleChange("centerDotOutlineColor", value)}
                          className="mt-1"
                        />
                      </div>

                      <div className="gap-3 flex flex-col">
                        <div className="flex justify-between">
                          <Label>Center Dot Outline Thickness</Label>
                          <span className="text-sm text-muted-foreground">
                            {config.centerDotOutlineThickness ?? 1}
                          </span>
                        </div>
                        <Slider
                          value={[config.centerDotOutlineThickness ?? 1]}
                          onValueChange={(val) => handleChange("centerDotOutlineThickness", val[0])}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>

                      <div className="gap-3 flex flex-col">
                        <div className="flex justify-between">
                          <Label>Center Dot Outline Opacity</Label>
                          <span className="text-sm text-muted-foreground">
                            {(config.centerDotOutlineOpacity ?? 1).toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          value={[config.centerDotOutlineOpacity ?? 1]}
                          onValueChange={(val) => handleChange("centerDotOutlineOpacity", val[0])}
                          min={0}
                          max={1}
                          step={0.01}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Positioning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editor-offsetX">Offset X (px)</Label>
                  <Input
                    id="editor-offsetX"
                    type="number"
                    value={config.offsetX ?? 0}
                    onChange={(e) => handleChange("offsetX", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editor-offsetY">Offset Y (px)</Label>
                  <Input
                    id="editor-offsetY"
                    type="number"
                    value={config.offsetY ?? 0}
                    onChange={(e) => handleChange("offsetY", Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Crosshair</DialogTitle>
            <DialogDescription>Give your crosshair a name and choose a format.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Crosshair name"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleExport()
            }}
          />
          <div className="flex gap-3 mt-2">
            <Button
              variant={exportFormat === "dotline" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setExportFormat("dotline")}
            >
              .dotline <span className="text-xs ml-1 opacity-70">(recommended)</span>
            </Button>
            <Button
              variant={exportFormat === "json" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setExportFormat("json")}
            >
              .json
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>Export as .{exportFormat}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{unsavedDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{unsavedDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleUnsavedCancel}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleUnsavedDiscard}>
              Don&apos;t Save
            </Button>
            <Button onClick={handleUnsavedSave}>Save</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={libraryPickerOpen} onOpenChange={setLibraryPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Crosshair</DialogTitle>
            <DialogDescription>Select a crosshair from your library to edit.</DialogDescription>
          </DialogHeader>
          {library.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">Your library is empty.</p>
              <p className="text-xs mt-1">Save a crosshair first, then come back to edit it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
              {library.map((item) => (
                <button
                  key={item.id}
                  className="group flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent cursor-pointer"
                  onClick={() => handleLibraryPick(item)}
                >
                  <div
                    className="rounded-md border bg-foreground/40 dark:bg-background relative flex items-center justify-center"
                    style={{ width: 100, height: 100 }}
                  >
                    <Crosshair mode="embed" config={scaleConfigForPreview(item.config, 90)} />
                  </div>
                  <p className="text-xs font-medium truncate w-full text-center">{item.name}</p>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLibraryPickerOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Editor
