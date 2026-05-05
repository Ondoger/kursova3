/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          900: "#05050a",
          800: "#0a0a0f",
          700: "#0f0f1a",
          600: "#15152a",
        },
        neon: {
          cyan: "#00ffff",
          pink: "#ff00ff",
          purple: "#7c3aed",
          violet: "#a855f7",
          green: "#10ffa5",
          gold: "#ffd700",
        },
        jp: {
          sakura: "#e8a0b4",
          "sakura-dark": "#b76e79",
          gold: "#c4956a",
          ink: "#2c1810",
          cream: "#f5e6d3",
          bamboo: "#4a7c59",
          red: "#b33a3a",
        },
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Inter", "sans-serif"],
        jp: ['"Noto Serif JP"', "serif"],
        calligraphy: ['"Yuji Syuku"', "serif"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(124, 58, 237, 0.3)",
        "neon-pink":
          "0 0 20px rgba(255, 0, 255, 0.5), 0 0 40px rgba(124, 58, 237, 0.3)",
        glass:
          "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "grid-cyan":
          "linear-gradient(rgba(0,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.05) 1px, transparent 1px)",
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
          "0%, 100%": {
            boxShadow:
              "0 0 12px rgba(0,255,255,0.5), 0 0 28px rgba(124,58,237,0.4)",
          },
          "50%": {
            boxShadow:
              "0 0 24px rgba(0,255,255,0.9), 0 0 60px rgba(255,0,255,0.5)",
          },
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
