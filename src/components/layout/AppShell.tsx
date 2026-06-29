import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from './TopBar';
import LevelUpModal from '../gamification/LevelUpModal';
import FamilyBindGate from '../common/FamilyBindGate';
import { useUserStore } from '../../stores/useUserStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { variants } from '../../utils/motion-tokens';

const STUDENT_TABS = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/star-map', icon: '🌟', label: '星图' },
  { path: '/leaderboard', icon: '🏆', label: '排行' },
  { path: '/review', icon: '📝', label: '复习' },
  { path: '/profile', icon: '👤', label: '我的' },
];

const PARENT_TABS = [
  { path: '/parent', icon: '🏠', label: '首页' },
  { path: '/leaderboard', icon: '🏆', label: '排行' },
  { path: '/profile', icon: '👤', label: '我的' },
];

function getPageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/parent') return '🏠 温暖森林学院';
  if (pathname.startsWith('/star-map')) return '🌟 学习星图';
  if (pathname.startsWith('/leaderboard')) return '🏆 闯关排行';
  if (pathname.startsWith('/review')) return '📝 复习小屋';
  if (pathname.startsWith('/achievements')) return '🏆 荣誉勋章';
  if (pathname.startsWith('/profile')) return '👤 我的档案';
  if (pathname.startsWith('/diagnosis')) return '🔍 水平测试';
  return '🌳 温暖森林学院';
}

export default function AppShell() {
  const loc = useLocation();
  const nav = useNavigate();
  const isFullScreen = loc.pathname.includes('/block/') || loc.pathname.includes('/test/');
  const pageTitle = getPageTitle(loc.pathname);
  const { pendingLevelUp, clearLevelUp } = useUserStore();
  const { user } = useAuthStore();
  const isParent = user?.role === 'parent';
  const TABS = isParent ? PARENT_TABS : STUDENT_TABS;

  // 家长首页 → /parent
  useEffect(() => {
    if (isParent && loc.pathname === '/') nav('/parent', { replace: true });
  }, [isParent, loc.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      {!isFullScreen && <TopBar title={pageTitle} />}

      <main className="flex-1 pb-24 relative z-10">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              {...variants.page}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {!isFullScreen && (
        <nav className="fixed bottom-0 inset-x-0 z-30 safe-bottom flex justify-center pointer-events-none">
          <div className="nav-bottom bg-cream/95 pointer-events-auto"
            style={{ width: '100%', maxWidth: '512px', margin: '0 auto' }}>
            <div className="grid grid-cols-5 py-1.5">
              {TABS.map(t => {
                const active = t.path === '/'
                  ? loc.pathname === '/'
                  : loc.pathname.startsWith(t.path);

                return (
                  <button
                    key={t.path}
                    onClick={() => nav(t.path)}
                    className="flex flex-col items-center justify-center"
                  >
                    <span className={`text-2xl transition-all ${active ? 'scale-110' : 'opacity-40 grayscale'}`}>
                      {t.icon}
                    </span>
                    <span className={`text-[10px] font-extrabold leading-none mt-0.5 ${
                      active ? 'text-forest' : 'text-ink-muted'
                    }`}>
                      {t.label}
                    </span>
                    {active && (
                      <div className="w-5 h-1 rounded-full bg-forest mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* 家庭绑定守卫 (学生未绑定家庭时显示) */}
      <FamilyBindGate />

      {/* 全局段位升级弹窗 */}
      <LevelUpModal
        isOpen={!!pendingLevelUp}
        newRank={pendingLevelUp?.newRank ?? { icon: '🌱', name: '时间学徒', color: '#94A3B8', level: 1 }}
        oldRank={pendingLevelUp?.oldRank}
        onClose={clearLevelUp}
      />
    </div>
  );
}
