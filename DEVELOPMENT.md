# 英语重启号 — 新概念英语学习 PWA 开发文档

> 版本: V11.5 | 更新: 2026-06-30

---

## 一、项目概览

**定位:** 熊出没主题新概念英语学习 PWA，家庭 SaaS 模式（家长管理 + 学生学习）

**技术栈:**

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie.js (IndexedDB) |
| 后端 | FastAPI + Python 3 + SQLite (本地) / Turso (生产) |
| 部署 | Railway (全栈) |
| PWA | vite-plugin-pwa + Workbox |

**目标用户:** 小学生 6-12 岁

---

## 二、项目结构

```
new-concept-english/
├── backend/
│   ├── main.py          # FastAPI 路由 (所有API端点)
│   ├── db.py            # 数据库层 (Turso/SQLite双模式)
│   ├── models.py        # Pydantic 模型
│   ├── auth.py          # JWT 认证
│   └── dist/            # 前端构建产物 (生产部署)
├── src/
│   ├── pages/           # 页面组件
│   │   ├── HomePage.tsx             # 学生首页
│   │   ├── StarMapPage.tsx          # 学习星图
│   │   ├── LeaderboardPage.tsx      # 排行榜
│   │   ├── ReviewPage.tsx           # 间隔复习
│   │   ├── WrongBookPage.tsx        # 错题订正本
│   │   ├── ProfilePage.tsx          # 个人中心
│   │   ├── LessonDetailPage.tsx     # 课程详情
│   │   ├── LessonSelectPage.tsx     # 课程选择
│   │   ├── BlockSessionPage.tsx     # 学习块练习
│   │   ├── MasteryTestPage.tsx      # 综合测试
│   │   ├── ParentDashboardPage.tsx  # 家长面板
│   │   ├── AchievementsPage.tsx     # 成就页
│   │   └── ...
│   ├── components/      # 可复用组件
│   │   ├── questions/   # 题目组件
│   │   ├── report/      # 报告组件
│   │   ├── gamification/ # 游戏化组件
│   │   ├── layout/      # 布局组件
│   │   └── ...
│   ├── stores/          # Zustand 状态管理
│   │   ├── useUserStore.ts          # 用户/XP/成就
│   │   ├── useLessonProgressStore.ts # 课程进度
│   │   └── useAuthStore.ts          # 认证状态
│   ├── data/            # 静态数据
│   │   ├── lessons.ts   # 144课完整元数据
│   │   ├── stages.ts    # 6阶段定义
│   │   └── questions/   # 72课组题库
│   ├── utils/           # 工具函数
│   ├── db/              # 数据库封装
│   │   ├── api.ts       # 后端API封装
│   │   └── database.ts  # Dexie本地数据库
│   └── types/           # TypeScript类型
├── public/audio/        # 音频文件 (72课组, M4A格式)
├── dist/                # 构建产物
├── vite.config.ts
└── vercel.json
```

---

## 三、课程体系

### 3.1 课程组织

新概念英语第一册共 144 课，按两课一组（奇数课文 + 偶数练习）组成 **72 个课组**，分 **6 个阶段**:

| 阶段 | 名称 | 课号 | 课组数 | 核心语法 |
|------|------|------|--------|---------|
| 1 | 🧱 基础建设者 | L1-L24 | 12 | be动词·主系表·疑问句 |
| 2 | ⚡ 行动先锋 | L25-L48 | 12 | 现在进行时·There be·情态动词 |
| 3 | ⏪ 过去回溯者 | L49-L72 | 12 | 一般过去时·比较级 |
| 4 | 🔗 时间编织者 | L73-L96 | 12 | 现在完成时·过去进行时 |
| 5 | 🧠 逻辑大师 | L97-L120 | 12 | 宾语从句·条件句·间接引语 |
| 6 | 🏛️ 文明守护者 | L121-L144 | 12 | 被动语态·定语从句·虚拟语气 |

### 3.2 学习流程

```
星图选课 → 课程详情（4个学习块）→ 综合测试 → 完成解锁下一课
```

**学习块** (需全部完成才能解锁测试):
1. 📡 单词森林 (vocabulary)
2. 🔧 语法工坊 (grammar)  
3. 🗣️ 句子城堡 (sentence)
4. 🎤 听说花园 (listening)

**综合测试**: 60%当前课 + 25%上一课 + 15%更早课，全部正确通过

---

## 四、学生端功能

### 4.1 导航

5 个底部 Tab: `首页 | 星图 | 排行 | 复习 | 我的`

### 4.2 首页

- 角色问候 + 每日推荐课程
- 今日学习进度 (目标 15 题/天)
- 迷你排行榜 (Top 3)
- 复习提醒

### 4.3 星图

- 72 课总进度条 + XP 显示
- 5 题型正确率统计
- 6 阶段星球可视化
- 阶段完成进度 > 11/12 时提示奖励

### 4.4 排行榜

- 按 XP 降序排列 (服务端 `users.total_xp`)
- 显示昵称 + 年级 + XP + 完成课数
- XP 规则透明展示

### 4.5 间隔复习

- 基于艾宾浩斯遗忘曲线，5 个阶段:
  - ① 立即 → ② 1天 → ③ 3天 → ④ 7天 → ⑤ 30天 → ✅ 掌握
- 答对升阶段，答错回阶段 0
- 答题 +5 XP，过期题 +8 XP
- 支持逐题和批量两种模式

### 4.6 错题订正本

- 按课组/题型分组展示全部错题
- 每道题显示原题、学生答案、正确答案
- 点击「✏️ 订正此题」展开答题区，答对即消除 (+5 XP)
- 订正进度条 + 已订正计数
- 数据本地持久化 (localStorage + Dexie)

