# 新概念英语 · 智能练习系统 开发文档

> 版本：v1.0  
> 日期：2026-06-26  
> 状态：Phase 1 本地版已完成 / Phase 2 云端版规划中  
> 主题：熊出没·重启未来

---

## 一、项目概述

### 1.1 产品定位

面向小学生的新概念英语第一册智能练习系统。以"熊出没·重启未来"为主题，通过诊断-学习-巩固的 mastery 体系，确保孩子真正掌握每一课的全部内容。最终目标覆盖新概念英语第一册全部144课。

### 1.2 核心差异化

| 维度 | 传统刷题 | 本系统 |
|------|---------|--------|
| 目标 | 做了就行 | **每道题都必须掌握** |
| 进度 | 做完就过 | **100%正确率才解锁下一课** |
| 复习 | 无 | **1/3/7/30天间隔巩固，失败回炉** |
| 跨课 | 无 | **学新课时自动混入旧课题防止遗忘** |
| 结构感 | 无 | **六阶段星球探索地图** |
| 诊断 | 无 | **快速定位薄弱课，针对性学习** |
| 激励 | 分数 | **熊出没主题角色 + 星球修复 + 徽章收藏** |

### 1.3 发展路线

```
Phase 1（当前）          Phase 2（规划中）         Phase 3（远期）
─────────────────      ─────────────────      ─────────────────
单用户本地版             多用户云端版             AI 智能出题
React SPA               React + 后端 API        自适应难度
IndexedDB 本地存储       Turso 云数据库          语音评测
无登录                  账号系统                 家长端独立入口
L1-24 题库（357题）      L1-144 全覆盖           学习报告推送
```

---

## 二、技术架构

### 2.1 Phase 1 架构（当前）

```
┌─────────────────────────────────────────────────┐
│                    浏览器                         │
│  ┌───────────────────────────────────────────┐  │
│  │         React 18 + TypeScript             │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │ Zustand │ │ Dexie.js │ │  Framer   │  │  │
│  │  │ 状态管理 │ │ IndexedDB│ │  Motion   │  │  │
│  │  └─────────┘ └──────────┘ └───────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                      │                           │
│               Vite + Tailwind CSS                 │
│                      │                           │
│              纯静态 HTML/CSS/JS                    │
└─────────────────────────────────────────────────┘
                       │
                ┌──────┴──────┐
                │   部署平台   │
                │  Vercel /   │
                │  Cloudflare │
                │   Pages     │
                └─────────────┘
```

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**: Zustand（内存态）+ Dexie.js（持久化 IndexedDB）
- **动画**: Framer Motion
- **音频**: Howler.js
- **离线**: PWA（vite-plugin-pwa）
- **部署**: 纯静态文件，Vercel/Cloudflare Pages 免费托管

### 2.2 Phase 2 目标架构（多用户云端版）

```
┌──────────────────────────────────────────────────────────┐
│                        客户端                             │
│  ┌────────────────────┐    ┌────────────────────┐       │
│  │   Web 浏览器       │    │   PWA 离线模式      │       │
│  │   React SPA        │    │   Service Worker   │       │
│  └────────┬───────────┘    └────────┬───────────┘       │
│           │                         │                    │
│           │    HTTPS API            │  本地 IndexedDB    │
│           │    (JSON + JWT)         │  离线数据同步       │
└───────────┼─────────────────────────┼────────────────────┘
            │                         │
      ┌─────┴──────────┐              │
      │   后端 API       │              │
      │  (Python FastAPI │              │
      │   或 Node.js)    │              │
      │                 │              │
      │  ┌───────────┐  │              │
      │  │ JWT 认证   │  │              │
      │  │ 用户管理   │  │              │
      │  │ 题库管理   │  │              │
      │  │ 学习记录   │  │              │
      │  └─────┬─────┘  │              │
      └────────┼────────┘              │
               │                       │
         ┌─────┴─────┐                 │
         │   Turso    │                 │
         │  云数据库   │                 │
         │ (免费 tier) │                 │
         └───────────┘                 │
                                       │
         部署：Vercel (前端) +           │
         Vercel Serverless (后端)        │
         或 Railway (后端)               │
```

