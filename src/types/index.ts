// ===== 题型枚举 =====
export type QuestionType =
  | 'choice'       // 词汇/语法选择题
  | 'fill'         // 填空拼写题
  | 'translate'    // 翻译题
  | 'reorder'      // 连词成句
  | 'listening'    // 听力题
  | 'speak';       // 口语题

export type Difficulty = 'easy' | 'medium' | 'hard';

// 学习块类型（Phase 1.5 新增）
export type BlockType = 'vocabulary' | 'grammar' | 'sentence' | 'listening';

// ===== 题目定义 =====
export interface ChoiceQuestion {
  id: string;
  type: 'choice';
  lessonGroup: string;        // 如 'lesson-01-02'
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];              // 知识点标签: ['be动词', '一般疑问句']
  block?: BlockType;           // 所属学习块（Phase 1.5 新增）
  prompt: string;              // 题干: "选择正确的翻译"
  question?: string;           // 具体问题（可选）
  options: string[];           // 4个选项
  correctIndex: number;        // 正确答案索引
  explanation: string;         // 解析说明
}

export interface FillQuestion {
  id: string;
  type: 'fill';
  lessonGroup: string;
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];
  block?: BlockType;           // 所属学习块（Phase 1.5 新增）
  prompt: string;
  sentence: string;            // 含空格的句子: "This ___ my book."
  sentenceBefore?: string;     // 填空前的句子部分
  sentenceAfter?: string;      // 填空后的句子部分
  answer: string;              // 正确答案
  acceptableAnswers: string[]; // 可接受的其他答案
  hint: string;                // 提示: "填入be动词的正确形式"
  explanation: string;
}

export interface TranslateQuestion {
  id: string;
  type: 'translate';
  lessonGroup: string;
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];
  block?: BlockType;           // 所属学习块（Phase 1.5 新增）
  prompt: string;              // "请将以下中文翻译成英文"
  sourceText: string;          // 源语言文本
  direction: 'cn2en' | 'en2cn';
  acceptableAnswers: string[]; // 可接受的答案列表（用于模糊匹配）
  keywords: string[];          // 必须包含的关键词
  explanation: string;
}

export interface ReorderQuestion {
  id: string;
  type: 'reorder';
  lessonGroup: string;
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];
  block?: BlockType;           // 所属学习块（Phase 1.5 新增）
  prompt: string;              // "请将以下单词排列成正确的句子"
  words: string[];             // 乱序单词
  correctOrder: number[];      // 正确顺序索引
  correctSentence: string;     // 正确句子（用于展示）
  explanation: string;
}

export interface ListeningQuestion {
  id: string;
  type: 'listening';
  lessonGroup: string;
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];
  block?: BlockType;           // 所属学习块（Phase 1.5 新增）
  prompt: string;              // "听音频，选择正确的答案"
  audioSrc: string;            // 音频文件路径
  audioStartTime?: number;     // 起始时间戳（秒）
  audioEndTime?: number;       // 结束时间戳（秒）
  transcript: string;          // 听力文本（答题后展示）
  question: string;            // 基于听力内容的问题
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SpeakingQuestion {
  id: string;
  type: 'speak';
  lessonGroup: string;
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];
  block?: BlockType;
  prompt: string;
  sentence: string;
  chineseHint: string;
  keywords: string[];
  explanation: string;
}

export type Question =
  | ChoiceQuestion
  | FillQuestion
  | TranslateQuestion
  | ReorderQuestion
  | ListeningQuestion
  | SpeakingQuestion;

// ===== 用户数据 =====
export interface UserState {
  id: string;                   // 'me'
  totalXp: number;
  streakDays: number;
  lastPracticeDate: string;     // 'YYYY-MM-DD'
  hearts: number;               // 0-5
  heartsRefillTime: number;     // timestamp
  unlockedAchievements: string[];
  totalQuestionsAnswered: number;
  totalCorrect: number;
  createdAt: string;            // ISO date
}

// ===== 答题记录 =====
export interface AnswerRecord {
  id?: number;
  questionId: string;
  lessonGroup: string;
  questionType: QuestionType;
  correct: boolean;
  userAnswer: string;
  timestamp: number;
  timeSpent: number;            // 秒
  isFirstAttempt?: boolean;     // 是否首次作答（Phase 1.5 新增）
}

// ===== 间隔复习 =====
export interface ReviewSchedule {
  id?: number;
  lessonGroup: string;
  stage: number;         // 1, 3, 7, 30
  dueAt: number;         // 到期时间戳
  status: 'pending' | 'completed' | 'failed';
  score?: number;        // 复习得分 0-100
}

