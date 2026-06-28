import { motion } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';

type Character = 'guangtouqiang' | 'xiongda' | 'xionger' | 'xiaoqiang';
type Pose = 'happy' | 'thinking' | 'cheer' | 'hello';

interface Props {
  character?: Character;
  pose?: Pose;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animation?: 'float' | 'bounce' | 'wave' | 'none';
  /** 外部图片 (优先于 SVG, 用于官方立绘) */
  imageSrc?: string;
  /** object-position, 默认 center */
  imagePosition?: string;
  /** 图片填充模式, 默认 cover */
  imageFit?: 'cover' | 'contain';
}

/* ═══════════════════════════════════════════════
   Duolingo 活力风 — 粗描边 + 扁平亮色 + 大眼夸张
   设计原则:
     · 描边色 STROKE 深棕黑,粗细 2.5(viewBox 100)
     · 头占画面 60%,眼睛占脸 30%+
     · 腮红用鲜艳粉 + 0.6 opacity
     · 嘴区分姿势: 笑 / O型 / 大张 / 微笑
   ═══════════════════════════════════════════════ */

const STROKE = '#2D1B0E';
const SW = 2.5;

/* ─── 眼睛组件:根据姿势返回不同眼形 ─── */
function Eyes({ pose, cx = 40, cy = 38 }: { pose: Pose; cx?: number; cy?: number }) {
  const dx = 20; // 双眼间距
  switch (pose) {
    case 'happy':
      // 弯月眼
      return (
        <>
          <path d={`M${cx - 7} ${cy + 2} Q${cx - 3} ${cy - 3} ${cx + 1} ${cy + 2}`}
            stroke={STROKE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d={`M${cx + dx - 7} ${cy + 2} Q${cx + dx - 3} ${cy - 3} ${cx + dx + 1} ${cy + 2}`}
            stroke={STROKE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </>
      );
    case 'thinking':
      // 圆瞳大眼 + 高光 (往上看)
      return (
        <>
          <circle cx={cx} cy={cy - 1} r="4.5" fill="white" stroke={STROKE} strokeWidth="2" />
          <circle cx={cx + dx} cy={cy - 1} r="4.5" fill="white" stroke={STROKE} strokeWidth="2" />
          <circle cx={cx} cy={cy - 2} r="2.5" fill={STROKE} />
          <circle cx={cx + dx} cy={cy - 2} r="2.5" fill={STROKE} />
          <circle cx={cx - 0.8} cy={cy - 3} r="0.9" fill="white" />
          <circle cx={cx + dx - 0.8} cy={cy - 3} r="0.9" fill="white" />
        </>
      );
    case 'cheer':
      // 星星眼 ★
      return (
        <>
          <path d={`M${cx - 4} ${cy} L${cx} ${cy - 4} L${cx + 4} ${cy} L${cx} ${cy + 4} Z`}
            fill="#FBBF24" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
          <path d={`M${cx + dx - 4} ${cy} L${cx + dx} ${cy - 4} L${cx + dx + 4} ${cy} L${cx + dx} ${cy + 4} Z`}
            fill="#FBBF24" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );
    case 'hello':
      // 眯眼笑
      return (
        <>
          <path d={`M${cx - 5} ${cy} Q${cx} ${cy - 4} ${cx + 5} ${cy}`}
            stroke={STROKE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d={`M${cx + dx - 5} ${cy} Q${cx + dx} ${cy - 4} ${cx + dx + 5} ${cy}`}
            stroke={STROKE} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

/* ─── 嘴组件:根据姿势返回不同嘴形 ─── */
function Mouth({ pose, cx = 50, cy = 52 }: { pose: Pose; cx?: number; cy?: number }) {
  switch (pose) {
    case 'happy':
      return <path d={`M${cx - 6} ${cy} Q${cx} ${cy + 6} ${cx + 6} ${cy}`}
        stroke={STROKE} strokeWidth="2.5" fill="#FF6B6B" strokeLinejoin="round" strokeLinecap="round" />;
    case 'thinking':
      // O 型嘴 (困惑)
      return <ellipse cx={cx} cy={cy + 2} rx="3.5" ry="4.5" fill={STROKE} />;
    case 'cheer':
      // 大张嘴笑 (露舌)
      return (
        <path d={`M${cx - 7} ${cy} Q${cx} ${cy + 9} ${cx + 7} ${cy} Z`}
          fill="#FF6B6B" stroke={STROKE} strokeWidth="2.2" strokeLinejoin="round" />
      );
    case 'hello':
      return <path d={`M${cx - 5} ${cy} Q${cx} ${cy + 5} ${cx + 5} ${cy}`}
        stroke={STROKE} strokeWidth="2.5" fill="#FF6B6B" strokeLinejoin="round" strokeLinecap="round" />;
  }
}

/* ─── 熊二 (XiongEr) — 亮棕,胖圆,傻萌 ─── */
function BearEr({ pose = 'happy' }: { pose?: Pose }) {
  return (
    <>
      {/* 身体 */}
      <ellipse cx="50" cy="76" rx="32" ry="20" fill="#D4A574" stroke={STROKE} strokeWidth={SW} />
      {/* 肚子 */}
      <ellipse cx="50" cy="80" rx="22" ry="13" fill="#FFF2D9" stroke={STROKE} strokeWidth="1.8" />

      {/* 耳朵 (后) */}
      <circle cx="26" cy="20" r="11" fill="#D4A574" stroke={STROKE} strokeWidth={SW} />
      <circle cx="26" cy="20" r="5" fill="#FFB5B5" />
      <circle cx="74" cy="20" r="11" fill="#D4A574" stroke={STROKE} strokeWidth={SW} />
      <circle cx="74" cy="20" r="5" fill="#FFB5B5" />

      {/* 头 */}
      <circle cx="50" cy="40" r="30" fill="#D4A574" stroke={STROKE} strokeWidth={SW} />

      {/* 脸 */}
      <ellipse cx="50" cy="44" rx="20" ry="15" fill="#FFF2D9" />

      {/* 眼睛 */}
      <Eyes pose={pose} />

      {/* 腮红 (鲜艳粉) */}
      <circle cx="32" cy="46" r="4.5" fill="#FF8C8C" opacity="0.65" />
      <circle cx="68" cy="46" r="4.5" fill="#FF8C8C" opacity="0.65" />

      {/* 鼻子 */}
      <ellipse cx="50" cy="47" rx="4" ry="3" fill={STROKE} />
      {/* 鼻子下方小竖线 */}
      <line x1="50" y1="50" x2="50" y2="52" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />

      {/* 嘴 */}
      <Mouth pose={pose} />

      {/* 思考姿势:头顶问号 */}
      {pose === 'thinking' && (
        <text x="76" y="16" fontSize="14" fontWeight="900" fill={STROKE}>?</text>
      )}
      {/* cheer 姿势:头顶闪光 */}
      {pose === 'cheer' && (
        <>
          <text x="14" y="14" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
          <text x="80" y="14" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
        </>
      )}
    </>
  );
}

/* ─── 熊大 (XiongDa) — 深棕,严肃,粗眉,大个 ─── */
function BearDa({ pose = 'happy' }: { pose?: Pose }) {
  return (
    <>
      {/* 身体 (更深棕) */}
      <ellipse cx="50" cy="78" rx="33" ry="20" fill="#8B5E3C" stroke={STROKE} strokeWidth={SW} />
      <ellipse cx="50" cy="82" rx="22" ry="12" fill="#F5D4A1" stroke={STROKE} strokeWidth="1.8" />

      {/* 耳朵 */}
      <circle cx="25" cy="20" r="11" fill="#8B5E3C" stroke={STROKE} strokeWidth={SW} />
      <circle cx="25" cy="20" r="5" fill="#C49A5C" />
      <circle cx="75" cy="20" r="11" fill="#8B5E3C" stroke={STROKE} strokeWidth={SW} />
      <circle cx="75" cy="20" r="5" fill="#C49A5C" />

      {/* 头 (略大) */}
      <circle cx="50" cy="40" r="32" fill="#8B5E3C" stroke={STROKE} strokeWidth={SW} />

      {/* 脸 */}
      <ellipse cx="50" cy="44" rx="22" ry="16" fill="#F5D4A1" />

      {/* 粗眉 (熊大标志) — 不同姿势变化 */}
      {pose === 'thinking' ? (
        <>
          {/* 一高一低,思索状 */}
          <path d="M32 30 L48 32" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
          <path d="M52 30 L68 30" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : pose === 'cheer' ? (
        <>
          {/* 高扬眉 */}
          <path d="M32 32 Q40 28 48 32" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M52 32 Q60 28 68 32" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* 平直严肃眉 */}
          <path d="M32 31 L48 31" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
          <path d="M52 31 L68 31" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {/* 眼睛 */}
      <Eyes pose={pose} />

      {/* 腮红 (深粉,弱一些) */}
      <circle cx="30" cy="46" r="4" fill="#E8899A" opacity="0.5" />
      <circle cx="70" cy="46" r="4" fill="#E8899A" opacity="0.5" />

      {/* 鼻子 (大鼻头) */}
      <ellipse cx="50" cy="48" rx="5" ry="3.5" fill={STROKE} />
      <line x1="50" y1="51" x2="50" y2="53" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />

      {/* 嘴 */}
      <Mouth pose={pose} />

      {/* 思考姿势:问号 */}
      {pose === 'thinking' && (
        <text x="78" y="14" fontSize="14" fontWeight="900" fill={STROKE}>?</text>
      )}
      {pose === 'cheer' && (
        <>
          <text x="12" y="14" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
          <text x="82" y="14" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
        </>
      )}
    </>
  );
}

/* ─── 光头强 (GuangTouQiang) — 人类,光头,蓝工装,戴眼镜 ─── */
function GuangTou({ pose = 'happy' }: { pose?: Pose }) {
  return (
    <>
      {/* 身体 (蓝工装) */}
      <path d="M22 96 L22 78 Q22 70 30 68 L70 68 Q78 70 78 78 L78 96 Z"
        fill="#3B82F6" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
      {/* 工装中央分隔线 */}
      <line x1="50" y1="68" x2="50" y2="96" stroke={STROKE} strokeWidth="1.5" />
      {/* 工装口袋 */}
      <rect x="32" y="78" width="10" height="8" rx="1.5" fill="#2563EB" stroke={STROKE} strokeWidth="1.5" />
      <rect x="58" y="78" width="10" height="8" rx="1.5" fill="#2563EB" stroke={STROKE} strokeWidth="1.5" />
      {/* 衣领 V 字 */}
      <path d="M40 68 L50 78 L60 68" stroke={STROKE} strokeWidth="2" fill="#5B9ED4" strokeLinejoin="round" />

      {/* 脖子 */}
      <rect x="44" y="60" width="12" height="10" fill="#FFD5A5" stroke={STROKE} strokeWidth="1.5" />

      {/* 头 (光头!) */}
      <circle cx="50" cy="40" r="28" fill="#FFE0BD" stroke={STROKE} strokeWidth={SW} />

      {/* 几根头发 (杜洛克风的呆毛) */}
      <path d="M38 16 Q40 8 44 14" stroke={STROKE} strokeWidth="2.5" fill="#3D2817" strokeLinecap="round" />
      <path d="M50 14 Q52 6 56 12" stroke={STROKE} strokeWidth="2.5" fill="#3D2817" strokeLinecap="round" />
      <path d="M62 16 Q64 10 68 16" stroke={STROKE} strokeWidth="2.5" fill="#3D2817" strokeLinecap="round" />

      {/* 眼镜框 (Duolingo 风格大圆框) */}
      <circle cx="38" cy="40" r="8" fill="white" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="62" cy="40" r="8" fill="white" stroke={STROKE} strokeWidth="2.5" />
      <line x1="46" y1="40" x2="54" y2="40" stroke={STROKE} strokeWidth="2" />
      {/* 眼镜腿 */}
      <line x1="30" y1="40" x2="26" y2="42" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="40" x2="74" y2="42" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />

      {/* 眼睛 — 在眼镜片内 */}
      {pose === 'happy' && (
        <>
          <path d="M34 41 Q38 37 42 41" stroke={STROKE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M58 41 Q62 37 66 41" stroke={STROKE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {pose === 'thinking' && (
        <>
          <circle cx="38" cy="40" r="3" fill={STROKE} />
          <circle cx="62" cy="40" r="3" fill={STROKE} />
          <circle cx="39" cy="39" r="0.8" fill="white" />
          <circle cx="63" cy="39" r="0.8" fill="white" />
        </>
      )}
      {pose === 'cheer' && (
        <>
          <path d="M33 40 L43 40 M36 36 L40 44 M40 36 L36 44" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          <path d="M57 40 L67 40 M60 36 L64 44 M64 36 L60 44" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {pose === 'hello' && (
        <>
          <path d="M34 41 Q38 37 42 41" stroke={STROKE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M58 41 Q62 37 66 41" stroke={STROKE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* 腮红 */}
      <circle cx="26" cy="48" r="3.5" fill="#FF8C8C" opacity="0.55" />
      <circle cx="74" cy="48" r="3.5" fill="#FF8C8C" opacity="0.55" />

      {/* 鼻子 (T 字) */}
      <path d="M47 49 L50 53 L53 49" stroke={STROKE} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* 嘴 */}
      <Mouth pose={pose} />

      {/* 思考姿势:问号 */}
      {pose === 'thinking' && (
        <text x="80" y="14" fontSize="14" fontWeight="900" fill={STROKE}>?</text>
      )}
      {pose === 'cheer' && (
        <>
          <text x="10" y="14" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
          <text x="84" y="14" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
        </>
      )}
    </>
  );
}

/* ─── 火箭 (XiaoQiang / Rocket) — 神秘角色 ─── */
function RocketIcon({ pose = 'happy' }: { pose?: Pose }) {
  return (
    <>
      {/* 火焰 */}
      <path d="M40 78 L50 92 L60 78 Z" fill="#FF8C42" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 78 L50 86 L56 78 Z" fill="#FBBF24" />

      {/* 火箭主体 */}
      <ellipse cx="50" cy="50" rx="16" ry="22" fill="#5B9A5A" stroke={STROKE} strokeWidth={SW} />

      {/* 顶帽 (三角) */}
      <path d="M50 22 L42 32 L58 32 Z" fill="#FF6B6B" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />

      {/* 机翼 */}
      <path d="M34 56 L26 70 L36 64 Z" fill="#FF8C42" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M66 56 L74 70 L64 64 Z" fill="#FF8C42" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />

      {/* 舷窗 (大眼睛) */}
      <circle cx="50" cy="48" r="7" fill="white" stroke={STROKE} strokeWidth="2.2" />
      {pose === 'happy' || pose === 'hello' ? (
        <>
          <circle cx="50" cy="48" r="3.5" fill={STROKE} />
          <circle cx="51.5" cy="46.5" r="1.2" fill="white" />
        </>
      ) : pose === 'thinking' ? (
        <>
          <circle cx="50" cy="46" r="3.5" fill={STROKE} />
          <circle cx="51.5" cy="44.5" r="1.2" fill="white" />
        </>
      ) : (
        <>
          <path d="M44 48 L56 48 M48 44 L52 52 M52 44 L48 52" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {/* 嘴 (小) */}
      <Mouth pose={pose} cx={50} cy={62} />

      {/* 装饰小星星 */}
      <text x="14" y="20" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
      <text x="82" y="22" fontSize="10" fontWeight="900" fill="#FBBF24" stroke={STROKE} strokeWidth="0.8">✦</text>
    </>
  );
}

/* ═══════════════ 组件 ═══════════════ */

const SIZE_MAP = { sm: 44, md: 64, lg: 96 };

const POSE_EMOJI: Record<Pose, string> = {
  happy: '😊', thinking: '💡', cheer: '⭐', hello: '👋',
};

export default function CharacterAvatar({
  character = 'xionger', pose = 'happy', size = 'md', className = '', animation = 'none',
  imageSrc, imagePosition = 'center', imageFit = 'cover',
}: Props) {
  const px = SIZE_MAP[size];
  const animClass = animation === 'float' ? 'animate-float'
    : animation === 'bounce' ? 'animate-bounce-slight'
    : animation === 'wave' ? 'animate-wiggle' : '';

  const renderCharacter = () => {
    switch (character) {
      case 'xionger': return <BearEr pose={pose} />;
      case 'xiongda': return <BearDa pose={pose} />;
      case 'guangtouqiang': return <GuangTou pose={pose} />;
      case 'xiaoqiang': return <RocketIcon pose={pose} />;
      default: return <BearEr pose={pose} />;
    }
  };

  // 图片模式:用 <img> 替代 SVG,头部圆角矩形
  const renderAvatar = () => {
    if (imageSrc) {
      return (
        <img
          src={imageSrc}
          alt="角色头像"
          width={px}
          height={px}
          className="rounded-2xl object-cover shadow-sm border-2 border-warm-border"
          style={{ objectPosition: imagePosition }}
          loading="lazy"
        />
      );
    }
    return (
      <svg width={px} height={px} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {renderCharacter()}
      </svg>
    );
  };

  return (
    <motion.div
      className={`relative inline-flex ${animClass} ${className}`}
      whileHover={{ scale: 1.12 }}
      transition={springs.hover}
    >
      {renderAvatar()}
      {/* 小表情气泡 (SVG 模式才显示) */}
      {!imageSrc && (
        <div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-warm-border"
          style={{ fontSize: '10px' }}
        >
          {POSE_EMOJI[pose]}
        </div>
      )}
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