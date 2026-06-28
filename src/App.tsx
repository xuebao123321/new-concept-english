import { Routes, Route } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import StarMapPage from './pages/StarMapPage';
import LessonDetailPage from './pages/LessonDetailPage';
import BlockSessionPage from './pages/BlockSessionPage';
import MasteryTestPage from './pages/MasteryTestPage';
import LessonSelectPage from './pages/LessonSelectPage';
import PracticePage from './pages/PracticePage';
import ReviewPage from './pages/ReviewPage';
import AchievementsPage from './pages/AchievementsPage';
import ProfilePage from './pages/ProfilePage';
import DiagnosisPage from './pages/DiagnosisPage';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './stores/useAuthStore';
import { useUserStore } from './stores/useUserStore';
import { useLessonProgressStore } from './stores/useLessonProgressStore';

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
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/star-map" element={<StarMapPage />} />
        <Route path="/lesson" element={<LessonSelectPage />} />
        <Route path="/lesson/:groupId" element={<LessonDetailPage />} />
        <Route path="/lesson/:groupId/block/:block" element={<BlockSessionPage />} />
        <Route path="/lesson/:groupId/test" element={<MasteryTestPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
