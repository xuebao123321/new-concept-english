import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ title, showBack = false, onBack }: TopBarProps) {
  const navigate = useNavigate();
  const userState = useUserStore(s => s.userState);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header className="sticky top-0 z-30 safe-top nav-top">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-warm-bg hover:bg-warm-border/50 transition-colors"
            >
              <span className="text-base text-ink-light">←</span>
            </button>
          )}
          <h1 className="font-extrabold text-[15px] tracking-tight text-ink truncate max-w-[220px]">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1 bg-berry-pale px-2 py-1 rounded-full">
            <span className="text-sm">❤️</span>
            <span className="text-berry">{userState?.hearts ?? 5}</span>
          </span>
          <span className="flex items-center gap-1 bg-sun-pale px-2 py-1 rounded-full">
            <span className="text-sm">⭐</span>
            <span className="text-honey">{userState?.totalXp ?? 0}</span>
          </span>
          <span className="flex items-center gap-1 bg-forest-pale px-2 py-1 rounded-full">
            <span className="text-sm">🔥</span>
            <span className="text-forest">{userState?.streakDays ?? 0}天</span>
          </span>
        </div>
      </div>
    </header>
  );
}
