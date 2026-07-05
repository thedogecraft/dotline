import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useCrosshairConfig } from "@/hooks/crosshair-config"
import { HotkeyRecorder } from "@/components/ui/hotkey-recorder"

function Settings() {
  const { config, setConfig } = useCrosshairConfig()
  const [rpcEnabled, setRpcEnabled] = useState<boolean>(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const disabled = localStorage.getItem("discordRpcDisabled")
    setRpcEnabled(!(disabled === "true"))
  }, [])

  const handleToggleRpc = async (checked: boolean) => {
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

  const checkForUpdates = async () => {
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
              value={config.hotkey || "CommandOrControl+Shift+X"}
              onChange={(newHotkey) => setConfig({ ...config, hotkey: newHotkey })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Check for updates to Dotline.</p>
          </div>
          <Button variant="outline" onClick={checkForUpdates} disabled={checking}>
            {checking ? "Checking…" : "Check for updates"}
          </Button>
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
                  } catch {}
                }}
              >
                Support (on Discord)
              </Button>
              <Button
                onClick={() => {
                  try {
                    window.open("https://github.com/Parcoil/dotline/issues/new/choose", "_blank")
                  } catch {}
                }}
              >
                Report / Request (on GitHub)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Open the application logs folder.</p>
          </div>
          <Button variant="outline" onClick={openLogs}>
            Open Logs Folder
          </Button>
        </CardContent>
      </Card> */}
    </div>
  )
}

export default Settings
