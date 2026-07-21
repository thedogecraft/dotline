import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { HotkeyRecorder } from "@/components/ui/hotkey-recorder"

function Settings(): React.JSX.Element {
  const [rpcEnabled, setRpcEnabled] = useState<boolean>(true)
  const [checking, setChecking] = useState(false)
  const [hotkey, setHotkey] = useState("CommandOrControl+Shift+X")
  const [gsyncCompat, setGsyncCompat] = useState<boolean>(false)
  const [autoUpdate, setAutoUpdate] = useState<boolean>(true)
  const [crash, setCrash] = useState(false)

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke("hotkey:load")
      .then(setHotkey)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const disabled = localStorage.getItem("discordRpcDisabled")
    setRpcEnabled(!(disabled === "true"))
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke("settings:get-gsync-compat")
      .then(setGsyncCompat)
      .catch(() => {})
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke("settings:get-auto-update")
      .then(setAutoUpdate)
      .catch(() => {})
  }, [])

  const handleToggleGsync = async (checked: boolean): Promise<void> => {
    setGsyncCompat(checked)
    await window.electron.ipcRenderer.invoke("settings:set-gsync-compat", checked)
    toast.success("Restart required for this change to take effect.")
  }

  const handleToggleRpc = async (checked: boolean): Promise<void> => {
    setRpcEnabled(checked)
    if (checked) {
      localStorage.removeItem("discordRpcDisabled")
      await window.electron.ipcRenderer.invoke("start-discord-rpc")
    } else {
      localStorage.setItem("discordRpcDisabled", "true")
      await window.electron.ipcRenderer.invoke("stop-discord-rpc")
    }
  }

  // const openLogs = async () => {
  //   await window.electron.ipcRenderer.invoke('app:open-logs')
  // }

  const checkForUpdates = async (): Promise<void> => {
    try {
      setChecking(true)
      const res = await window.electron.ipcRenderer.invoke("updater:check")
      if (res?.ok && !res.updateInfo) {
        toast.success("You're up to date")
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setChecking(false)
    }
  }

  if (crash) throw new Error("This is a test crash — the error boundary works!")

  return (
    <div className=" mx-auto space-y-4">
      <h1 className="text-3xl font-bold ">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Discord Rich Presence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Enable Discord RPC</Label>
            <Switch checked={rpcEnabled} onCheckedChange={(v) => handleToggleRpc(!!v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hotkey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label className="w-full">Toggle crosshair overlay</Label>
            <HotkeyRecorder
              value={hotkey}
              onChange={(newHotkey) => {
                setHotkey(newHotkey)
                window.electron.ipcRenderer.invoke("hotkey:save", newHotkey).catch(() => {})
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compatibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>G-Sync Compatibility Mode</Label>
              <p className="text-sm text-muted-foreground">
                Disables GPU acceleration to prevent G-Sync conflicts with games. Requires restart.
              </p>
            </div>
            <Switch checked={gsyncCompat} onCheckedChange={(v) => handleToggleGsync(!!v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic update checks</Label>
              <p className="text-sm text-muted-foreground">
                Check for updates on startup. Disable this to avoid the update popup.
              </p>
            </div>
            <Switch
              checked={autoUpdate}
              onCheckedChange={async (v) => {
                setAutoUpdate(!!v)
                await window.electron.ipcRenderer.invoke("settings:set-auto-update", !!v)
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Check for updates to Dotline.</p>
            </div>
            <Button variant="outline" onClick={checkForUpdates} disabled={checking}>
              {checking ? "Checking…" : "Check for updates"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Report a issue or Request a feature </Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    window.open("https://discord.com/invite/En5YJYWj3Z", "_blank")
                  } catch {
                    /* ignored */
                  }
                }}
              >
                Support (on Discord)
              </Button>
              <Button
                onClick={() => {
                  try {
                    window.open("https://github.com/Parcoil/dotline/issues/new/choose", "_blank")
                  } catch {
                    /* ignored */
                  }
                }}
              >
                Report / Request (on GitHub)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crash Test</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Trigger a test error to verify the error boundary is working.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setCrash(true)}>
            Crash the app
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