### 2.3 技术选型对比（Phase 1 vs Phase 2）

| 层级 | Phase 1 | Phase 2 |
|------|---------|---------|
| 前端框架 | React 18 + TS | React 18 + TS（不变） |
| 状态管理 | Zustand + Dexie.js | Zustand + 后端 API |
| 本地存储 | IndexedDB | IndexedDB（离线缓存） |
| 云数据库 | 无 | Turso（免费 tier） |
| 后端 | 无（纯静态） | FastAPI / NestJS |
| 认证 | 无（单用户） | JWT + 密码哈希 |
| 部署 | Vercel（免费） | Vercel + Vercel Functions |
| 域名 | vercel.app 子域名 | 可绑定自定义域名 |

### 2.4 技术选型理由

| 选型 | 理由 |
|------|------|
| **Turso** | 免费 tier 慷慨（9GB/500库/10亿行读），SQLite 兼容，已有 `turso_adapter.py` 经验 |
| **IndexedDB → Turso 双轨** | 借鉴考试系统的 SQLite/Turso 双模式，本地开发零配置，生产一键切换 |
| **Vercel** | 前端免费无限量，Serverless 函数 100GB-小时/月，自动 CI/CD |
| **Zustand + Dexie 保留** | Phase 1 本地版完整功能，Phase 2 作为离线缓存层 |
| **不选 Streamlit** | 当前前端已用 React 构建完成，交互复杂（动画/拖拽/PWA），Streamlit 不适用 |

---

## 三、数据库设计

### 3.1 Phase 1 本地数据库（IndexedDB via Dexie.js）

```
NewConceptEnglish DB (IndexedDB)
├── userState            用户状态
│   ├── id               'me'
│   ├── totalXp          总经验值
│   ├── streakDays       连续打卡天数
│   ├── hearts           剩余心数（Phase 2 移除）
│   ├── unlockedAchievements  已解锁成就列表
│   └── createdAt        创建时间
│
├── lessonProgress       课程闯关进度
│   ├── lessonGroup      课组（如 'lesson-01-02'）
│   ├── completed        是否通关（100%正确率）
│   ├── bestAccuracy     最佳正确率
│   ├── attempts         尝试次数
│   └── completedAt      首次通关时间
│
├── answerRecords        答题记录
│   ├── questionId       题目ID
│   ├── lessonGroup      所属课组
│   ├── questionType     题型
│   ├── correct          是否正确
│   ├── userAnswer       用户答案
│   └── timestamp        答题时间
│
├── wrongQuestions       错题追踪
│   ├── questionId       题目ID
│   ├── wrongCount       错误次数
│   ├── nextReviewTime   下次复习时间（间隔复习）
│   └── mastered         是否已掌握
│
└── dailyStats           每日统计
    ├── date             日期
    ├── questionsAnswered 答题数
    ├── correctCount     正确数
    └── xpEarned         获得经验值
```

### 3.2 Phase 2 云数据库设计（Turso / SQLite）

借鉴考试系统的设计，扩展为多用户架构：

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐
│  users   │     │ user_progress│     │ question_banks │
├──────────┤     ├──────────────┤     ├────────────────┤
│ id       │────►│ user_id      │     │ id             │
│ username │     │ lesson_group │     │ name           │
│ password │     │ vocabulary   │     │ stage          │
│ salt     │     │ grammar      │     │ lesson_start   │
│ nickname │     │ sentence     │     │ lesson_end     │
│ avatar   │     │ listening    │     │ total_questions│
│ role     │     │ comprehensive│     │ created_at     │
│ created  │     │ status       │     └───────┬────────┘
└────┬─────┘     │ mastery_level│             │
     │           │ updated_at   │             │ bank_id
     │           └──────────────┘             ▼
     │                                  ┌────────────────┐
     │ user_id                          │   questions    │
     ▼                                  ├────────────────┤
