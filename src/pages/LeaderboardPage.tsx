import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { springs, staggerDelay } from '../utils/motion-tokens';
import { useAuthStore } from '../stores/useAuthStore';

const API = import.meta.env.PROD
  ? 'https://new-concept-english-production.up.railway.app'
  : 'http://localhost:8000';

interface Entry { id: number; username: string; nickname: string; completed: number; }

/* 奖牌配置 (前三名) */
const MEDAL_STYLES = [
  { medal: '🥇', bg: 'bg-sun-pale', border: 'border-sun', label: '冠军' },
  { medal: '🥈', bg: 'bg-warm-bg', border: 'border-ink-ghost', label: '亚军' },
  { medal: '🥉', bg: 'bg-honey-pale', border: 'border-honey', label: '季军' },
];

export default function LeaderboardPage() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const myId = user?.id;
  const myRankIndex = data.findIndex(e => e.id === myId);
  const isParent = user?.role === 'parent';
  const [familyOnly, setFamilyOnly] = useState(false);

  useEffect(() => {
    let url = `${API}/api/leaderboard?limit=50`;
    if (familyOnly && myId) url += `&family_user_id=${myId}`;
    fetch(url)
      .then(r => r.json()).then(d => { setData(d.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [familyOnly, myId]);

  if (loading) return <div className="text-center py-20 text-ink-light">加载中...</div>;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="px-4 py-5 space-y-5">
      {/* 头部 */}
      <div className="text-center">
        <h2 className="text-h1 text-ink">🏆 闯关排行榜</h2>
        <p className="text-meta text-ink-light mt-1">
          看看谁修复了最多的课程!
          {myId && <span className="ml-1 text-forest font-bold">· 你在第 {myRankIndex >= 0 ? myRankIndex + 1 : '?'} 名</span>}
        </p>
        {isParent && (
          <button onClick={() => setFamilyOnly(!familyOnly)}
            className={`mt-2 text-xs px-3 py-1 rounded-full font-bold transition-all ${
              familyOnly ? 'bg-forest-pale text-forest border border-forest/30' : 'bg-warm-bg text-ink-light'
            }`}>
            {familyOnly ? '🏠 只看家庭' : '🌍 全局排行'}
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-ink-light">暂无数据,快去闯关吧!</div>
      ) : (
        <>
          {/* ═══ 前三名领奖台 ═══ */}
          <div className="grid grid-cols-3 gap-2 items-end">
            {top3[1] && <MedalCard entry={top3[1]} rank={1} delay={0} isMe={myId === top3[1].id} />}
            {top3[0] && <MedalCard entry={top3[0]} rank={0} delay={0.05} featured isMe={myId === top3[0].id} />}
            {top3[2] && <MedalCard entry={top3[2]} rank={2} delay={0.1} isMe={myId === top3[2].id} />}
          </div>

          {/* 分隔 + 快速定位 */}
          {rest.length > 0 && (
            <>
              {myRankIndex >= 3 && (
                <button
                  onClick={() => document.getElementById('lb-me')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="text-meta text-forest font-bold text-center w-full py-1 hover:underline"
                >
                  👇 向下找到我的位置 (第 {myRankIndex + 1} 名)
                </button>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-caption text-ink-light uppercase tracking-wider font-extrabold">📋 其他</span>
                <div className="flex-1 h-px bg-warm-border" />
              </div>
            </>
          )}

          {/* ═══ 第 4 名及以后 ═══ */}
          <div className="space-y-2">
            {rest.map((e, i) => {
              const isMe = e.id === myId;
              return (
                <motion.div
                  key={e.id}
                  id={isMe ? 'lb-me' : undefined}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: staggerDelay(i, 'listBig'), ...springs.slideUp }}
                  className={`card p-3 flex items-center gap-3 ${
                    isMe ? 'border-forest bg-forest-pale ring-2 ring-forest/30' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-meta font-extrabold tabular-nums ${
                    isMe ? 'bg-forest text-white' : 'bg-warm-bg text-ink-light'
                  }`}>
                    {i + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-meta font-bold text-ink truncate">
                      {e.nickname || e.username}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-forest text-white font-bold">你</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-h3 font-extrabold text-forest">{e.completed}</div>
                    <div className="text-caption text-ink-light">课</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── 奖牌卡片 ─── */
function MedalCard({ entry, rank, delay, featured = false, isMe = false }: {
  entry: Entry; rank: 0 | 1 | 2; delay: number; featured?: boolean; isMe?: boolean;
}) {
  const style = MEDAL_STYLES[rank];
  const sizeClass = featured ? 'py-5' : 'py-4';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ...springs.popIn }}
      className={`relative rounded-2xl border-2 ${style.border} ${style.bg} ${sizeClass} text-center ${
        isMe ? 'ring-2 ring-forest ring-offset-1' : ''
      }`}
    >
      {/* 缎带 */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-b-md ${
        rank === 0 ? 'bg-sun' : rank === 1 ? 'bg-ink-ghost' : 'bg-honey'
      }`} />

      {/* 奖牌 emoji 摆动 */}
      <motion.div
        className="text-4xl mb-1"
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {style.medal}
      </motion.div>

      {/* 姓名 */}
      <div className={`text-meta font-extrabold truncate px-1 ${
        rank === 0 ? 'text-sun' : rank === 1 ? 'text-ink-ghost' : 'text-honey'
      }`}>
        {entry.nickname || entry.username}
        {isMe && (
          <span className="ml-1 text-[10px] px-1 py-0.5 rounded-full bg-forest text-white align-middle font-bold">你</span>
        )}
      </div>

      {/* 数字 */}
      <div className={`tabular-nums ${featured ? 'text-display' : 'text-h1'} font-extrabold text-ink mt-0.5`}>
        {entry.completed}
      </div>
      <div className="text-caption text-ink-light">课</div>
    </motion.div>
  );
}