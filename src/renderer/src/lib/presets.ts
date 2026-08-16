import type { CrosshairConfig } from "@/types/crosshair"
import { defaultConfig } from "@/types/crosshair"

// this is where u can define presets
// if u do add your own preset be sure to have your github username to the creator field
// more customization features are coming soon
// a better way of adding ur own will be coming soon
// take a look at the editor inside of dotline or take a look at `/src/types/crosshair.ts` for more info

export const presets: { name: string; config: CrosshairConfig }[] = [
  {
    name: "Green Classic",
    config: { ...defaultConfig, style: "classic", color: "#22C55E", creator: "Parcoil" }
  },
  {
    name: "Tiny Dot",
    config: {
      ...defaultConfig,
      style: "dot",
      thickness: 2,
      color: "#ffffff",
      creator: "Parcoil",
      outline: true,
      outlineColor: "#000",
      outlineThickness: 1.5,
      outlineOpacity: 1
    }
  },
  {
    name: "Compact Red",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#ff0000",
      thickness: 2,
      length: 6,
      gap: 4,
      creator: "Parcoil"
    }
  },
  {
    name: "Tactical Orange",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#ff6f00",
      thickness: 2,
      length: 5,
      gap: 3,
      creator: "Parcoil"
    }
  },
  {
    name: "Ultra Thin Blue",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#00bfff",
      thickness: 1,
      length: 5,
      gap: 0,
      creator: "Parcoil"
    }
  },
  {
    name: "Minimal Gray",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#cccccc",
      thickness: 1,
      length: 4,
      gap: 1,
      opacity: 0.5,
      centerDot: false,
      outline: false,
      creator: "Parcoil"
    }
  },

  {
    name: "X Neon",
    config: {
      ...defaultConfig,
      style: "x",
      color: "#00e5ff",
      thickness: 2,
      gap: 3,
      creator: "Parcoil"
    }
  },
  {
    name: "Sniper Blue",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#00bfff",
      thickness: 1,
      length: 12,
      gap: 20,
      opacity: 0.8,
      centerDot: true,
      centerDotSize: 3,
      centerDotColor: "#00bfff",
      creator: "Parcoil"
    }
  },
  {
    name: "Blood Red",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#ff1e1e",
      length: 15,
      gap: 3,
      creator: "Parcoil"
    }
  },
  {
    name: "Sniper Thin",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#ffffff",
      thickness: 1,
      gap: 0,
      length: 20,
      creator: "Parcoil"
    }
  },
  {
    name: "Pink Pixel",
    config: { ...defaultConfig, style: "dot", color: "#ff4fd8", thickness: 1, creator: "Parcoil" }
  },

  {
    name: "Minimal Green",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#00ff88",
      thickness: 1,
      length: 8,
      gap: 5,
      creator: "Parcoil"
    }
  },
  {
    name: "Heavy Cross",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#ff9900",
      thickness: 4,
      length: 10,
      gap: 2,
      creator: "Parcoil"
    }
  },
  {
    name: "Sharp Purple",
    config: {
      ...defaultConfig,
      style: "x",
      color: "#a855f7",
      thickness: 2,
      gap: 2,
      length: 14,
      creator: "Parcoil"
    }
  },
  {
    name: "White Gapless",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#ffffff",
      thickness: 2,
      length: 10,
      gap: 0,
      creator: "Parcoil"
    }
  },
  {
    name: "Neon Pink Dot",
    config: { ...defaultConfig, style: "dot", color: "#ff2ec4", thickness: 3, creator: "Parcoil" }
  },
  {
    name: "Tiny Hollow Cross Green",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#00ff00",
      thickness: 2,
      length: 3,
      gap: 1,
      opacity: 1,
      creator: "FuelClock"
    }
  },
  {
    name: "Tiny Hollow Cross Pink",
    config: {
      ...defaultConfig,
      style: "classic",
      color: "#c800ff",
      thickness: 2,
      length: 3,
      gap: 1,
      opacity: 1,
      creator: "FuelClock"
    }
  },
  {
    name: "Cyan T Reticle",
    config: {
      ...defaultConfig,
      style: "t",
      color: "#22d3ee",
      thickness: 2,
      length: 6,
      gap: 3,
      creator: "Parcoil"
    }
  },
  {
    name: "Silver Chevron",
    config: {
      ...defaultConfig,
      style: "chevron",
      color: "#e5e7eb",
      thickness: 3,
      length: 10,
      gap: 0,
      outline: true,
      outlineColor: "#000000",
      outlineThickness: 1,
      outlineOpacity: 1,
      creator: "Parcoil"
    }
  },
  {
    name: "Red Square",
    config: {
      ...defaultConfig,
      style: "square",
      color: "#ef4444",
      thickness: 2,
      gap: 4,
      creator: "Parcoil"
    }
  }
]
