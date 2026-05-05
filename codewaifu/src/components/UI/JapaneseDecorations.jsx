import { motion } from "framer-motion";

/* ── Stylized Japanese cloud (kumo) ───────────────────────────────── */
export function CloudDecoration({
  className = "",
  color = "#c4956a",
  opacity = 0.04,
}) {
  return (
    <svg viewBox="0 0 200 60" className={className} fill="none">
      <path
        d="M20 50 Q30 20 60 30 Q70 10 100 20 Q120 5 140 20 Q160 10 180 30 Q190 25 195 40 Q195 55 180 50 Z"
        fill={color}
        opacity={opacity}
      />
    </svg>
  );
}

/* ── Japanese wave pattern (seigaiha) ─────────────────────────────── */
export function WavePattern({
  className = "",
  color = "#c4956a",
  opacity = 0.03,
}) {
  return (
    <svg viewBox="0 0 400 100" className={className} preserveAspectRatio="none">
      {[0, 60, 120, 180, 240, 300, 360].map((x, i) => (
        <g key={i}>
          <path
            d={`M${x} 100 Q${x + 20} 60 ${x + 40} 100`}
            stroke={color}
            strokeWidth="1"
            fill="none"
            opacity={opacity}
          />
          <path
            d={`M${x + 10} 100 Q${x + 30} 50 ${x + 50} 100`}
            stroke={color}
            strokeWidth="0.5"
            fill="none"
            opacity={opacity * 0.7}
          />
        </g>
      ))}
    </svg>
  );
}

/* ── Floating lantern (chouchin) ──────────────────────────────────── */
export function Lantern({
  className = "",
  color = "#e8a0b4",
  glowColor = "#b76e79",
  size = 40,
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size * 1.8} viewBox="0 0 40 72" fill="none">
        {/* String */}
        <line
          x1="20"
          y1="0"
          x2="20"
          y2="12"
          stroke={color}
          strokeWidth="1"
          opacity="0.4"
        />
        {/* Top cap */}
        <rect
          x="14"
          y="10"
          width="12"
          height="4"
          rx="1"
          fill={color}
          opacity="0.6"
        />
        {/* Body */}
        <ellipse cx="20" cy="35" rx="14" ry="20" fill={color} opacity="0.15" />
        <ellipse
          cx="20"
          cy="35"
          rx="14"
          ry="20"
          stroke={color}
          strokeWidth="0.8"
          opacity="0.3"
        />
        {/* Glow */}
        <ellipse cx="20" cy="35" rx="8" ry="12" fill={glowColor} opacity="0.1">
          <animate
            attributeName="opacity"
            values="0.1;0.2;0.1"
            dur="3s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Lines on lantern */}
        <line
          x1="20"
          y1="16"
          x2="20"
          y2="54"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.2"
        />
        <ellipse
          cx="20"
          cy="35"
          rx="14"
          ry="8"
          stroke={color}
          strokeWidth="0.5"
          fill="none"
          opacity="0.15"
        />
        {/* Bottom cap */}
        <rect
          x="15"
          y="53"
          width="10"
          height="3"
          rx="1"
          fill={color}
          opacity="0.5"
        />
        {/* Tassel */}
        <line
          x1="20"
          y1="56"
          x2="20"
          y2="68"
          stroke={color}
          strokeWidth="0.8"
          opacity="0.3"
        />
        <circle cx="20" cy="69" r="2" fill={color} opacity="0.3" />
      </svg>
    </motion.div>
  );
}

