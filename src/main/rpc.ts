import { ipcMain } from "electron"
import { Client, ActivityType, PresenceBuilder } from "discord-rpc-new"
import jsonData from "../../package.json"
const clientId = "1403970186956247052"
let rpcClient: Client | null = null

function startDiscordRPC(): boolean {
  try {
    rpcClient = new Client()

    const activity = new PresenceBuilder()
      .setType(ActivityType.Playing)
      .setDetails("Aiming with precision")
      .setState(`Using Dotline v${jsonData.version || "0"}`)
      .setLargeImage("dotline", "Dotline Crosshair Overlay")
      .addButton("Download Dotline", "https://parcoil.com/dotline")
      .addButton("Join Discord", "https://discord.com/invite/En5YJYWj3Z")
      .build()

    rpcClient
      .login({ clientId })
      .then(() => {
        rpcClient?.setActivity(activity)
      })
      .catch(console.error)
    return true
  } catch (error) {
    console.error("Failed to start Discord RPC:", error)
    return false
  }
}

async function stopDiscordRPC(): Promise<boolean> {
  if (rpcClient) {
    await rpcClient.destroy()
    rpcClient = null
    console.log("Discord RPC disconnected")
    return true
  }
  return false
}

ipcMain.handle("start-discord-rpc", () => {
  return startDiscordRPC()
})

ipcMain.handle("stop-discord-rpc", () => {
  return stopDiscordRPC()
})

export { startDiscordRPC, stopDiscordRPC }
