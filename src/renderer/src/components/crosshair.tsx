import { useMemo } from "react"
import type { CrosshairConfig } from "../../../types/crosshair"

export function Crosshair({
  config,
  mode = "overlay"
}: {
  config: CrosshairConfig
  mode?: "overlay" | "embed"
}) {
  const outlineWithOpacity =
    config.outline && config.outlineColor
      ? hexToRgba(config.outlineColor, config.outlineOpacity ?? 1)
      : undefined

  const renderRect = (x: number, y: number, width: number, height: number, rotate?: number) => {
    const outlineThickness = config.outlineThickness ?? 1
    const hasOutline = config.outline && config.outlineColor

    return (
      <>
        {hasOutline && (
          <rect
            x={x - outlineThickness / 2}
            y={y - outlineThickness / 2}
            width={width + outlineThickness}
            height={height + outlineThickness}
            fill={hexToRgba(config.outlineColor!, config.outlineOpacity ?? 1)}
            transform={rotate ? `rotate(${rotate} ${center} ${center})` : undefined}
          />
        )}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={colorWithOpacity}
          transform={rotate ? `rotate(${rotate} ${center} ${center})` : undefined}
        />
      </>
    )
  }

  const style = useMemo(() => {
    const isEmbed = mode === "embed"
    const left = config.offsetX ?? 0
    const top = config.offsetY ?? 0
    return isEmbed
      ? {
          position: "absolute" as const,
          inset: 0,
          pointerEvents: "none" as const,
          background: "transparent"
        }
      : {
          position: "fixed" as const,
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none" as const,
          background: "transparent",
          transform: `translate(${left}px, ${top}px)`
        }
  }, [mode, config.offsetX, config.offsetY])

  if (!config.enabled) return null

  const colorWithOpacity = hexToRgba(config.color, config.opacity)

  // calculate center
  const size = Math.max((config.length + config.gap) * 2 + config.thickness * 2, 64)
  const center = size / 2

  const renderCenterDot = () => {
    if (!config.centerDot) return null
    const dotColor = hexToRgba(
      config.centerDotColor ?? config.color,
      config.centerDotOpacity ?? config.opacity
    )
    const dotSize = config.centerDotSize ?? Math.max(1, config.thickness / 2)

    const centerDotOutlineEnabled = !!config.centerDotOutline
    const centerDotStroke = centerDotOutlineEnabled
      ? hexToRgba(config.centerDotOutlineColor ?? "#000000", config.centerDotOutlineOpacity ?? 1)
      : undefined
    const centerDotStrokeWidth = centerDotOutlineEnabled
      ? (config.centerDotOutlineThickness ?? 1)
      : undefined

    return config.centerDotShape === "square" ? (
      <rect
        x={center - dotSize / 2}
        y={center - dotSize / 2}
        width={dotSize}
        height={dotSize}
        fill={dotColor}
        stroke={centerDotStroke}
        strokeWidth={centerDotStrokeWidth}
      />
    ) : (
      <circle
        cx={center}
        cy={center}
        r={dotSize}
        fill={dotColor}
        stroke={centerDotStroke}
        strokeWidth={centerDotStrokeWidth}
      />
    )
  }

  return (
    <div style={{ ...style, position: mode === "embed" ? "absolute" : ("fixed" as const) }}>
      <svg
        width={size}
        height={size}
        style={
          mode === "embed"
            ? {
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${config.offsetX ?? 0}px, ${config.offsetY ?? 0}px)`
              }
            : { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        {config.style === "classic" && (
          <>
            {renderRect(
              center - config.gap - config.length,
              center - config.thickness / 2,
              config.length,
              config.thickness
            )}
            {renderRect(
              center + config.gap,
              center - config.thickness / 2,
              config.length,
              config.thickness
            )}
            {renderRect(
              center - config.thickness / 2,
              center - config.gap - config.length,
              config.thickness,
              config.length
            )}
            {renderRect(
              center - config.thickness / 2,
              center + config.gap,
              config.thickness,
              config.length
            )}
          </>
        )}

        {config.style === "dot" && (
          <circle
            cx={center}
            cy={center}
            r={Math.max(1, config.thickness)}
            fill={colorWithOpacity}
            stroke={outlineWithOpacity}
            strokeWidth={config.outlineThickness ?? 1}
          />
        )}

        {config.style === "circle" && (
          <circle
            cx={center}
            cy={center}
            r={config.gap + Math.max(2, config.length)}
            stroke={colorWithOpacity}
            strokeWidth={config.thickness}
            fill="none"
          />
        )}

        {config.style === "x" && (
          <>
            {renderRect(
              center - config.thickness / 2,
              center - config.length - config.gap,
              config.thickness,
              config.length,
              45
            )}
            {renderRect(
              center - config.thickness / 2,
              center + config.gap,
              config.thickness,
              config.length,
              45
            )}
            {renderRect(
              center - config.thickness / 2,
              center - config.length - config.gap,
              config.thickness,
              config.length,
              -45
            )}
            {renderRect(
              center - config.thickness / 2,
              center + config.gap,
              config.thickness,
              config.length,
              -45
            )}
          </>
        )}

        {config.style === "image" && config.imageUrl && (
          <image
            href={config.imageUrl}
            x={center - (config.imageSize ?? 32) / 2}
            y={center - (config.imageSize ?? 32) / 2}
            width={config.imageSize ?? 32}
            height={config.imageSize ?? 32}
            opacity={config.opacity}
          />
        )}

        {renderCenterDot()}
      </svg>
    </div>
  )
}

export function CrosshairPreview({
  config,
  size = 96
}: {
  config: CrosshairConfig
  size?: number
}) {
  // Reuse renderer but constrain SVG to preview size by scaling lengths to fit
  const scale = Math.min(
    1,
    size / Math.max((config.length + config.gap) * 2 + config.thickness * 2, 64)
  )
  const scaled: CrosshairConfig = {
    ...config,
    length: Math.max(1, Math.round(config.length * scale)),
    gap: Math.max(0, Math.round(config.gap * scale)),
    thickness: Math.max(1, Math.round(config.thickness * scale))
  }
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Crosshair mode="embed" config={{ ...scaled, enabled: true }} />
    </div>
  )
}

function hexToRgba(hex: string, alpha: number) {
  const parsed = hex.replace("#", "")
  if (parsed.length !== 6) return `rgba(0, 0, 0, ${alpha})`
  const bigint = parseInt(parsed, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
