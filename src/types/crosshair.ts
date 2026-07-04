export type CrosshairStyle = "classic" | "dot" | "circle" | "x" | "image"

export type CrosshairConfig = {
  enabled: boolean
  style: CrosshairStyle
  color: string
  opacity: number
  thickness: number
  length: number
  gap: number
  centerDot?: boolean
  centerDotSize?: number
  centerDotOpacity?: number
  centerDotThickness?: number
  centerDotColor?: string
  centerDotShape?: "circle" | "square"
  centerDotOutline?: boolean
  centerDotOutlineColor?: string
  centerDotOutlineThickness?: number
  centerDotOutlineOpacity?: number
  outline?: boolean
  outlineColor?: string
  outlineThickness?: number
  outlineOpacity?: number
  creator?: string
  overlayDisplayId?: number
  offsetX?: number
  offsetY?: number
  imageUrl?: string
  imageSize?: number
  hotkey?: string
}

export type CrosshairLibraryItem = {
  id: string
  name: string
  createdAt: number
  config: CrosshairConfig
}
export const defaultConfig: CrosshairConfig = {
  enabled: true,
  style: "classic",
  color: "#22C55E",
  opacity: 1,
  thickness: 2,
  length: 5,
  gap: 0,
  centerDot: false,
  imageUrl: "",
  imageSize: 32,
  hotkey: "CommandOrControl+Shift+X"
}
