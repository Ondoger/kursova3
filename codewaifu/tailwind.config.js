/** @type {import('tailwindcss').Config} */
/*
 * GitHub-native dark palette (2019-2020 era).
 * The legacy "jp-*" / "neon-*" tokens are kept as aliases that now point
 * at the GitHub palette so existing className="text-jp-sakura" etc. just
 * renders in the new theme without touching every component.
 */
const GH = {
  canvas: "#0d1117",
  canvasInset: "#010409",
  canvasSubtle: "#161b22",
  canvasOverlay: "#1c2128",
  borderDefault: "#30363d",
  borderMuted: "#21262d",
  fgDefault: "#c9d1d9",
  fgMuted: "#8b949e",
  fgSubtle: "#6e7681",
  accent: "#58a6ff",
  accentEmphasis: "#1f6feb",
  success: "#3fb950",
  attention: "#d29922",
  danger: "#f85149",
  done: "#a371f7",
};

const SYS_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
const MONO_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          900: GH.canvas,
          800: GH.canvasInset,
          700: GH.canvasSubtle,
          600: GH.canvasOverlay,
        },
        gh: {
          canvas: GH.canvas,
          "canvas-subtle": GH.canvasSubtle,
          overlay: GH.canvasOverlay,
          border: GH.borderDefault,
          "border-muted": GH.borderMuted,
          fg: GH.fgDefault,
          muted: GH.fgMuted,
          subtle: GH.fgSubtle,
          accent: GH.accent,
          "accent-emphasis": GH.accentEmphasis,
          success: GH.success,
          attention: GH.attention,
          danger: GH.danger,
          done: GH.done,
        },
        // Legacy "neon-*" tokens — remapped to GitHub palette so old classes still work.
        neon: {
          cyan: GH.accent,
          pink: GH.danger,
          purple: GH.done,
          violet: GH.done,
          green: GH.success,
          gold: GH.attention,
        },
        // Legacy "jp-*" tokens — remapped to GitHub palette.
        jp: {
          sakura: GH.accent,            // primary accent → GH blue
          "sakura-dark": GH.accentEmphasis,
          gold: GH.success,             // gold → GH green (positive)
          ink: GH.canvas,
          cream: GH.fgDefault,
          bamboo: GH.success,
          red: GH.danger,
        },
      },
      fontFamily: {
        // Legacy aliases — all map to system stack, GitHub-style.
        display: [SYS_FONT],
        body: [SYS_FONT],
        jp: [SYS_FONT],
        calligraphy: [SYS_FONT],
        sans: [SYS_FONT],
        mono: [MONO_FONT],
      },
      boxShadow: {
        // Subtle GitHub-style shadows; no neon glow.
        neon: "0 0 0 1px rgba(88,166,255,0.25), 0 1px 2px rgba(1,4,9,0.6)",
        "neon-pink": "0 0 0 1px rgba(248,81,73,0.25), 0 1px 2px rgba(1,4,9,0.6)",
        glass:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(1,4,9,0.5)",
        gh: "0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(1,4,9,0.6)",
      },
      backgroundImage: {
        "grid-cyan":
          "linear-gradient(rgba(88,166,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.05) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "spin-slow": "spin 12s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-neon": "pulseNeon 2.5s ease-in-out infinite",
        "gradient-x": "gradientX 6s ease infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(88,166,255,0.0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(88,166,255,0.15)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};
