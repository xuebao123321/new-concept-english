import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
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
import { useAuthStore } from './stores/useAuthStore'; // getState() called in useEffect
import { useUserStore } from './stores/useUserStore';
import { useLessonProgressStore } from './stores/useLessonProgressStore';
import { checkAndRefillHearts } from './utils/streak';

export default function App() {
  const init = useUserStore(s => s.init);
  const loadProgress = useLessonProgressStore(s => s.load);

  useEffect(() => {
    init();
    loadProgress();
    checkAndRefillHearts().then(() => {
      useUserStore.getState().refreshUser();
    });
  }, [init, loadProgress]);

  useEffect(() => { useAuthStore.getState().loadFromStorage(); }, []);

  return (
    <ErrorBoundary>
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
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