// ===== 错题 =====
export interface WrongQuestion {
  questionId: string;
  wrongCount: number;
  lastWrongTime: number;
  nextReviewTime: number;       // 下次复习时间戳
  mastered: boolean;
}

// 错题分析 API 返回类型 (V7)
export interface WrongQuestionItem {
  question_id: string;
  lesson_group: string;
  question_type: string;
  user_answer: string;
  question_text: string;
  correct_answer: string;
  difficulty: string;
  wrong_count: number;
  created_at: string;
  has_corrected?: boolean;
  corrected_at?: string;
  last_attempt_at?: string;
}

export interface WrongQuestionSummary {
  total_wrong: number;
  corrected?: number;
  by_type: Record<string, number>;
  by_lesson: Record<string, number>;
  most_missed_type: string;
  most_missed_lesson: string;
}

// ===== 课程闯关进度 =====
export interface LessonProgress {
  lessonGroup: string;           // 'lesson-01-02'
  completed: boolean;            // 是否已过关（100%正确率）
  bestAccuracy: number;          // 最佳正确率 0-1
  attempts: number;              // 尝试次数
  lastAttemptAt: number;         // 最近一次尝试时间戳
  completedAt: number;           // 首次过关时间戳
  status?: 'locked' | 'unlocked' | 'in_progress' | 'completed';  // V10: 四态
  unlocked_by?: string;          // 'sequential' | 'reward' | 'parent' | ''
  unlocked_at?: string;          // 解锁时间
  // Phase 1.5 新增：按学习块细分进度
  blockProgress?: {
    vocabulary: boolean;
    grammar: boolean;
    sentence: boolean;
    listening: boolean;
  };
}

// ===== 每日统计 =====
export interface DailyStats {
  date: string;
  questionsAnswered: number;
  correctCount: number;
  xpEarned: number;
  minutesSpent: number;
}

// ===== 成就定义 =====
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;                 // emoji
  category: 'milestone' | 'skill' | 'special';
  check: (stats: AchievementCheckStats) => boolean;
}

export interface AchievementCheckStats {
  totalXp: number;
  streakDays: number;
  totalQuestions: number;
  totalCorrect: number;
  choiceCorrect: number;
  fillCorrect: number;
  translateCorrect: number;
  reorderCorrect: number;
  listeningCorrect: number;
  perfectLessons: string[];
  bestCombo: number;
  lastAnswerTime: number;       // timestamp
  dailyCorrect: number;
  dailyTotal: number;
}

// ===== 段位 =====
export interface Rank {
  level: number;
  name: string;
  minXp: number;
  color: string;                // tailwind color class 或 hex
  icon?: string;                // emoji 段位徽章
}

// ===== 课文元数据 =====
export interface LessonMeta {
  lessonNumber: number;
  title: string;
  titleCn: string;
  group: string;                // 'lesson-01-02'
  groupId: string;              // 课组ID，同 group（Phase 1.5 新增）
  stage: number;                // 所属阶段 1-6（Phase 1.5 新增）
  grammarTopics: string[];
  vocabularyCount: number;
  vocabulary: string[];         // 该课重点单词（Phase 1.5 新增）
  sentencePatterns: string[];   // 核心句型（Phase 1.5 新增）
  audioSrc: string;             // 音频路径（Phase 1.5 新增）
}

// ===== 练习会话 =====
export interface PracticeConfig {
  lessonGroups: string[];       // 选择的课文组
  questionCount: number;        // 每组题目数量
  types: QuestionType[];        // 包含的题型
  shuffle: boolean;
}

export interface PracticeSession {
  config: PracticeConfig;
  questions: Question[];
  currentIndex: number;
  answers: SessionAnswer[];
  startTime: number;
  combo: number;
  bestCombo: number;
}

export interface SessionAnswer {
  questionId: string;
  correct: boolean;
  userAnswer: string;
  timeSpent: number;
}

// ===== Phase 1.5 新增：综合测试 =====
export interface ComprehensiveTest {
  lessonGroup: string;
  questions: Question[];
  currentIndex: number;
  wrongQuestions: Question[];
  correctCount: number;
  status: 'idle' | 'active' | 'review' | 'completed';
}

// ===== Phase 1.5 新增：间隔复习 =====
export interface SpacedReviewItem {
  questionId: string;
  lessonGroup: string;
  stage: number;        // 0=初始, 1=1天, 2=3天, 3=7天, 4=30天, 5=永久掌握
  dueAt: number;
  status: 'pending' | 'passed' | 'failed';
}
