import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { CrosshairConfig, defaultConfig } from "../../../types/crosshair"
import { useOverlayVisibility } from "./overlay"

type CrosshairConfigContextValue = {
  config: CrosshairConfig
  setConfig: (config: CrosshairConfig) => void
  toggleEnabled: () => void
}

const CrosshairConfigContext = createContext<CrosshairConfigContextValue | undefined>(undefined)

export function CrosshairConfigProvider({ children }: { children: React.ReactNode }) {
  const overlayContext = useOverlayVisibility()
  const [config, setConfigState] = useState<CrosshairConfig>(defaultConfig)

  useEffect(() => {
    const savedRaw = localStorage.getItem("currentConfig")
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw) as Partial<CrosshairConfig>
        const merged = { ...defaultConfig, ...saved }
        setConfigState(merged)
      } catch {}
    }
  }, [])

  const setConfig = useCallback((newConfig: CrosshairConfig) => {
    setConfigState(newConfig)
    localStorage.setItem("currentConfig", JSON.stringify(newConfig))
    window.electron.ipcRenderer.invoke("overlay:update-config", newConfig).catch(() => {})
  }, [])

  const lastToggle = useRef(0)
  const toggleEnabled = useCallback(() => {
    const now = Date.now()
    if (now - lastToggle.current < 500) return
    lastToggle.current = now
    overlayContext.toggle()
  }, [overlayContext])

  const toggleEnabledRef = useRef(toggleEnabled)
  useEffect(() => {
    toggleEnabledRef.current = toggleEnabled
  }, [toggleEnabled])

  useEffect(() => {
    const listener = () => {
      toggleEnabledRef.current()
    }
    window.electron.ipcRenderer.on("toggle-crosshair", listener)
    return () => {
      window.electron.ipcRenderer.removeListener("toggle-crosshair", listener)
    }
  }, [])

  const value = React.useMemo<CrosshairConfigContextValue>(
    () => ({ config, setConfig, toggleEnabled }),
    [config, setConfig, toggleEnabled]
  )

  return <CrosshairConfigContext.Provider value={value}>{children}</CrosshairConfigContext.Provider>
}

export function useCrosshairConfig(): CrosshairConfigContextValue {
  const ctx = useContext(CrosshairConfigContext)
  if (!ctx) throw new Error("useCrosshairConfig must be used within CrosshairConfigProvider")
  return ctx
}
