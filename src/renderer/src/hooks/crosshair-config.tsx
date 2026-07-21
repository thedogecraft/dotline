import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { CrosshairConfig, defaultConfig } from "../../../types/crosshair"
import { useOverlayVisibility } from "./overlay"

type CrosshairConfigContextValue = {
  config: CrosshairConfig
  setConfig: (config: CrosshairConfig) => void
  toggleEnabled: () => void
}

const CrosshairConfigContext = createContext<CrosshairConfigContextValue | undefined>(undefined)

export function CrosshairConfigProvider({
  children
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const overlayContext = useOverlayVisibility()
  const [config, setConfigState] = useState<CrosshairConfig>(defaultConfig)
  const configRef = useRef(config)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    const savedRaw = localStorage.getItem("currentConfig")
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw) as Partial<CrosshairConfig>
        const merged = { ...defaultConfig, ...saved }
        setConfigState(merged)
      } catch {
        /* ignored */
      }
    }
  }, [])

  const setConfig = useCallback((newConfig: CrosshairConfig) => {
    const prev = configRef.current
    const merged = {
      ...newConfig,
      offsetX: newConfig.offsetX ?? prev.offsetX,
      offsetY: newConfig.offsetY ?? prev.offsetY,
      overlayDisplayId: newConfig.overlayDisplayId ?? prev.overlayDisplayId
    }
    setConfigState(merged)
    localStorage.setItem("currentConfig", JSON.stringify(merged))
    window.electron.ipcRenderer.invoke("overlay:update-config", merged).catch(() => {})
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
    const listener = (): void => {
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

// eslint-disable-next-line react-refresh/only-export-components
export function useCrosshairConfig(): CrosshairConfigContextValue {
  const ctx = useContext(CrosshairConfigContext)
  if (!ctx) throw new Error("useCrosshairConfig must be used within CrosshairConfigProvider")
  return ctx
}
