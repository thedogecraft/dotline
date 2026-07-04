import { app, shell, BrowserWindow, ipcMain, screen, dialog, globalShortcut } from "electron"
import type { SaveDialogOptions, OpenDialogOptions } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import dotlinePng from "../../resources/dotline.png?asset"
import { createAppTray, notifyMinimizedToTrayOnce } from "./tray"
import "./rpc"
import { promises as fs } from "fs"
import { initAutoUpdater, triggerAutoUpdateCheck } from "./updater"
import { CrosshairConfig, CrosshairStyle, defaultConfig } from "@/types/crosshair"

let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let currentOverlayDisplayId: number | null = null
let currentHotkey = "CommandOrControl+Shift+X"

function createSettingsWindow(): void {
  settingsWindow = new BrowserWindow({
    width: 1200,
    height: 710,
    minWidth: 1200,
    minHeight: 710,
    show: false,
    frame: false,
    autoHideMenuBar: true,
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
    } catch {}
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
    if (!overlayWindow) return
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

  // Register global shortcut to toggle crosshair
  globalShortcut.register(currentHotkey, () => {
    console.log("Hotkey Pressed")
    settingsWindow?.webContents.send("toggle-crosshair")
  })

  // Initialize auto updater and perform a background check
  initAutoUpdater(() => settingsWindow)
  // Delay a little to avoid stealing focus on cold start
  setTimeout(() => {
    void triggerAutoUpdateCheck()
  }, 1500)

  createAppTray({
    getMainWindow: () => settingsWindow,
    createMainWindow: () => createSettingsWindow()
  })

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
  app.on("second-instance", () => {
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore()
      settingsWindow.focus()
    }
  })

  app.on("before-quit", () => {
    globalShortcut.unregisterAll()
  })
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
  overlayWindow?.setAlwaysOnTop(true, "screen-saver")
  overlayWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow?.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow?.showInactive()
  return true
})

ipcMain.handle("overlay:hide", () => {
  overlayWindow?.hide()
  return true
})

ipcMain.handle("overlay:update-config", (_event, config: CrosshairConfig) => {
  overlayWindow?.webContents.send("overlay:config", config)
  const newHotkey = config.hotkey || "CommandOrControl+Shift+X"
  if (newHotkey !== currentHotkey) {
    globalShortcut.unregister(currentHotkey)
    globalShortcut.register(newHotkey, () => {
      console.log("Hotkey Pressed")
      settingsWindow?.webContents.send("toggle-crosshair")
    })
    currentHotkey = newHotkey
  }
  return true
})

ipcMain.handle("overlay:list-displays", () => {
  const displays = screen.getAllDisplays()
  const primaryId = screen.getPrimaryDisplay().id
  return displays.map((d, idx) => ({
    id: d.id,
    label: (d as any).label
      ? (d as any).label
      : `Display ${idx + 1}${d.id === primaryId ? " (Primary)" : ""}`,
    bounds: d.bounds,
    scaleFactor: d.scaleFactor
  }))
})

ipcMain.handle("overlay:set-display", (_event, displayId: number) => {
  const displays = screen.getAllDisplays()
  const target = displays.find((d) => d.id === displayId)
  if (!overlayWindow || !target) return false
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
  if (!overlayWindow) return null
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

ipcMain.handle("config:export", async (_event, config: CrosshairConfig) => {
  const options: SaveDialogOptions = {
    title: "Export Crosshair Config",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    defaultPath: "crosshair.json"
  }
  const result = settingsWindow
    ? await dialog.showSaveDialog(settingsWindow, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return false
  await fs.writeFile(result.filePath, JSON.stringify(config, null, 2), "utf-8")
  return true
})

ipcMain.handle("config:import", async () => {
  const options: OpenDialogOptions = {
    title: "Import Crosshair Config",
    properties: ["openFile"],
    filters: [{ name: "JSON Files", extensions: ["json"] }]
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

    const cfg: CrosshairConfig = {
      ...defaultConfig,
      ...parsed,
      style: allowedStyles.includes(parsed.style) ? parsed.style : defaultConfig.style
    }

    if (
      typeof cfg.enabled !== "boolean" ||
      typeof cfg.color !== "string" ||
      typeof cfg.opacity !== "number"
    ) {
      return null
    }

    return cfg
  } catch {
    return null
  }
})
