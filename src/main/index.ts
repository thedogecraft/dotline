import { app, shell, BrowserWindow, ipcMain, screen, dialog, globalShortcut } from "electron"
import type { SaveDialogOptions, OpenDialogOptions } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import dotlinePng from "../../resources/dotline.png?asset"
import { createAppTray, notifyMinimizedToTrayOnce } from "./tray"
import "./rpc"
import { promises as fs, existsSync, readFileSync } from "fs"
import { initAutoUpdater, triggerAutoUpdateCheck } from "./updater"
import { CrosshairConfig, CrosshairStyle, defaultConfig } from "@/types/crosshair"

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error)
})

let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let currentOverlayDisplayId: number | null = null
const HOTKEY_DEFAULT = "CommandOrControl+Shift+X"
let currentHotkey = HOTKEY_DEFAULT
const hotkeyFilePath = join(app.getPath("userData"), "hotkey.json")
const settingsFilePath = join(app.getPath("userData"), "settings.json")

function readSettingsSync(): { gsyncCompat?: boolean; autoUpdate?: boolean } {
  try {
    if (existsSync(settingsFilePath)) {
      return JSON.parse(readFileSync(settingsFilePath, "utf-8"))
    }
  } catch {
    // ignore invalid settings
  }
  return {}
}

const savedSettings = readSettingsSync()
if (savedSettings.gsyncCompat) {
  app.disableHardwareAcceleration()
}

