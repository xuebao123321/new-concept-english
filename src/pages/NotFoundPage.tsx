import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFFBF5' }}>
      <div className="text-center space-y-4">
        <div className="text-7xl">🐻</div>
        <h2 className="text-2xl font-extrabold text-[#3D3830]">哎呀！</h2>
        <p className="text-[#8B8580]">这个页面被熊二藏起来了...</p>
        <button onClick={() => nav('/')} className="btn-brand text-base">回首页</button>
        <button onClick={() => nav(-1)} className="btn-ghost text-sm">返回上一页</button>
      </div>
    </div>
  );
}
