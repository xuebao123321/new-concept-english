// 熊出没·重启未来 — 卡通角色 SVG 插画
// 风格参考电影海报：圆润造型、科幻护目镜、能量光效

type Character = 'xiongda' | 'xionger' | 'guangtouqiang' | 'xiaoqiang';
type Scene = 'hero' | 'banner' | 'avatar' | 'celebration';

interface Props {
  character: Character;
  scene?: Scene;
  size?: number;
  className?: string;
}

/* ─── 角色配色（参考电影海报） ─── */
type BearColors = { body: string; belly: string; nose: string; ears: string; goggles: string };
type HumanColors = { skin: string; hair: string; clothes: string; accent: string; goggles: string };
type RobotColors = { body: string; face: string; eye: string; accent: string };

const XIONGER: BearColors = { body: '#C4956A', belly: '#F0D5B0', nose: '#5C3A28', ears: '#9B6F50', goggles: '#FBBF24' };
const XIONGDA: BearColors = { body: '#8B5E3C', belly: '#D4A574', nose: '#3D2B1F', ears: '#6B3F2A', goggles: '#5B9ED4' };
const GUANGTOUQIANG: HumanColors = { skin: '#FFD5B8', hair: '#2D1B0E', clothes: '#5B9ED4', accent: '#3B82F6', goggles: '#5B9ED4' };
const XIAOQIANG: RobotColors = { body: '#94A3B8', face: '#CBD5E1', eye: '#5B9ED4', accent: '#7E57C2' };

export default function CharacterIllustration({ character, scene = 'avatar', size = 80, className = '' }: Props) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.08))' }}>
        {character === 'xionger' && <XiongerSVG c={XIONGER} scene={scene} />}
        {character === 'xiongda' && <XiongdaSVG c={XIONGDA} scene={scene} />}
        {character === 'guangtouqiang' && <GuangtouqiangSVG c={GUANGTOUQIANG} scene={scene} />}
        {character === 'xiaoqiang' && <XiaoqiangSVG c={XIAOQIANG} scene={scene} />}
      </svg>
    </div>
  );
}

/* ─── 熊二（暖色系，圆润可爱） ─── */
function XiongerSVG({ c, scene }: { c: BearColors; scene: Scene }) {
  return (
    <>
      {/* 身体光晕 */}
      {scene === 'celebration' && <circle cx="50" cy="55" r="45" fill="none" stroke="#FBBF24" strokeWidth="2" opacity="0.3">
        <animate attributeName="r" values="42;48;42" dur="1.5s" repeatCount="indefinite" />
      </circle>}
      {/* 耳朵 */}
      <circle cx="28" cy="22" r="14" fill={c.ears} />
      <circle cx="72" cy="22" r="14" fill={c.ears} />
      <circle cx="28" cy="22" r="8" fill={c.belly} opacity="0.5" />
      <circle cx="72" cy="22" r="8" fill={c.belly} opacity="0.5" />
      {/* 头 */}
      <ellipse cx="50" cy="42" rx="32" ry="30" fill={c.body} />
      {/* 脸 */}
      <ellipse cx="50" cy="48" rx="22" ry="18" fill={c.belly} />
      {/* 眼睛 */}
      <ellipse cx="40" cy="38" rx="7" ry="8" fill="white" />
      <ellipse cx="60" cy="38" rx="7" ry="8" fill="white" />
      <circle cx="41" cy="39" r="4" fill="#2D1B0E" />
      <circle cx="61" cy="39" r="4" fill="#2D1B0E" />
      <circle cx="42" cy="37" r="1.5" fill="white" />
      <circle cx="62" cy="37" r="1.5" fill="white" />
      {/* 护目镜（科幻元素） */}
      {scene !== 'avatar' && (
        <rect x="28" y="30" width="44" height="14" rx="7" fill={c.goggles} opacity="0.6" stroke={c.goggles} strokeWidth="1.5" />
      )}
      {/* 鼻子 */}
      <ellipse cx="50" cy="46" rx="6" ry="4.5" fill={c.nose} />
      {/* 嘴 */}
      <path d="M44 52 Q50 58 56 52" fill="none" stroke={c.nose} strokeWidth="1.5" strokeLinecap="round" />
      {/* 身体 */}
      <ellipse cx="50" cy="78" rx="24" ry="18" fill={c.body} />
      <ellipse cx="50" cy="74" rx="16" ry="11" fill={c.belly} />
    </>
  );
}

