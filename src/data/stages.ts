// 新概念英语第一册 — 六阶段定义
// 熊出没·重启未来主题

export interface StageInfo {
  id: number;
  name: string;           // 主题名
  subtitle: string;       // 副标题
  icon: string;           // emoji
  planetColor: string;    // 星球颜色（Tailwind class）
  glowColor: string;      // 发光色
  description: string;    // 阶段描述
  lessonStart: number;    // 起始课号
  lessonEnd: number;      // 结束课号
  groups: string[];       // 包含的课组
  abilityGoal: string;    // 能力目标
  grammarSummary: string; // 语法概要
}

export const STAGES: StageInfo[] = [
  {
    id: 1,
    name: '基础建设者',
    subtitle: '搭建英语世界的基石',
    icon: '🧱',
    planetColor: 'from-slate-500 to-blue-400',
    glowColor: 'rgba(100, 150, 220, 0.5)',
    description: '用be动词、主系表、一般疑问句等基础结构，建造英语世界的第一批建筑。',
    lessonStart: 1,
    lessonEnd: 24,
    groups: ['lesson-01-02', 'lesson-03-04', 'lesson-05-06', 'lesson-07-08',
             'lesson-09-10', 'lesson-11-12', 'lesson-13-14', 'lesson-15-16',
             'lesson-17-18', 'lesson-19-20', 'lesson-21-22', 'lesson-23-24'],
    abilityGoal: '能用英语说出一个完整的简单句',
    grammarSummary: 'be动词 · 主系表 · 一般疑问句 · 名词复数 · 物主代词 · 双宾语',
  },
  {
    id: 2,
    name: '行动先锋',
    subtitle: '让语言动起来',
    icon: '⚡',
    planetColor: 'from-yellow-600 to-amber-400',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    description: '学习现在进行时、There be句型、情态动词，让句子有了动作和活力。',
    lessonStart: 25,
    lessonEnd: 48,
    groups: ['lesson-25-26','lesson-27-28','lesson-29-30','lesson-31-32','lesson-33-34','lesson-35-36','lesson-37-38','lesson-39-40','lesson-41-42','lesson-43-44','lesson-45-46','lesson-47-48'],
    abilityGoal: '能描述正在发生的事、存在的物品、表达能力和义务',
    grammarSummary: '现在进行时 · There be · 情态动词(can/must) · 一般将来时',
  },
  {
    id: 3,
    name: '过去回溯者',
    subtitle: '穿越时间的故事',
    icon: '⏪',
    planetColor: 'from-amber-600 to-orange-400',
    glowColor: 'rgba(251, 146, 60, 0.5)',
    description: '掌握一般过去时和比较级，能够讲述过去的故事，比较事物的差异。',
    lessonStart: 49,
    lessonEnd: 72,
    groups: ['lesson-49-50', 'lesson-51-52', 'lesson-53-54', 'lesson-55-56', 'lesson-57-58', 'lesson-59-60', 'lesson-61-62', 'lesson-63-64', 'lesson-65-66', 'lesson-67-68', 'lesson-69-70', 'lesson-71-72'],
    abilityGoal: '能讲述过去的事、比较事物、表达计划',
    grammarSummary: '一般过去时 · 形容词比较级 · be going to · 时间介词',
  },
  {
    id: 4,
    name: '时间编织者',
    subtitle: '编织复杂的时间线',
    icon: '🔗',
    planetColor: 'from-amber-700 to-yellow-700',
    glowColor: 'rgba(180, 120, 40, 0.5)',
    description: '学会现在完成时和过去进行时，能够处理更复杂的时间关系和表达。',
    lessonStart: 73,
    lessonEnd: 96,
    groups: [],
    abilityGoal: '能表达已完成的事、描述过去的进行场景',
    grammarSummary: '现在完成时 · 过去进行时 · 不定式 · 时间状语从句',
  },
  {
    id: 5,
    name: '逻辑大师',
    subtitle: '构建思维的框架',
    icon: '🧠',
    planetColor: 'from-purple-600 to-violet-400',
    glowColor: 'rgba(167, 139, 250, 0.5)',
    description: '用宾语从句、条件句、间接引语，让表达有了逻辑层次和思辨能力。',
    lessonStart: 97,
    lessonEnd: 120,
    groups: [],
    abilityGoal: '能转述别人的话、表达条件和因果关系',
    grammarSummary: '宾语从句 · 条件句(第一类) · 直接/间接引语 · 定语从句初步',
  },
  {
    id: 6,
    name: '文明守护者',
    subtitle: '守护完整的语言文明',
    icon: '🏛️',
    planetColor: 'from-cyan-500 to-purple-500',
    glowColor: 'rgba(200, 100, 255, 0.5)',
    description: '掌握被动语态和高级条件句，完成新概念英语第一册的全部语法体系。',
    lessonStart: 121,
    lessonEnd: 144,
    groups: [],
    abilityGoal: '能自如应对各类日常场景的英语交流',
    grammarSummary: '被动语态 · 条件句(第二类) · 现在完成进行时 · 综合应用',
  },
];

// 根据课组获取所属阶段
export function getStageByGroup(group: string): StageInfo | undefined {
  return STAGES.find(s => s.groups.includes(group));
}

// 根据阶段ID获取所有课组
export function getGroupsByStage(stageId: number): string[] {
  const stage = STAGES.find(s => s.id === stageId);
  return stage?.groups || [];
}

// 获取当前阶段（根据已解锁的课组）
export function getCurrentStage(unlockedGroups: string[]): StageInfo {
  for (const stage of STAGES) {
    if (stage.groups.some(g => !unlockedGroups.includes(g))) {
      return stage;
    }
  }
  return STAGES[STAGES.length - 1];
}