### 4.7 个人中心

- 头像 + 昵称 + 年级 (学生只读)
- 错题本入口 + 间隔复习入口
- 修改密码 / 重置数据 / 删除账号

---

## 五、家长端功能

### 5.1 底部导航

3 个 Tab: `首页(parent) | 排行 | 我的`

### 5.2 家长面板

- 家庭码管理
- 学生列表(昵称 + 年级可编辑)
- 学习报告 (按需加载)
- 课程锁定/解锁 (全部/按阶段)
- 错题分析 (按课组分组,显示订正状态和进度)

### 5.3 课程锁定机制

- 锁定: `status='locked', unlocked_by='parent_locked'`
- 解锁: `status='unlocked', unlocked_by='parent'`
- **锁定/解锁不影响** `completed`/`best_accuracy`/`attempts`
- 学生端 `isUnlocked()` 尊重 `status='locked'`

---

## 六、XP 积分体系

### 6.1 XP 获取途径

| 行为 | XP | 说明 |
|------|-----|------|
| 完成学习块 | +30 | 单词/语法/句子/听力任一 |
| 通过综合测试 | +50 | 一课全部掌握 |
| 完成阶段(12课) | +50 | 仅一次 |
| 复习答对 | +5 | 过期题 +8 |
| 订正答对 | +5 | 错题本订正 |
| 解锁成就 | +15/个 | |
| 打卡7/14/30天 | +20/次 | 每次里程碑仅一次 |

### 6.2 XP 数据流

```
addXp(amount)
  → Dexie userState.totalXp += amount
  → db.updateTodayStats({xpEarned: amount})
  → api.syncXp(newXp) → 服务端 users.total_xp
  → AppShell 浮动提示 "+30 XP ⚡"
```

### 6.3 排行榜

- 数据源: `users.total_xp` (服务端)
- 排序: XP 降序
- 每次 `addXp` 后异步同步到服务端

---

## 七、数据库设计

### 7.1 服务端 (Turso/SQLite)

| 表 | 用途 | 关键字段 |
|----|------|---------|
| users | 用户 | id, username, nickname, grade, role, family_code, parent_id, total_xp |
| user_progress | 课程进度 | user_id, lesson_group, completed, status, unlocked_by |
| answer_records | 答题记录 | user_id, question_id, correct, user_answer, correct_answer, question_text |
| daily_stats | 每日统计 | user_id, date, questions_done, correct_count, xp_earned |

### 7.2 本地 (Dexie/IndexedDB)

| 表 | 用途 |
|----|------|
| userState | 本地用户数据 (XP, hearts, streak) |
| lessonProgress | 课程进度同步 |
| wrongQuestions | 错题复习 (questionId, wrongCount, stage, nextReviewTime) |
| answerRecords | 答题记录缓存 |
| dailyStats | 每日统计本地副本 |

---

## 八、部署

### 8.1 生产地址

`https://new-concept-english-production.up.railway.app`

### 8.2 部署方式

前端构建产物 (`dist/`) 放在 `backend/dist/`，由 FastAPI `StaticFiles` 和 SPA fallback 统一提供服务。

### 8.3 部署命令

```bash
# 本地构建
npm run build

# 复制到后端
rm -rf backend/dist && cp -r dist backend/dist

# 推送到 GitHub (Railway 自动部署)
git add -A && git commit -m "..." && git push origin main
```

### 8.4 启动命令

```bash
# 后端 (生产)
cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# 前端 (本地开发)
npm run dev
```

### 8.5 环境变量

| 变量 | 说明 |
|------|------|
| TURSO_URL | Turso 数据库 URL |
| TURSO_TOKEN | Turso 认证 Token |
| CORS_ORIGIN | CORS 允许来源 (默认 *) |

---

## 九、音频文件

- 72 课组各一个 M4A 文件 (AAC 64kbps)
- 命名: `lesson-01-02.m4a` ~ `lesson-143-144.m4a`
- 路径: `public/audio/` → 构建后 `dist/audio/`
- 总大小: ~44MB

---

## 十、已知注意事项

### 10.1 Turso 兼容性

- Turso API 值类型: 所有值返回字符串，`_TursoRow._parse()` 自动转换为 Python 类型
- 参数类型: `float` (非 `real`)，布尔需显式处理 (`isinstance(bool, int)` 为 True)
- 游标惰性: `_TursoWrapper.execute()` 立即调用 `_ensure()` 发送 SQL

### 10.2 错题数据流

- QuestionCard 统一调用 `api.submitAnswer()` → 服务端 `answer_records`
- BlockSessionPage/MasteryTestPage 写本地 `db.wrongQuestions` (不调 submitAnswer)
- 家长端读取服务端 `answer_records`
- 学生端错题本优先读服务端，降级到本地 Dexie

### 10.3 Service Worker

- 生产环境已禁用 (防止旧缓存拦截)
- `registerSW.js` 仅执行 `unregister()`

---

## 十一、测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 家长 | baba | 123456 |
| 学生 | xiaoming (乐乐) | 123456 |
| 家长 | andy666 | 123456 |
| 学生 | andy (安迪) | 123456 |

---

## 十二、版本历史

| 版本 | 日期 | 主要更新 |
|------|------|---------|
| V11.5 | 2026-06-30 | Turso 惰性游标修复、float 类型修复、选项随机化、错题订正本、家长错题分析、XP 体系统一、排行榜按 XP 排序、音频 M4A 压缩、Service Worker 缓存清理 |
| V11 | 2026-06-29 | 全面体验升级 6 批次: 家长锁定规则、复习重构、课程元数据补全、首次引导、错题分析、积分排行 |
| V10 | - | 解锁奖励系统 |