┌──────────────┐                        │ id             │
│answer_records│                        │ bank_id        │
├──────────────┤                        │ type           │
│ id           │                        │ difficulty     │
│ user_id      │                        │ block          │
│ question_id  │                        │ tags           │
│ is_correct   │                        │ question       │
│ first_attempt│                        │ options        │
│ user_answer  │                        │ answer         │
│ time_spent   │                        │ explanation    │
│ created_at   │                        │ audio_src      │
└──────────────┘                        └────────────────┘

┌──────────────┐     ┌──────────────────┐
│review_sched  │     │ daily_stats      │
├──────────────┤     ├──────────────────┤
│ id           │     │ id              │
│ user_id      │     │ user_id         │
│ lesson_group │     │ date            │
│ stage        │     │ questions_done  │
│ due_at       │     │ correct_count   │
│ status       │     │ xp_earned       │
│ score        │     │ minutes_spent   │
└──────────────┘     └──────────────────┘
```

### 3.3 双数据库切换策略

借鉴考试系统的 `get_conn()` 模式：

```python
# Phase 2 后端伪代码
def get_db():
    if TURSO_URL:        # 环境变量已配置 → 生产环境
        return TursoConnection(TURSO_URL, TURSO_TOKEN)
    else:                # 本地开发
        return sqlite3.connect("data/nce.db")
```

---

## 四、功能架构

### 4.1 页面路由

```
/                          🚀 时间指挥舱（首页）
/star-map                  🌌 时间星图（学习地图）
/lesson/:groupId           📡 课程详情（学习块视图）
/lesson/:groupId/block     ⚡ 知识充能（块练习）
/lesson/:groupId/test      🏁 时间跃迁（综合测试）
/review                    🔋 能量回收站（错题本）
/review/scheduled          🛡️ 稳定锚（间隔复习）
/achievements              🏆 时间勋章（成就）
/profile                   👤 领航员档案（个人中心）
/diagnosis                 🔬 快速诊断（Phase 2）
/admin                     ⚙️ 管理后台（Phase 2）
```

### 4.2 核心业务流程

```
┌─────────────────────────────────────────────────────────┐
│                    学习主流程                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  进入课程 → 词汇块 → 语法块 → 句型块 → 听力块            │
│              │        │        │        │               │
│              ▼        ▼        ▼        ▼               │
│           每题必须答对（错题循环补考直到全对）              │
│              │        │        │        │               │
│              └────────┴────────┴────────┘               │
│                         │                               │
│                    全部通过 ✅                            │
│                         │                               │
│                  综合测试（15题）                          │
│              当前课60% + 旧课25% + 更早旧课15%             │
│                         │                               │
│                 100%正确 → 解锁下一课                      │
│                         │                               │
│              间隔巩固：1天→3天→7天→30天                    │
│              任何一次失败 → 回炉重来                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 学习块设计

每个课组包含 4 个学习块，按顺序解锁：

| 块 | 名称 | 主题名 | 题型 | 说明 |
|----|------|--------|------|------|
| 1 | 词汇块 | 📡 信号修复站 | 选择 + 词汇填空 | 覆盖该课100%单词 |
| 2 | 语法块 | 🔧 规则引擎室 | 语法填空 + 连词成句 | 覆盖该课全部语法点 |
| 3 | 句型块 | 🗣️ 语音传输塔 | 翻译 | 中英互译，覆盖核心句型 |
| 4 | 听力块 | 📻 时空监听站 | 听力选择 | 听音频选答案 |

每个块内部：
- 正常答题 → 答错标记 → 继续 → 本轮结束
- 错题自动进入补考池 → 只考错题
- 补考通过 → 块完成
- 补考分数单独记录，不影响首次正确率统计

