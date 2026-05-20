import { motion } from "framer-motion";

/*
 * Flat GitHub-style button. The "variant" / "burst" props are preserved
 * for API compatibility, but the burst particle effect is removed and
 * variants only switch between primary (green), accent (blue) and
 * default (grey) GH styles.
 */
export function NeonButton({
  variant = "primary",
  burst: _burst,
  className = "",
  children,
  onClick,
  ...rest
}) {
  const variantClass =
    variant === "primary"
      ? "btn-gh-primary"
      : variant === "pink"
        ? "btn-gh-accent"
        : "";

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`btn-gh ${variantClass} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
