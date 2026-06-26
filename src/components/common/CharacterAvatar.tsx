import { motion } from 'framer-motion';

type Character = 'guangtouqiang' | 'xiongda' | 'xionger' | 'xiaoqiang';
type Pose = 'happy' | 'thinking' | 'cheer' | 'hello';

interface Props {
  character: Character;
  pose?: Pose;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animation?: 'float' | 'bounce' | 'wave' | 'none';
}

/* ═══════════════ SVG 卡通角色 ═══════════════ */

function BearEr({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="70" rx="34" ry="26" fill="#D4A76A" />
      <ellipse cx="50" cy="63" rx="24" ry="16" fill="#FAEBD7" />
      <circle cx="50" cy="36" r="30" fill="#D4A76A" />
      <circle cx="26" cy="16" r="11" fill="#D4A76A" /><circle cx="26" cy="16" r="5.5" fill="#F0C9A0" />
      <circle cx="74" cy="16" r="11" fill="#D4A76A" /><circle cx="74" cy="16" r="5.5" fill="#F0C9A0" />
      <ellipse cx="50" cy="38" rx="21" ry="17" fill="#FAEBD7" />
      <circle cx="41" cy="33" r="4.5" fill="#3D3830" /><circle cx="42" cy="31.5" r="1.5" fill="white" />
      <circle cx="59" cy="33" r="4.5" fill="#3D3830" /><circle cx="60" cy="31.5" r="1.5" fill="white" />
      <ellipse cx="50" cy="40" rx="6" ry="4" fill="#8B6914" />
      <path d="M42 46 Q50 54 58 46" stroke="#3D3830" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="42" r="5" fill="#FFB5B5" opacity="0.4" />
      <circle cx="67" cy="42" r="5" fill="#FFB5B5" opacity="0.4" />
    </svg>
  );
}

function BearDa({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="70" rx="32" ry="24" fill="#8B6914" />
      <ellipse cx="50" cy="64" rx="22" ry="14" fill="#FAEBD7" />
      <circle cx="50" cy="36" r="28" fill="#8B6914" />
      <circle cx="27" cy="16" r="10" fill="#8B6914" /><circle cx="27" cy="16" r="5" fill="#C49A5C" />
      <circle cx="73" cy="16" r="10" fill="#8B6914" /><circle cx="73" cy="16" r="5" fill="#C49A5C" />
      <ellipse cx="50" cy="38" rx="19" ry="15" fill="#FAEBD7" />
      <path d="M32 28 Q42 23 48 28" stroke="#5C4510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M52 28 Q58 23 68 28" stroke="#5C4510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="41" cy="33" r="4.5" fill="#3D3830" /><circle cx="42" cy="31.5" r="1.5" fill="white" />
      <circle cx="59" cy="33" r="4.5" fill="#3D3830" /><circle cx="60" cy="31.5" r="1.5" fill="white" />
      <ellipse cx="50" cy="40" rx="5.5" ry="3.5" fill="#5C4510" />
      <path d="M43 46 Q50 52 57 46" stroke="#3D3830" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function GuangTou({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="36" y="58" width="28" height="28" rx="8" fill="#5B9ED4" />
      <rect x="38" y="62" width="24" height="3" rx="1" fill="#4A8BC0" />
      <ellipse cx="50" cy="42" rx="24" ry="26" fill="#FFD5A5" />
      <path d="M43 16 Q46 8 48 18" stroke="#5C4510" strokeWidth="1.5" fill="none" />
      <path d="M52 18 Q54 8 56 16" stroke="#5C4510" strokeWidth="1.5" fill="none" />
      <circle cx="41" cy="38" r="7.5" fill="none" stroke="#5C4510" strokeWidth="2.2" />
      <circle cx="59" cy="38" r="7.5" fill="none" stroke="#5C4510" strokeWidth="2.2" />
      <line x1="48.5" y1="38" x2="51.5" y2="38" stroke="#5C4510" strokeWidth="2.2" />
      <circle cx="41" cy="38" r="2.5" fill="#3D3830" />
      <circle cx="59" cy="38" r="2.5" fill="#3D3830" />
      <path d="M43 49 Q50 55 57 49" stroke="#3D3830" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="46" r="3.5" fill="#FFB5B5" opacity="0.4" />
      <circle cx="68" cy="46" r="3.5" fill="#FFB5B5" opacity="0.4" />
    </svg>
  );
}

function RocketIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="55" rx="16" ry="20" fill="#5B9A5A" />
      <ellipse cx="50" cy="52" rx="11" ry="14" fill="#8BC48A" />
      <polygon points="50,25 38,48 62,48" fill="#FF8C42" />
      <circle cx="50" cy="50" r="5.5" fill="#FFFBF5" />
      <circle cx="50" cy="50" r="4" fill="#5B9ED4" />
      <polygon points="36,56 28,72 40,60" fill="#FF8C42" />
      <polygon points="64,56 72,72 60,60" fill="#FF8C42" />
      <polygon points="42,68 50,84 58,68" fill="#FBBF24" opacity="0.7" />
      <polygon points="46,70 50,78 54,70" fill="white" opacity="0.6" />
    </svg>
  );
}

/* ═══════════════ 组件 ═══════════════ */

const SIZE_MAP = { sm: 44, md: 64, lg: 96 };

const POSE_EMOJI: Record<Pose, string> = {
  happy: '😊', thinking: '💡', cheer: '⭐', hello: '👋',
};

export default function CharacterAvatar({
  character, pose = 'happy', size = 'md', className = '', animation = 'none',
}: Props) {
  const px = SIZE_MAP[size];
  const animClass = animation === 'float' ? 'animate-float'
    : animation === 'bounce' ? 'animate-bounce-slight'
    : animation === 'wave' ? 'animate-wiggle' : '';

  const renderCharacter = () => {
    switch (character) {
      case 'xionger': return <BearEr size={px} />;
      case 'xiongda': return <BearDa size={px} />;
      case 'guangtouqiang': return <GuangTou size={px} />;
      case 'xiaoqiang': return <RocketIcon size={px} />;
      default: return <BearEr size={px} />;
    }
  };

  return (
    <motion.div
      className={`relative inline-flex ${animClass} ${className}`}
      whileHover={{ scale: 1.12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      {renderCharacter()}
      {/* 小表情气泡 */}
      <div
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-warm-border"
        style={{ fontSize: '10px' }}
      >
        {POSE_EMOJI[pose]}
      </div>
    </motion.div>
  );
}

export function CharacterDuo({ left, right, className = '' }: { left: Character; right: Character; className?: string }) {
  return (
    <div className={`flex items-end gap-1 ${className}`}>
      <CharacterAvatar character={left} pose="hello" size="sm" />
      <div className="w-8 h-4 border-l-2 border-b-2 border-warm-border rounded-bl-xl mb-1" />
      <CharacterAvatar character={right} pose="happy" size="sm" />
    </div>
  );
}

export function CharacterRow({ className = '' }: { className?: string }) {
  const chars: Character[] = ['xionger', 'xiongda', 'guangtouqiang'];
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      {chars.map(c => (
        <div key={c} className="text-center">
          <CharacterAvatar character={c} size="sm" animation="float" />
          <div className="text-[10px] text-ink-light font-bold mt-1">
            {c === 'guangtouqiang' ? '光头强' : c === 'xiongda' ? '熊大' : '熊二'}
          </div>
        </div>
      ))}
    </div>
  );
}
