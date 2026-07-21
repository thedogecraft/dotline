import React from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { useTheme } from "../theme-provider"

const Toaster = ({ ...props }: ToasterProps): React.JSX.Element => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
