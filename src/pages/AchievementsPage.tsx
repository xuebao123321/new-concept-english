import { motion } from 'framer-motion';
import { useUserStore } from '../stores/useUserStore';
import { ALL_ACHIEVEMENTS } from '../utils/achievements';
import { springs, staggerDelay } from '../utils/motion-tokens';

export default function AchievementsPage() {
  const { userState } = useUserStore();
  if (!userState) return null;

  const unlocked = userState.unlockedAchievements;
  const total = ALL_ACHIEVEMENTS.length;
  const percent = Math.round((unlocked.length / total) * 100);

  const categories = [
    { key: 'milestone' as const, label: '🏅 里程碑', color: '#FBBF24' },
    { key: 'skill' as const, label: '🎯 技能成就', color: '#5B9ED4' },
    { key: 'special' as const, label: '⭐ 特殊成就', color: '#7E57C2' },
  ];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* 头部统计 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink">🏆 时间勋章</h2>
        <p className="text-sm text-ink-light mt-1">
          已解锁 {unlocked.length} / {total} 个成就
        </p>
      </div>

      {/* 总进度 */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink">总完成度</span>
          <span className="text-sm font-bold text-forest">{percent}%</span>
        </div>
        <div className="h-2.5 bg-warm-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full progress-shimmer"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 按分类展示 */}
      {categories.map(category => {
        const catAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === category.key);
        if (catAchievements.length === 0) return null;
        return (
          <div key={category.key}>
            <h3 className="font-bold mb-3" style={{ color: category.color }}>{category.label}</h3>
            <div className="grid grid-cols-2 gap-3">
              {catAchievements.map((achievement, index) => {
                const isUnlocked = unlocked.includes(achievement.id);
                return (
                  <motion.div
                    key={achievement.id}
                    className={`rounded-2xl p-4 border text-center transition-all ${
                      isUnlocked
                        ? 'glass-panel border-honey/40'
                        : 'bg-white border-warm-border opacity-50'
                    }`}
                    style={isUnlocked ? { boxShadow: '0 0 20px rgba(251,191,36,0.1)' } : {}}
                    initial={{ y: 20, opacity: 0, rotateY: 90 }}
                    animate={{ y: 0, opacity: 1, rotateY: 0 }}
                    transition={{ delay: staggerDelay(index), ...springs.popIn }}
                  >
                    <div className={`text-3xl mb-2 ${isUnlocked ? '' : 'grayscale opacity-40'}`}>
                      {isUnlocked ? achievement.icon : '🔒'}
                    </div>
                    <div className={`text-sm font-bold ${isUnlocked ? 'text-ink' : 'text-ink-muted'}`}>
                      {isUnlocked ? achievement.name : '???'}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {isUnlocked ? achievement.description : '继续学习来解锁'}
                    </div>
                    {isUnlocked && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-[10px] bg-honey/15 text-honey rounded-full font-bold">
                        ✅ 已解锁
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 空状态 */}
      {unlocked.length === 0 && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-5xl mb-3">🚀</div>
          <p className="text-ink-light text-sm">还没有解锁任何成就，快去学习吧！</p>
        </motion.div>
      )}
    </div>
  );
}