### 4.4 综合测试

```
题目构成：
┌──────────────────────────────────────┐
│ 当前课（N）        60%     9题        │
│ 上一课（N-2）      25%     4题        │
│ 更早的已掌握课      15%     2题（随机） │
└──────────────────────────────────────┘

通过条件：15题全部答对（100%）
失败处理：错题进入补考池，补考只考错题直到全对
```

---

## 五、题库设计

### 5.1 题目数据结构

```typescript
// 5种题型
type QuestionType = 'choice' | 'fill' | 'translate' | 'reorder' | 'listening';

// 每题通用字段
interface BaseQuestion {
  id: string;              // 唯一ID：L{课号}-{类型}-{序号}
  type: QuestionType;
  lessonGroup: string;     // 课组：'lesson-01-02'
  lessonNumber: number;    // 课文编号
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];          // 知识点标签
  block: 'vocabulary' | 'grammar' | 'sentence' | 'listening';
  prompt: string;          // 题目说明
  explanation: string;     // 教学级解析（3-5行）
}
```

### 5.2 解析质量标准

每道题的解析必须包含结构化内容，使用标记分段：

```
【语法规则】规则说明 + 公式
【词汇辨析】易混词对比
【记忆技巧】趣味联想记忆法
【常见错误】典型错误提醒
【文化背景】（适用时）中英文化差异
【听力策略】（听力题）抓关键词技巧
```

### 5.3 题库规模

| 阶段 | 范围 | 课组数 | 题量 | 状态 |
|------|------|--------|------|------|
| 阶段一 | L1-24 | 12组 | 357题 | ✅ 已完成 |
| 阶段二 | L25-48 | 12组 | ~350题 | 📋 待建 |
| 阶段三 | L49-72 | 12组 | ~350题 | 📋 待建 |
| 阶段四 | L73-96 | 12组 | ~350题 | 📋 待建 |
| 阶段五 | L97-120 | 12组 | ~350题 | 📋 待建 |
| 阶段六 | L121-144 | 12组 | ~350题 | 📋 待建 |
| **总计** | **L1-144** | **72组** | **~2100题** | |

每课组平均 29-30 题，覆盖该课组 100% 词汇、全部语法点、核心句型。

---

## 六、主题系统（熊出没·重启未来）

### 6.1 世界观

| 概念 | 游戏化表达 |
|------|-----------|
| 学习系统 | 时间机器「英语重启号」 |
| 孩子 | 时间领航员 |
| 144课 | 6个关键时间点（需要修复） |
| 掌握课程 | 修复时间锚点 |
| 词汇/语法/句型/听力 | 4种需要重启的子系统 |

### 6.2 角色系统

| 角色 | 定位 | 出现场景 |
|------|------|---------|
| 🧑‍🚀 孩子 | 时间领航员 | 主角 |
| 🔬 光头强 | 技术导师 | 语法讲解、任务简报 |
| 🐻 熊大 | 勇气教练 | 鼓励、挑战提示 |
| 🐻 熊二 | 陪伴伙伴 | 日常问候、庆祝时刻 |

### 6.3 视觉规范

| 元素 | 规范 |
|------|------|
| 主背景色 | 深空蓝 `#0F172A` |
| 强调色 | 霓虹绿 `#22D3EE` |
| 高亮色 | 能量金 `#FBBF24` |
| 面板样式 | 半透明磨砂玻璃 + 霓虹发光边框 |
| 字体 | 标题用粗圆体，正文系统默认中文字体 |
| 按钮 | 渐变发光，按下有脉动效果 |
| 动画 | 粒子飘浮、能量流动、升级闪电 |

### 6.4 六阶段命名

