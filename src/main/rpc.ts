import { ipcMain } from "electron"
import discordRPC from "discord-rpc"
import jsonData from "../../package.json"
const clientId = "1403970186956247052"
let rpcClient: discordRPC.Client | null = null

function startDiscordRPC(): boolean {
  try {
    rpcClient = new discordRPC.Client({ transport: "ipc" })

    rpcClient.on("ready", () => {
      rpcClient.setActivity({
        details: "Aiming with precision",
        state: `Using Dotline v${jsonData.version || "0"}`,
        buttons: [
          { label: "Download Dotline", url: "https://parcoil.com/dotline" },
          { label: "Join Discord", url: "https://discord.com/invite/En5YJYWj3Z" }
        ],
        largeImageKey: "dotline2",
        largeImageText: "Dotline Crosshair Overlay",
        instance: false
      })
    })

    rpcClient.login({ clientId }).catch(console.error)
    return true
  } catch (error) {
    console.error("Failed to start Discord RPC:", error)
    return false
  }
}

function stopDiscordRPC(): boolean {
  if (rpcClient) {
    rpcClient.destroy()
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
