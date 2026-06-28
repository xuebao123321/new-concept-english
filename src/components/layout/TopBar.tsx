import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { useAuthStore } from '../../stores/useAuthStore';

export default function TopBar({ title, showBack = false, onBack }: {
  title: string; showBack?: boolean; onBack?: () => void;
}) {
  const nav = useNavigate();
  const userState = useUserStore(s => s.userState);
  const { isLoggedIn, logout, user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 safe-top nav-top">
      <div className="flex items-center justify-between px-3 py-2.5 max-w-lg mx-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          {showBack && (
            <button onClick={() => (onBack ? onBack() : nav(-1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-warm-bg">
              <span className="text-sm">←</span></button>
          )}
          <h1 className="font-extrabold text-[14px] truncate text-ink">{title}</h1>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          {isLoggedIn ? (
            <>
              <span className="text-ink-muted">{user?.nickname || user?.username}</span>
              <button onClick={() => nav('/profile')}
                className="px-2.5 py-1 rounded-full bg-warm-bg text-ink-light">👤</button>
              <button onClick={() => { logout(); nav('/login'); }}
                className="px-2.5 py-1 rounded-full bg-berry-pale text-berry">退出</button>
            </>
          ) : (
            <button onClick={() => nav('/login')}
              className="px-3 py-1 rounded-full bg-forest-pale text-forest font-bold">登录</button>
          )}
          <span className="bg-sun-pale px-1.5 py-0.5 rounded-full text-honey">⭐{userState?.totalXp ?? 0}</span>
        </div>
      </div>
    </header>
  );
}
