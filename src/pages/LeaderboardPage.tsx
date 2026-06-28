import { useEffect, useState } from 'react';

const API = import.meta.env.PROD
  ? 'https://new-concept-english-production.up.railway.app'
  : 'http://localhost:8000';

interface Entry { id: number; username: string; nickname: string; completed: number; }

export default function LeaderboardPage() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/leaderboard?limit=50`)
      .then(r => r.json()).then(d => { setData(d.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-[#8B8580]">加载中...</div>;

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-[#3D3830]">🏆 闯关排行榜</h2>
        <p className="text-sm text-[#8B8580] mt-1">看看谁修复了最多的课程！</p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-[#8B8580]">暂无数据，快去闯关吧！</div>
      ) : (
        <div className="space-y-2">
          {data.map((e, i) => (
            <div key={e.id} className={`card p-4 flex items-center gap-4 ${i < 3 ? 'border-[#FBBF24] bg-[#FFFDEB]' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold ${
                i === 0 ? 'bg-[#FBBF24] text-white' : i === 1 ? 'bg-[#94A3B8] text-white' : i === 2 ? 'bg-[#D97706] text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-sm text-[#3D3830]">{e.nickname || e.username}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-[#5B9A5A]">{e.completed}</div>
                <div className="text-[10px] text-[#8B8580]">课完成</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