| 阶段 | 课次 | 主题名 | 星球形态 |
|------|------|--------|---------|
| 阶段一 | L1-24 | 🧱 基础建设者 | 岩石星球（灰蓝色） |
| 阶段二 | L25-48 | ⚡ 行动先锋 | 闪电星球（黄色） |
| 阶段三 | L49-72 | ⏪ 过去回溯者 | 沙漏星球（琥珀色） |
| 阶段四 | L73-96 | 🔗 时间编织者 | 齿轮星球（铜色） |
| 阶段五 | L97-120 | 🧠 逻辑大师 | 电路星球（紫色） |
| 阶段六 | L121-144 | 🏛️ 文明守护者 | 水晶星球（彩虹色） |

---

## 七、文件结构

```
new-concept-english/
├── index.html                  # 入口 HTML
├── package.json                # 依赖配置
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
├── tailwind.config.js          # Tailwind 配置
├── DEV_DOC.md                  # 本开发文档
├── README.md                   # 用户使用文档
│
├── public/
│   ├── audio/                  # 课文音频（12+ MP3文件）
│   │   ├── lesson-01-02.mp3
│   │   ├── lesson-03-04.mp3
│   │   └── ...
│   ├── icons/                  # PWA 图标
│   │   ├── favicon.svg
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── images/                 # 主题图片资源（Phase 2）
│       ├── characters/         # 角色头像
│       └── planets/            # 星球图片
│
├── src/
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 路由配置
│   ├── index.css               # 全局样式 + Tailwind
│   ├── vite-env.d.ts           # Vite 类型声明
│   │
│   ├── types/
│   │   └── index.ts            # 全部 TypeScript 类型定义
│   │
│   ├── db/
│   │   └── database.ts         # Dexie.js 数据库定义（Phase 1）
│   │   # Phase 2 新增：
│   │   # └── api.ts            # 后端 API 客户端
│   │
│   ├── data/
│   │   ├── lessons.ts          # 课文元数据（72课组）
│   │   ├── vocabulary.ts       # 完整单词表（188+ 词）
│   │   ├── grammar-points.ts   # 语法知识点定义
│   │   ├── stages.ts           # 六阶段定义
│   │   └── questions/          # 题库文件
│   │       ├── index.ts        # 题库统一入口
│   │       ├── lesson-01-02.ts # 每组一个文件
│   │       ├── lesson-03-04.ts
│   │       └── ...
│   │
│   ├── stores/
│   │   ├── useUserStore.ts         # 用户状态
│   │   ├── usePracticeStore.ts     # 练习会话
│   │   └── useLessonProgressStore.ts # 课程进度
│   │
│   ├── utils/
│   │   ├── xp-calculator.ts    # 经验值计算
│   │   ├── streak.ts           # 打卡逻辑
│   │   ├── achievements.ts     # 成就判定
│   │   └── spaced-repetition.ts # 间隔复习算法
│   │
│   ├── hooks/
│   │   └── useAudio.ts         # 音频播放 hook
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx     # 主布局（底部导航）
│   │   │   └── TopBar.tsx       # 顶部状态栏
│   │   ├── questions/           # 5种题型组件
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── MultipleChoice.tsx
│   │   │   ├── FillInBlank.tsx
│   │   │   ├── TranslationInput.tsx
│   │   │   ├── SentenceReorder.tsx
│   │   │   └── ListeningQuestion.tsx
│   │   ├── gamification/        # 游戏化组件
│   │   │   ├── HeartDisplay.tsx
│   │   │   ├── XpBar.tsx
│   │   │   ├── StreakBadge.tsx
│   │   │   ├── AchievementToast.tsx
│   │   │   └── LevelUpModal.tsx
│   │   ├── practice/            # 练习流程
│   │   │   ├── LessonSelector.tsx
│   │   │   ├── PracticeSession.tsx
│   │   │   └── ResultScreen.tsx
│   │   ├── review/              # 复习
│   │   │   ├── WrongBook.tsx
│   │   │   └── SpacedReview.tsx
│   │   └── common/              # 通用组件
│   │       ├── CircularProgress.tsx
│   │       └── Confetti.tsx
│   │
│   └── pages/
│       ├── HomePage.tsx          # 时间指挥舱
│       ├── PracticePage.tsx      # 练习入口
│       ├── ReviewPage.tsx        # 复习页
│       ├── AchievementsPage.tsx  # 成就墙
│       └── ProfilePage.tsx       # 领航员档案
│       # Phase 2 新增：
│       # ├── StarMapPage.tsx     # 时间星图
│       # ├── LessonDetailPage.tsx # 课程详情
│       # ├── BlockSession.tsx    # 块练习
│       # └── DiagnosisPage.tsx   # 快速诊断
│
├── backend/                     # Phase 2 新增
│   ├── main.py                  # FastAPI 入口
│   ├── db.py                    # 数据库操作（Turso/SQLite 双模式）
│   ├── auth.py                  # JWT 认证
│   ├── models.py                # 数据模型
│   ├── turso_adapter.py         # Turso HTTP API 适配器
│   ├── requirements.txt         # Python 依赖
│   └── .env.example             # 环境变量模板
│
└── .gitignore                   # 排除 node_modules, dist, .env 等
```