/* ─── 熊大（深色系，可靠稳重） ─── */
function XiongdaSVG({ c, scene }: { c: BearColors; scene: Scene }) {
  return (
    <>
      {scene === 'celebration' && <circle cx="50" cy="55" r="45" fill="none" stroke="#FBBF24" strokeWidth="2" opacity="0.3">
        <animate attributeName="r" values="42;48;42" dur="1.5s" repeatCount="indefinite" />
      </circle>}
      <circle cx="30" cy="24" r="13" fill={c.ears} />
      <circle cx="70" cy="24" r="13" fill={c.ears} />
      <circle cx="30" cy="24" r="7" fill="#C4956A" opacity="0.4" />
      <circle cx="70" cy="24" r="7" fill="#C4956A" opacity="0.4" />
      <ellipse cx="50" cy="42" rx="30" ry="28" fill={c.body} />
      <ellipse cx="50" cy="47" rx="20" ry="16" fill={c.belly} />
      {/* 眼睛 — 更坚定 */}
      <ellipse cx="39" cy="38" rx="6.5" ry="7.5" fill="white" />
      <ellipse cx="61" cy="38" rx="6.5" ry="7.5" fill="white" />
      <circle cx="40" cy="39" r="3.5" fill="#1A0F08" />
      <circle cx="62" cy="39" r="3.5" fill="#1A0F08" />
      {/* 护目镜 */}
      <rect x="28" y="30" width="44" height="13" rx="6.5" fill="#5B9ED4" opacity="0.5" stroke="#5B9ED4" strokeWidth="1.5" />
      <ellipse cx="50" cy="45" rx="5.5" ry="4" fill={c.nose} />
      <path d="M43 51 Q50 56 57 51" fill="none" stroke={c.nose} strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="50" cy="78" rx="22" ry="17" fill={c.body} />
      <ellipse cx="50" cy="74" rx="15" ry="10" fill={c.belly} />
    </>
  );
}

/* ─── 光头强（发明家，蓝衣护目镜） ─── */
function GuangtouqiangSVG({ c, scene }: { c: HumanColors; scene: Scene }) {
  return (
    <>
      {scene === 'celebration' && <circle cx="50" cy="55" r="45" fill="none" stroke="#3B82F6" strokeWidth="2" opacity="0.3">
        <animate attributeName="r" values="42;48;42" dur="1.5s" repeatCount="indefinite" />
      </circle>}
      {/* 头发 */}
      <ellipse cx="50" cy="18" rx="18" ry="10" fill={c.hair} />
      {/* 头 */}
      <ellipse cx="50" cy="40" rx="24" ry="26" fill={c.skin} />
      {/* 护目镜（标志性装备） */}
      <rect x="24" y="31" width="52" height="15" rx="7.5" fill={c.goggles} opacity="0.7" stroke="#0891B2" strokeWidth="1.5" />
      <rect x="26" y="33" width="48" height="11" rx="5.5" fill="#67E8F9" opacity="0.4" />
      {/* 眼睛 */}
      <ellipse cx="39" cy="38" rx="5" ry="6" fill="white" />
      <ellipse cx="61" cy="38" rx="5" ry="6" fill="white" />
      <circle cx="40" cy="39" r="3" fill="#1A0F08" />
      <circle cx="62" cy="39" r="3" fill="#1A0F08" />
      {/* 嘴 */}
      <path d="M44 50 Q50 55 56 50" fill="none" stroke="#C4957B" strokeWidth="1.5" strokeLinecap="round" />
      {/* 身体 — 蓝色工装 */}
      <rect x="30" y="58" width="40" height="32" rx="6" fill={c.clothes} />
      <rect x="34" y="62" width="32" height="24" rx="4" fill={c.accent} opacity="0.3" />
      {/* 衣领 */}
      <path d="M38 58 L50 68 L62 58" fill={c.accent} stroke={c.accent} strokeWidth="1" />
    </>
  );
}

/* ─── 小铁（机器人，方头圆角） ─── */
function XiaoqiangSVG({ c, scene }: { c: RobotColors; scene: Scene }) {
  return (
    <>
      {scene === 'celebration' && <circle cx="50" cy="55" r="42" fill="none" stroke="#7C3AED" strokeWidth="2" opacity="0.3">
        <animate attributeName="r" values="40;45;40" dur="1.2s" repeatCount="indefinite" />
      </circle>}
      {/* 天线 */}
      <line x1="50" y1="6" x2="50" y2="16" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="4" r="4" fill={c.eye}><animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" /></circle>
      {/* 头 */}
      <rect x="26" y="16" width="48" height="40" rx="10" fill={c.body} />
      <rect x="30" y="20" width="40" height="32" rx="8" fill={c.face} />
      {/* 眼睛 */}
      <ellipse cx="39" cy="34" rx="7" ry="8" fill="white" />
      <ellipse cx="61" cy="34" rx="7" ry="8" fill="white" />
      <circle cx="39" cy="34" r="4.5" fill={c.eye} />
      <circle cx="61" cy="34" r="4.5" fill={c.eye} />
      {/* 嘴 — LED 风格 */}
      <rect x="38" y="46" width="24" height="5" rx="2.5" fill={c.eye} opacity="0.6" />
      {[40, 45, 50, 55, 60].map((x, i) => (
        <rect key={i} x={x} y="46.5" width="3" height="4" rx="1" fill={c.eye} opacity={0.8 - i * 0.1} />
      ))}
      {/* 身体 */}
      <rect x="34" y="60" width="32" height="30" rx="6" fill={c.body} />
      <circle cx="42" cy="72" r="5" fill={c.accent} opacity="0.5" />
      <circle cx="58" cy="72" r="5" fill={c.accent} opacity="0.5" />
    </>
  );
}
