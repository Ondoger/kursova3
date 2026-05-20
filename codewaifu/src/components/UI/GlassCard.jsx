import { motion } from "framer-motion";
import { forwardRef } from "react";

/*
 * GitHub-flat card. The "glow" prop is preserved for API compatibility
 * but no longer renders coloured glows — instead, hover lifts the border
 * to GitHub's hover style (border-default → fg-default).
 */
export const GlassCard = forwardRef(function GlassCard(
  { className = "", glow: _glow, hoverable = true, children, ...props },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className={`glass p-4 transition-colors duration-150 ${
        hoverable ? "hover:border-[#8b949e]" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});