function createSettingsWindow(): void {
  settingsWindow = new BrowserWindow({
    width: 1200,
    height: 710,
    minWidth: 1200,
    minHeight: 710,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    title: "Dotline Settings",
    ...(process.platform === "linux"
      ? { icon: dotlinePng }
      : {
          icon: dotlinePng
        }),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  settingsWindow.on("ready-to-show", () => {
    settingsWindow?.show()
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    settingsWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    settingsWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

function createOverlayWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds
  currentOverlayDisplayId = primaryDisplay.id

  overlayWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    title: "Dotline Crosshair",
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    fullscreen: false,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  overlayWindow.setAlwaysOnTop(true, "screen-saver")
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  overlayWindow.webContents.on("did-finish-load", () => {
    try {
      const target = currentOverlayDisplayId
        ? screen.getAllDisplays().find((d) => d.id === currentOverlayDisplayId)
        : screen.getPrimaryDisplay()
      const b = target?.bounds ?? { x, y, width, height }
      overlayWindow?.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height })
    } catch {
      // display bounds lookup failed
    }
    overlayWindow?.setIgnoreMouseEvents(true, { forward: true })
    overlayWindow?.showInactive()
  })

  overlayWindow.on("close", (e) => {
    e.preventDefault()
    overlayWindow?.hide()
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    overlayWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}?overlay=1`)
  } else {
    overlayWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { overlay: "1" }
    })
  }

  screen.on("display-metrics-changed", () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const target = currentOverlayDisplayId
      ? screen.getAllDisplays().find((d) => d.id === currentOverlayDisplayId)
      : screen.getPrimaryDisplay()
    if (!target) return
    const { x, y, width, height } = target.bounds
    overlayWindow.setBounds({ x, y, width, height })
    if (overlayWindow.isVisible()) {
      overlayWindow.setAlwaysOnTop(true, "screen-saver")
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.parcoil.dotline")

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createSettingsWindow()
  createOverlayWindow()

  // Load hotkey from file and register global shortcut
  fs.readFile(hotkeyFilePath, "utf-8")
    .then((data) => {
      try {
        const parsed = JSON.parse(data)
        if (typeof parsed.hotkey === "string" && parsed.hotkey.length > 0) {
          currentHotkey = parsed.hotkey
        }
      } catch {
        // ignore invalid hotkey data
      }
    })
    .catch(() => {})
    .finally(() => {
      globalShortcut.register(currentHotkey, () => {
        console.log("Hotkey Pressed")
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.webContents.send("toggle-crosshair")
        }
      })
    })

  // Initialize auto updater and perform a background check
  initAutoUpdater(() => settingsWindow)
  // Delay a little to avoid stealing focus on cold start
  if (savedSettings.autoUpdate !== false) {
    setTimeout(() => {
      void triggerAutoUpdateCheck()
    }, 1500)
  }

  createAppTray({
    getMainWindow: () => settingsWindow,
    createMainWindow: () => createSettingsWindow()
  })

  checkStartupArgs()

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createSettingsWindow()
      createOverlayWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  globalShortcut.unregisterAll()
  if (process.platform !== "darwin") {
    app.quit()
  }
})

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", (_event, argv) => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      if (settingsWindow.isMinimized()) settingsWindow.restore()
      settingsWindow.focus()
    }
    const dotlineFile = argv.find((a) => a.endsWith(".dotline"))
    if (dotlineFile) handleOpenedDotlineFile(dotlineFile)
  })

  app.on("before-quit", () => {
    globalShortcut.unregisterAll()
  })
}

app.on("open-file", (_event, filePath) => {
  if (filePath.endsWith(".dotline")) {
    handleOpenedDotlineFile(filePath)
  }
})

async function handleOpenedDotlineFile(filePath: string): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return

    const allowedStyles: CrosshairStyle[] = ["classic", "dot", "circle", "x", "image"]
    const isWrapped = "config" in parsed && parsed.config && typeof parsed.config === "object"
    const source = isWrapped ? parsed.config : parsed
    const importedName: string | undefined = isWrapped ? parsed.name : undefined

    const cfg: CrosshairConfig = {
      ...defaultConfig,
      ...source,
      style: allowedStyles.includes(source.style) ? source.style : defaultConfig.style
    }

    if (
      typeof cfg.enabled !== "boolean" ||
      typeof cfg.color !== "string" ||
      typeof cfg.opacity !== "number"
    ) {
      return
    }

    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("config:opened-file", { config: cfg, name: importedName })
    }
  } catch {
    // ignore invalid files
  }
}

function checkStartupArgs(): void {
  const dotlineFile = process.argv.find((a) => a.endsWith(".dotline"))
  if (dotlineFile) {
    setTimeout(() => handleOpenedDotlineFile(dotlineFile), 500)
  }
}

// search for "frontend" in your editor to find this
// [FRONTEND] code for frontend starts here
ipcMain.on("window-control", (event, action: "minimize" | "maximize" | "close") => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return

  switch (action) {
    case "minimize":
      win.minimize()
      break
    case "maximize":
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
      break
    case "close":
      win.hide()
      notifyMinimizedToTrayOnce()
      break
    default:
      break
  }
})

ipcMain.handle("overlay:show", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setAlwaysOnTop(true, "screen-saver")
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    overlayWindow.showInactive()
  }
  return true
})

ipcMain.handle("overlay:hide", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide()
  }
  return true
})

ipcMain.handle("overlay:update-config", (_event, config: CrosshairConfig) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("overlay:config", config)
  }
  return true
})

ipcMain.handle("hotkey:save", async (_event, hotkey: string) => {
  const newHotkey = hotkey || HOTKEY_DEFAULT
  if (newHotkey !== currentHotkey) {
    globalShortcut.unregister(currentHotkey)
    globalShortcut.register(newHotkey, () => {
      console.log("Hotkey Pressed")
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send("toggle-crosshair")
      }
    })
    currentHotkey = newHotkey
  }
  await fs.writeFile(hotkeyFilePath, JSON.stringify({ hotkey: newHotkey }), "utf-8")
  return true
})

ipcMain.handle("hotkey:load", async () => {
  try {
    const data = await fs.readFile(hotkeyFilePath, "utf-8")
    const parsed = JSON.parse(data)
    if (typeof parsed.hotkey === "string" && parsed.hotkey.length > 0) {
      return parsed.hotkey
    }
  } catch {
    // ignore invalid hotkey file
  }
  return HOTKEY_DEFAULT
})

ipcMain.handle("settings:get-gsync-compat", () => {
  return savedSettings.gsyncCompat === true
})

ipcMain.handle("settings:set-gsync-compat", async (_event, value: boolean) => {
  savedSettings.gsyncCompat = value
  await fs.writeFile(settingsFilePath, JSON.stringify(savedSettings), "utf-8")
  return true
})

ipcMain.handle("settings:get-auto-update", () => {
  return savedSettings.autoUpdate !== false
})

ipcMain.handle("settings:set-auto-update", async (_event, value: boolean) => {
  savedSettings.autoUpdate = value
  await fs.writeFile(settingsFilePath, JSON.stringify(savedSettings), "utf-8")
  return true
})

ipcMain.handle("overlay:list-displays", () => {
  const displays = screen.getAllDisplays()
  const primaryId = screen.getPrimaryDisplay().id
  return displays.map((d, idx) => ({
    id: d.id,
    label: (d as Electron.Display & { label?: string }).label
      ? (d as Electron.Display & { label?: string }).label
      : `Display ${idx + 1}${d.id === primaryId ? " (Primary)" : ""}`,
    bounds: d.bounds,
    scaleFactor: d.scaleFactor
  }))
})

ipcMain.handle("overlay:set-display", (_event, displayId: number) => {
  const displays = screen.getAllDisplays()
  const target = displays.find((d) => d.id === displayId)
  if (!overlayWindow || overlayWindow.isDestroyed() || !target) return false
  const { x, y, width, height } = target.bounds
  overlayWindow.setBounds({ x, y, width, height })
  overlayWindow.setAlwaysOnTop(true, "screen-saver")
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.showInactive()
  currentOverlayDisplayId = target.id
  return true
})

ipcMain.handle("overlay:get-display", () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return null
  const bounds = overlayWindow.getBounds()
  const displays = screen.getAllDisplays()
  const target = displays.find(
    (d) =>
      d.bounds.x === bounds.x &&
      d.bounds.y === bounds.y &&
      d.bounds.width === bounds.width &&
      d.bounds.height === bounds.height
  )
  return target ? target.id : null
})

ipcMain.handle(
  "config:export",
  async (_event, data: { name: string; config: CrosshairConfig; format?: string }) => {
    const isDotline = data.format === "dotline"
    const ext = isDotline ? "dotline" : "json"
    const defaultName = data.name?.trim()
      ? `${data.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`
      : `crosshair.${ext}`
    const options: SaveDialogOptions = {
      title: "Export Crosshair Config",
      filters: [{ name: isDotline ? "Dotline Files" : "JSON Files", extensions: [ext] }],
      defaultPath: defaultName
    }
    const result = settingsWindow
      ? await dialog.showSaveDialog(settingsWindow, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return false
    await fs.writeFile(
      result.filePath,
      JSON.stringify({ name: data.name ?? "", config: data.config }, null, 2),
      "utf-8"
    )
    return true
  }
)

ipcMain.handle("config:import", async () => {
  const options: OpenDialogOptions = {
    title: "Import Crosshair Config",
    properties: ["openFile"],
    filters: [
      { name: "Crosshair Files", extensions: ["dotline", "json"] },
      { name: "Dotline Files", extensions: ["dotline"] },
      { name: "JSON Files", extensions: ["json"] }
    ]
  }

  const result = settingsWindow
    ? await dialog.showOpenDialog(settingsWindow, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) return null

  try {
    const raw = await fs.readFile(result.filePaths[0], "utf-8")
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== "object") return null

    const allowedStyles: CrosshairStyle[] = ["classic", "dot", "circle", "x", "image"]

    // Support both wrapped { name, config } and plain config formats
    const isWrapped = "config" in parsed && parsed.config && typeof parsed.config === "object"
    const source = isWrapped ? parsed.config : parsed
    const importedName = isWrapped ? parsed.name : undefined

    const cfg: CrosshairConfig = {
      ...defaultConfig,
      ...source,
      style: allowedStyles.includes(source.style) ? source.style : defaultConfig.style
    }

    if (
      typeof cfg.enabled !== "boolean" ||
      typeof cfg.color !== "string" ||
      typeof cfg.opacity !== "number"
    ) {
      return null
    }

    return { config: cfg, name: importedName }
  } catch {
    return null
  }
})
