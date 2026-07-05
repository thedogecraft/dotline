import { app, BrowserWindow, ipcMain } from "electron"
import { autoUpdater } from "electron-updater"

type GetMainWindow = () => BrowserWindow | null

export function initAutoUpdater(getMainWindow: GetMainWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("update-available", (info) => {
    const win = getMainWindow()
    win?.webContents.send("updater:available", {
      version: info.version,
      releaseNotes: (info.releaseNotes as any) ?? undefined
    })
  })

  autoUpdater.on("update-not-available", () => {
    const win = getMainWindow()
    win?.webContents.send("updater:not-available", { currentVersion: app.getVersion() })
  })

  autoUpdater.on("error", (err) => {
    const win = getMainWindow()
    win?.webContents.send("updater:error", { message: String(err) })
  })

  autoUpdater.on("download-progress", (progress) => {
    const win = getMainWindow()
    win?.webContents.send("updater:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on("update-downloaded", (info) => {
    const win = getMainWindow()
    win?.webContents.send("updater:downloaded", { version: info.version })
  })

  ipcMain.handle("updater:get-version", () => app.getVersion())

  ipcMain.handle("updater:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, updateInfo: result?.updateInfo ?? null }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:install", () => {
    try {
      autoUpdater.quitAndInstall(false, true)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })
}

export async function triggerAutoUpdateCheck(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates()
  } catch {}
}