---

## 八、部署方案

### 8.1 Phase 1 部署（当前）

```bash
# 本地开发
npm run dev          # → http://localhost:5173

# 生产构建
npm run build        # → dist/ 目录（纯静态文件）

# 部署到 Vercel（免费）
# 1. GitHub 推送代码
# 2. Vercel 导入仓库
# 3. 自动检测 Vite 配置 → 自动部署
# 4. 获得 https://xxx.vercel.app 域名
```

### 8.2 Phase 2 部署（多用户版）

```
前端 (React SPA)     →  Vercel (免费)
后端 (FastAPI)       →  Vercel Serverless Functions (免费)
                        或 Railway (免费 tier)
数据库 (Turso)       →  Turso Cloud (免费 tier)

环境变量配置 (Vercel Secrets):
  TURSO_URL      = "libsql://xxx.turso.io"
  TURSO_TOKEN    = "xxx"
  JWT_SECRET     = "xxx"
  CORS_ORIGIN    = "https://xxx.vercel.app"
```

### 8.3 免费额度估算

| 服务 | 免费额度 | 预估用量 | 是否够用 |
|------|---------|---------|---------|
| Vercel 前端 | 100GB 带宽/月 | ~2GB | ✅ |
| Vercel Serverless | 100GB-小时/月 | ~50GB-小时 | ✅ |
| Turso | 9GB 存储, 10亿行读/月 | 远未触及 | ✅ |
| **月费** | **$0** | | |

---

## 九、安全设计（Phase 2）

### 9.1 用户认证

- 密码：PBKDF2 + SHA256 哈希，随机盐值（与考试系统一致）
- JWT Token：访问令牌 24h 过期，刷新令牌 7d
- 首次启动自动创建默认管理员账号

### 9.2 数据隔离

- 每个用户只能访问自己的学习数据
- API 层根据 JWT 中的 user_id 过滤
- 题库为公共只读（所有用户共享同一套题库）

### 9.3 敏感文件

```
.gitignore:
  node_modules/
  dist/
  .env
  .env.local
  data/
  .claude/
```

---

## 十、开发路线图

### Phase 1：本地单用户版（已完成）

- [x] React + TypeScript + Vite 项目搭建
- [x] IndexedDB 本地数据库（5张表）
- [x] L1-24 完整题库（357题，100%词汇覆盖）
- [x] 5种题型组件（选择/填空/翻译/连词成句/听力）
- [x] 闯关解锁机制（100%正确率过关）
- [x] 游戏化系统（XP/段位/打卡/成就）
- [x] PWA 离线支持
- [x] 音频文件下载

### Phase 1.5：主题化 + 学习块改造（当前任务）

