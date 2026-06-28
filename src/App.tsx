import { Routes, Route } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './stores/useAuthStore';
import { useUserStore } from './stores/useUserStore';
import { useLessonProgressStore } from './stores/useLessonProgressStore';

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

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-3xl animate-bounce">🐻</div>
    </div>
  );
}

export default function App() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    useAuthStore.getState().loadFromStorage();
    useUserStore.getState().init();
    useLessonProgressStore.getState().load();
  }, []);

  return (
    <ErrorBoundary>
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