/* ── Sakura tree branch ───────────────────────────────────────────── */
export function SakuraBranch({ className = "", flip = false }) {
  return (
    <svg
      viewBox="0 0 300 500"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      fill="none"
    >
      {/* Main branch */}
      <path
        d="M0 20 Q50 40 80 100 Q100 160 90 240 Q85 300 95 380 Q100 430 90 500"
        stroke="#4a3020"
        strokeWidth="8"
        opacity="0.15"
        strokeLinecap="round"
      />
      {/* Sub-branch */}
      <path
        d="M60 80 Q100 70 140 90 Q180 110 200 100"
        stroke="#4a3020"
        strokeWidth="4"
        opacity="0.12"
        strokeLinecap="round"
      />
      <path
        d="M80 150 Q120 130 160 145 Q190 155 220 140"
        stroke="#4a3020"
        strokeWidth="3"
        opacity="0.1"
        strokeLinecap="round"
      />
      <path
        d="M85 250 Q110 235 140 250"
        stroke="#4a3020"
        strokeWidth="3"
        opacity="0.1"
        strokeLinecap="round"
      />
      {/* Blossoms */}
      {[
        [130, 75],
        [170, 95],
        [200, 88],
        [145, 60],
        [150, 135],
        [185, 148],
        [210, 130],
        [125, 145],
        [125, 240],
        [148, 250],
        [100, 260],
        [75, 180],
        [65, 320],
        [80, 400],
        [95, 450],
      ].map(([cx, cy], i) => (
        <g key={i}>
          {/* Petal cluster */}
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx={cx}
              cy={cy}
              rx="6"
              ry="10"
              fill="#e8a0b4"
              opacity={0.12 + (i % 3) * 0.03}
              transform={`rotate(${angle} ${cx} ${cy})`}
            />
          ))}
          {/* Center */}
          <circle cx={cx} cy={cy} r="3" fill="#f5c6d0" opacity="0.2" />
        </g>
      ))}
    </svg>
  );
}

/* ── Asanoha (hemp leaf) pattern overlay ───────────────────────────── */
export function AsanohaPattern({ className = "" }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <svg width="100%" height="100%" opacity="0.02">
        <defs>
          <pattern
            id="asanoha"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M20 0 L40 20 L20 40 L0 20Z"
              stroke="#c4956a"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M20 0 L20 40 M0 20 L40 20"
              stroke="#c4956a"
              strokeWidth="0.3"
              fill="none"
            />
            <path
              d="M20 0 L0 20 M20 0 L40 20 M20 40 L0 20 M20 40 L40 20"
              stroke="#c4956a"
              strokeWidth="0.3"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#asanoha)" />
      </svg>
    </div>
  );
}

/* ── Torii gate silhouette ────────────────────────────────────────── */
export function ToriiSilhouette({
  className = "",
  color = "#b76e79",
  opacity = 0.06,
}) {
  return (
    <svg viewBox="0 0 200 240" className={className} fill="none">
      <rect
        x="25"
        y="45"
        width="10"
        height="195"
        fill={color}
        opacity={opacity}
      />
      <rect
        x="165"
        y="45"
        width="10"
        height="195"
        fill={color}
        opacity={opacity}
      />
      <rect
        x="5"
        y="30"
        width="190"
        height="12"
        rx="4"
        fill={color}
        opacity={opacity}
      />
      <rect
        x="18"
        y="55"
        width="164"
        height="8"
        rx="3"
        fill={color}
        opacity={opacity * 0.8}
      />
      <path
        d="M0 30 Q100 0 200 30"
        stroke={color}
        strokeWidth="10"
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Brush Stroke (Sumi-e) ────────────────────────────────────────── */
export function BrushStroke({
  className = "",
  color = "#b76e79",
  opacity = 0.5,
}) {
  return (
    <svg viewBox="0 0 300 20" className={className} preserveAspectRatio="none">
      <path
        d="M5,10 Q50,0 150,12 T295,10 Q280,18 150,15 T5,10 Z"
        fill={color}
        opacity={opacity}
        style={{ filter: "url(#rough-edge)" }}
      />
      <defs>
        <filter id="rough-edge">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.1"
            numOctaves="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

/* ── Ichimatsu (Checkered) pattern overlay ────────────────────────── */
export function IchimatsuPattern({
  className = "",
  color = "#c4956a",
  opacity = 0.03,
}) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id="ichimatsu"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              width="20"
              height="20"
              fill={color}
              opacity={opacity}
            />
            <rect
              x="20"
              y="20"
              width="20"
              height="20"
              fill={color}
              opacity={opacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ichimatsu)" />
      </svg>
    </div>
  );
}
