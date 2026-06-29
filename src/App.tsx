import { Routes, Route } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense, useState } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import RequireAuth from './components/common/RequireAuth';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './stores/useAuthStore';
import { useUserStore } from './stores/useUserStore';
import { useLessonProgressStore } from './stores/useLessonProgressStore';
import { api } from './db/api';

// 按需加载
const StarMapPage = lazy(() => import('./pages/StarMapPage'));
const LessonDetailPage = lazy(() => import('./pages/LessonDetailPage'));
const BlockSessionPage = lazy(() => import('./pages/BlockSessionPage'));
const MasteryTestPage = lazy(() => import('./pages/MasteryTestPage'));
const LessonSelectPage = lazy(() => import('./pages/LessonSelectPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const ScheduledReviewPage = lazy(() => import('./pages/ScheduledReviewPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const ParentDashboardPage = lazy(() => import('./pages/ParentDashboardPage'));

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <img
        src="/assets/characters/xionger-laugh.webp"
        alt="加载中"
        width={96}
        height={96}
        className="rounded-2xl object-cover border-2 border-warm-border animate-float"
        style={{ objectPosition: 'left center' }}
      />
      <div className="text-sm text-ink-light font-bold">🐻 正在准备学习森林...</div>
    </div>
  );
}

export default function App() {
  const done = useRef(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [backendOff, setBackendOff] = useState(false);

  useEffect(() => {
    api.health().catch(() => setBackendOff(true));
    api.health().then(() => setBackendOff(false)).catch(() => {});
  }, []);
  useEffect(() => {
    const go = () => setOffline(true);
    const back = () => setOffline(false);
    window.addEventListener('offline', go);
    window.addEventListener('online', back);
    return () => { window.removeEventListener('offline', go); window.removeEventListener('online', back); };
  }, []);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    useAuthStore.getState().loadFromStorage();
    useUserStore.getState().init();
    useLessonProgressStore.getState().load();
  }, []);

  return (
    <ErrorBoundary>
    {offline && (
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFF3CD] text-[#856404] text-center py-2 text-sm font-bold">
        📡 当前离线，部分功能不可用
      </div>
    )}
    {backendOff && !offline && (
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFF3CD] text-[#856404] text-center py-2 text-sm font-bold">
        ⚠️ 后端暂不可用，学习数据保存在本地
      </div>
    )}
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/parent" element={<ParentDashboardPage />} />
          <Route path="/star-map" element={<StarMapPage />} />
          <Route path="/lesson" element={<LessonSelectPage />} />
          <Route path="/lesson/:groupId" element={<LessonDetailPage />} />
          <Route path="/lesson/:groupId/block/:block" element={<BlockSessionPage />} />
          <Route path="/lesson/:groupId/test" element={<MasteryTestPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/scheduled" element={<ScheduledReviewPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