- [ ] 熊出没主题视觉（深空蓝 + 霓虹绿 + 能量金）
- [ ] 首页改造为「时间指挥舱」
- [ ] 学习地图「时间星图」
- [ ] 课程详情页（4个学习块）
- [ ] 块练习模式（逐题攻克 + 错题循环）
- [ ] 综合测试（含跨课联动）
- [ ] 间隔复习引擎（1/3/7/30天）
- [ ] 快速诊断模式
- [ ] 角色对话系统

### Phase 2：多用户云端版

- [ ] 后端 API（FastAPI + Turso）
- [ ] 用户注册/登录
- [ ] JWT 认证
- [ ] 云端数据同步
- [ ] Vercel + Turso 部署
- [ ] L25-48 题库建设

### Phase 3：完整体验

- [ ] L49-144 题库建设
- [ ] AI 智能出题
- [ ] 自适应难度
- [ ] 家长独立端
- [ ] 学习报告推送

---

## 十一、关键业务规则

### 11.1 题目掌握判定

- 首次答对 → `firstCorrect = true`，计入首次正确率
- 补考答对 → `mastered = true`，但不计入首次正确率
- 家长看板同时显示两个指标

### 11.2 课程解锁

- 前一课综合测试 100% 通过 → 解锁下一课
- 第一阶段全部通过 → 解锁第二阶段
- 每个学习块必须逐个通过（词汇→语法→句型→听力）

### 11.3 间隔复习

- 综合测试通过后自动排期：1天 → 3天 → 7天 → 30天
- 任何一次检查失败 → 对应块重新锁定 → 再次综合测试
- 30天检查通过 → 标记为「永久掌握」

### 11.4 跨课联动

- 综合测试题目构成：60% 当前课 + 25% 上一课 + 15% 更早课
- 优先抽取曾答错的旧课题（最有复习价值）
- 同一道题不会连续两次综合测试中都出现

---

## 十二、API 接口设计（Phase 2）

### 12.1 用户相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录，返回 JWT |
| GET | `/api/user/profile` | 获取个人信息 |
| GET | `/api/user/progress` | 获取整体学习进度 |
| GET | `/api/user/progress/:groupId` | 获取单课进度 |

### 12.2 学习记录

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/practice/submit` | 提交单题答案 |
| POST | `/api/practice/block-complete` | 块完成通知 |
| POST | `/api/practice/test-complete` | 综合测试完成 |
| GET | `/api/review/due` | 获取待复习列表 |
| GET | `/api/review/wrong-list` | 获取错题列表 |

### 12.3 题库（管理端）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questions/:groupId` | 获取指定课组题目 |
| GET | `/api/questions/random` | 随机抽题（诊断用） |
| POST | `/api/banks/upload` | 上传题库（CSV，Phase 3） |

---

## 十三、附录

### A. 阶段语法点总览

| 阶段 | 课次 | 核心语法 |
|------|------|---------|
| 1 | L1-24 | be动词、主系表、一般疑问句、名词复数、物主代词、人称代词宾格、双宾语、Which/Whose疑问句 |
| 2 | L25-48 | 现在进行时、There be、情态动词(can/must)、一般将来时、have got |
| 3 | L49-72 | 一般过去时、形容词比较级/最高级、be going to、时间介词 |
| 4 | L73-96 | 现在完成时、过去进行时、不定式、时间状语从句 |
| 5 | L97-120 | 宾语从句、条件句(第一类)、直接/间接引语、定语从句初步 |
| 6 | L121-144 | 被动语态、条件句(第二类)、现在完成进行时、综合应用 |

### B. 开发环境

```bash
# 依赖版本
node >= 18
npm >= 9
react 18.3.1
typescript 5.6.x
vite 6.x
tailwindcss 4.x

# Python 3.11+ (Phase 2 后端)
# Turso CLI (数据库管理)
```
