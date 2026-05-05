import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { useCharacterLevel } from "../../hooks/useCharacterLevel";
import { CHARACTER_TIERS } from "../../utils/gamification";
import { moodToAnimation } from "../../three/animationMap";

/*  ── Media sources (video / gif) ─────────────────────────────────────
 *  Drop files into  public/videos/character/  and they'll be picked up.
 *  Supported: .webm (transparent), .gif, .mp4
 */
const MEDIA_PATHS = {
  idle: "/videos/character/idle.webm",
  climbing: "/videos/character/climbing.webm",
  joyfulJump: "/videos/character/joyful-jump.webm",
  jumpingDown: "/videos/character/jumping-down.webm",
  kneelingPointing: "/videos/character/kneeling-pointing.webm",
  rumbaDancing: "/videos/character/rumba-dancing.webm",
  sittingLaughing: "/videos/character/sitting-laughing.webm",
  standingClap: "/videos/character/standing-clap.webm",
};

export function VideoCharacter({ height = "40vh", showHud = true }) {
  const mood = useStore((s) => s.mood);
  const loading = useStore((s) => s.loading);
  const characterName = useStore((s) => s.characterName);
  const data = useCharacterLevel();
  const tier = data?.tier ?? CHARACTER_TIERS[0];
  const level = data?.level ?? 1;
  const animation = loading ? "climbing" : (moodToAnimation(mood) ?? "idle");

  const videoRef = useRef(null);
  const [videoAvailable, setVideoAvailable] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = MEDIA_PATHS[animation] ?? MEDIA_PATHS.idle;
    video.src = src;
    video.load();

    const onCanPlay = () => {
      setVideoAvailable(true);
      video.play().catch(() => {});
    };
    const onError = () => setVideoAvailable(false);

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [animation]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height }}
    >
      {/* Backdrop — Japanese styled */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse at center, ${tier.accent}15, transparent 65%), linear-gradient(180deg, #0d0b0f 0%, #14100e 100%)`,
        }}
      />

      {/* Video */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-contain rounded-2xl transition-opacity duration-500 ${videoAvailable ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ mixBlendMode: "screen" }}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Tier-colored vignette */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, ${tier.accent}12 100%)`,
        }}
      />

      {/* Placeholder when no video */}
      {!videoAvailable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <motion.div
              className="text-6xl"
              animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              🌸
            </motion.div>
            <p className="text-white/30 text-sm font-jp">
              Відео завантажується...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
