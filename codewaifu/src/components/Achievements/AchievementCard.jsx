import { motion } from 'framer-motion';
import { RARITY_COLORS } from '../../utils/achievements';

const rarityLabel = {
    common: 'звичайне',
    rare: 'рідкісне',
    epic: 'епічне',
    legendary: 'легендарне',
};

export function AchievementCard({ achievement, unlocked, progress, index = 0 }) {
    const colors = RARITY_COLORS[achievement.rarity];
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.04, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.03 }}
            className={`relative glass p-5 overflow-hidden transition-all ${
                unlocked ? '' : 'grayscale-[60%] opacity-70'
            }`}
            style={
                unlocked
                    ? {
                          boxShadow: `0 0 25px ${colors.ring}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                      }
                    : undefined
            }
        >
            {/* Background glow */}
            {unlocked && (
                <motion.div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-40"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
            )}

            <div className="relative flex items-start gap-4">
                <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border-2 ${
                        unlocked ? '' : 'border-white/10'
                    }`}
                    style={
                        unlocked
                            ? {
                                  background: `linear-gradient(135deg, ${colors.from}33, ${colors.to}33)`,
                                  borderColor: colors.from,
                                  boxShadow: `0 0 12px ${colors.ring}`,
                              }
                            : { background: 'rgba(255,255,255,0.04)' }
                    }
                >
                    {achievement.icon && (
                        <img
                            src={achievement.icon}
                            alt={achievement.title}
                            className={`w-full h-full rounded-lg object-cover ${
                                unlocked ? '' : 'opacity-60'
                            }`}
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-jp font-bold text-base truncate">
                            {achievement.title}
                        </h4>
                        <span
                            className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border font-jp"
                            style={{
                                color: unlocked ? colors.from : 'rgba(255,255,255,0.4)',
                                borderColor: unlocked ? colors.from : 'rgba(255,255,255,0.15)',
                                background: unlocked ? `${colors.from}15` : 'transparent',
                            }}
                        >
                            {rarityLabel[achievement.rarity]}
                        </span>
                    </div>
                    <p className="text-xs text-white/60 leading-snug mb-2">
                        {achievement.description}
                    </p>
                    {progress && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-white/40 font-mono">
                                <span>{progress.current}</span>
                                <span>{progress.goal}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${Math.min(100, (progress.current / progress.goal) * 100)}%`,
                                    }}
                                    transition={{ duration: 1, delay: index * 0.04 }}
                                    className="h-full rounded-full"
                                    style={{
                                        background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                                        boxShadow: unlocked ? `0 0 6px ${colors.ring}` : 'none',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!unlocked && (
                <div className="absolute top-3 right-3 text-white/30 text-xs"></div>
            )}
        </motion.div>
    );
}
