// 熊出没·重启未来 — 自定义 SVG 图标系统
// 比 emoji 更精致，统一视觉风格

export function IconDashboard({ size = 24, color = '#4A90D9' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconStarMap({ size = 24, color = '#7E57C2' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="9" strokeDasharray="3 2" opacity="0.5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <circle cx="5" cy="5" r="1.5" fill={color} stroke="none" />
      <circle cx="19" cy="19" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}

export function IconEnergy({ size = 24, color = '#FF8C42' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 11,14 10,22 21,10 13,10 14,2" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

export function IconRecycle({ size = 24, color = '#FF8C42' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 19H4.8C3.8 19 3 18.2 3 17.2V16" />
      <path d="M3 8h2.2c1 0 1.8.8 1.8 1.8v.2" />
      <path d="M8 3h.2C9.2 3 10 3.8 10 4.8V5" />
      <path d="M17 5h2.2c1 0 1.8.8 1.8 1.8V8" />
      <path d="M21 16h-2.2c-1 0-1.8-.8-1.8-1.8V14" />
      <polyline points="12,7 12,3 9,6" />
      <polyline points="17,12 21,12 18,9" />
      <polyline points="12,17 12,21 15,18" />
      <polyline points="7,12 3,12 6,15" />
    </svg>
  );
}

export function IconAchievement({ size = 24, color = '#4CAF50' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v4" />
      <path d="M8 21h8" />
      <path d="M10 17h4" />
      <polygon points="12,3 13.5,7.5 18,7.5 14.5,10.5 16,15 12,12 8,15 9.5,10.5 6,7.5 10.5,7.5" fill={color} fillOpacity="0.1" />
    </svg>
  );
}

export function IconPlay({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

export function IconCheck({ size = 24, color = '#4CAF50' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8,12 11,15 16,9" />
    </svg>
  );
}

export function IconLock({ size = 24, color = '#BFBAB5' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 118 0v4" />
      <circle cx="12" cy="16" r="1.5" fill={color} />
    </svg>
  );
}

export function IconStar({ size = 24, color = '#FBBF24', filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

export function IconArrowRight({ size = 20, color = '#4A90D9' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,6 15,12 9,18" />
    </svg>
  );
}

export function IconRefresh({ size = 24, color = '#4A90D9' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,4 1,10 7,10" />
      <polyline points="23,20 23,14 17,14" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  );
}

export function IconBook({ size = 24, color = '#4A90D9' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
