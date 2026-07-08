import { BrowserWindow, Menu, Notification, Tray, app } from "electron"
import dotlinePng from "../../resources/dotline.png?asset"

let tray: Tray | null = null
let hasNotifiedMinimized = false

export function createAppTray(options: {
  getMainWindow: () => BrowserWindow | null
  createMainWindow: () => void
}): Tray {
  if (tray) return tray
  const trayIcon = dotlinePng as unknown as string
  tray = new Tray(trayIcon)
  tray.setToolTip("Dotline")

  const openApp = () => {
    const win = options.getMainWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    } else {
      options.createMainWindow()
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Dotline", click: openApp },
    { type: "separator" },
    { label: "Quit", click: () => app.exit(0) }
  ])
  tray.setContextMenu(contextMenu)

  tray.on("click", openApp)
  tray.on("double-click", openApp)

  return tray
}

export function notifyMinimizedToTrayOnce(): void {
  if (hasNotifiedMinimized) return
  hasNotifiedMinimized = true
  new Notification({
    title: "Dotline",
    icon: dotlinePng,
    body: "Still running in the tray. Click the tray icon to reopen.",
    silent: true
  }).show()
}
