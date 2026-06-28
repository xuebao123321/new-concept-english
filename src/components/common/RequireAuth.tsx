import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

/** 路由守卫:未登录 → 跳转 /login,已登录 → 正常渲染子路由 */
export default function RequireAuth() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Outlet />;
}