# 英语重启号 · AI 执行提示词 V7 — 错题分析 + 学习报告共享 (4 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,家庭 SaaS。
**当前版本:** 家长面板已完成(阶段完成率/逐课解锁/基础错题本),学生 Profile 只有基础统计。
**本次目标:** 错题分析系统全面升级(含原题/正确答案/错误次数/聚合统计) + 学习报告组件共享(学生也能看自己的分析) + 家长 Tab 精简。

**技术栈:** React 18 + TS + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie / FastAPI + Turso/SQLite

**关键文件:**
```
前端:
  src/pages/ParentDashboardPage.tsx — 家长面板 (~430 行,需重构为使用共享组件)
  src/pages/ProfilePage.tsx          — 学生/家长 Profile (学生需嵌入报告)
  src/pages/LoginPage.tsx            — 登录 (涉及家长注册后展示家庭码)
  src/components/questions/QuestionCard.tsx — 答题提交 (需扩展传参)
  src/db/api.ts                      — API client (submitAnswer 签名扩展)
  src/components/layout/AppShell.tsx — 全局壳 (家长 Tab 已改)

后端:
  backend/main.py     — 路由 (wrong-questions API 需 enrich)
  backend/models.py   — Pydantic 模型 (AnswerSubmitRequest 需加字段)
  backend/db.py       — 数据库 (answer_records 表需加列,submit_answer 函数需扩展)
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`
**启动:** `npm run dev` (前端) / `cd backend && python3 -m uvicorn main:app --reload --port 8000` (后端)
**每次必须通过:** `npx tsc -b`

---

## 批次 0: 后端数据层升级 (预计 45 分钟)

### 目标
answer_records 表加 3 列(question_text/correct_answer/difficulty),submit 接口支持新字段,wrong-questions API 返回原题+正确答案+错误次数+聚合摘要。

### 我需要的改动

#### 改动 1 · answer_records 表加列

**文件:** `backend/db.py`

**在 `init_db()` 函数末尾,建表和迁移之后,** 加 3 条 ALTER TABLE:

```python
# 错题分析升级: 加题干/正确答案/难度 (忽略已存在列)
_migrations_v7 = [
    "ALTER TABLE answer_records ADD COLUMN question_text TEXT DEFAULT ''",
    "ALTER TABLE answer_records ADD COLUMN correct_answer TEXT DEFAULT ''",
    "ALTER TABLE answer_records ADD COLUMN difficulty TEXT DEFAULT 'medium'",
]
for _m in _migrations_v7:
    try: conn.execute(_m)
    except: pass
```

> ⚠️ 这段代码需要在 `init_db()` 函数内、最后 `return` 之前。SQLite 本地和 Turso 远程都要生效。对于 Turso 分支,需要在 `_turso_request` 调用之后也加上同样的迁移逻辑,或者用相同的方式 try/except 处理。

**同时更新建表语句中的 CREATE TABLE answer_records**, 在 SQLite 新库建表时就包含这些列:

```sql
CREATE TABLE IF NOT EXISTS answer_records (
    ...现有列...,
    question_text TEXT DEFAULT '',
    correct_answer TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'medium'
)
```

在 `init_db()` 的 SQLite 分支找到 `conn.execute("CREATE TABLE IF NOT EXISTS answer_records ...")`,在 `time_spent` 之后加这 3 列。Turso 分支的建表语句也同样加。

#### 改动 2 · models.py 扩展

**文件:** `backend/models.py`

**在 `AnswerSubmitRequest` 类中加 3 个可选字段:**

```python
class AnswerSubmitRequest(BaseModel):
    question_id: str
    correct: bool
    user_answer: str
    time_spent: float
    lesson_group: str = ""
    question_type: str = "choice"
    question_text: str = ""       # 🆕 题干文本
    correct_answer: str = ""      # 🆕 正确答案
    difficulty: str = "medium"    # 🆕 easy/medium/hard
```

#### 改动 3 · save_answer 函数扩展

**文件:** `backend/db.py`

**找到 `save_answer` 函数(或 `submit_answer` 路由调用的 DB 写入逻辑),** 在 INSERT 语句中加上新字段:

```python
# 当前 INSERT 大致是:
# INSERT INTO answer_records (user_id, question_id, lesson_group, question_type, correct, user_answer, time_spent) VALUES (...)

# 改为:
# INSERT INTO answer_records (user_id, question_id, lesson_group, question_type, correct, user_answer, time_spent, question_text, correct_answer, difficulty) VALUES (?,?,?,?,?,?,?,?,?,?)
```

对应增加 3 个参数绑定值: `data.get("question_text", ""), data.get("correct_answer", ""), data.get("difficulty", "medium")`

#### 改动 4 · wrong-questions API enrich

**文件:** `backend/main.py`

**找到 `child_wrong_questions` 函数,重写为:**

```python
@app.get("/api/parent/child/{child_id}/wrong-questions")
def child_wrong_questions(child_id: int, user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可访问")
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
                         (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")

    # 查询所有答错记录,带新字段
    rows = conn.execute(
        "SELECT question_id, lesson_group, question_type, user_answer, "
        "question_text, correct_answer, difficulty, created_at "
        "FROM answer_records WHERE user_id=? AND correct=0 "
        "ORDER BY created_at DESC LIMIT 200",
        (child_id,)).fetchall()

    # 去重 + 统计每个 question 的出错次数
    from collections import Counter
    wrong_count_map = Counter()
    seen = set()
    wrong_list = []
    for r in rows:
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        qid = d["question_id"]
        wrong_count_map[qid] += 1
        if qid not in seen:
            seen.add(qid)
            wrong_list.append({
                "question_id": qid,
                "lesson_group": d.get("lesson_group", ""),
                "question_type": d.get("question_type", "choice"),
                "user_answer": d.get("user_answer", ""),
                "question_text": d.get("question_text", ""),
                "correct_answer": d.get("correct_answer", ""),
                "difficulty": d.get("difficulty", "medium"),
                "wrong_count": 0,  # 稍后填充
                "created_at": d.get("created_at", ""),
            })
        if len(wrong_list) >= 50:
            break

    # 填充 wrong_count
    for item in wrong_list:
        item["wrong_count"] = wrong_count_map.get(item["question_id"], 1)

    # 聚合摘要
    by_type = Counter(item["question_type"] for item in wrong_list)
    by_lesson = Counter(item["lesson_group"] for item in wrong_list)
    
    # 找出最弱题型和最弱课组
    most_missed_type = by_type.most_common(1)[0][0] if by_type else ""
    most_missed_lesson = by_lesson.most_common(1)[0][0] if by_lesson else ""

    return {
        "wrong_questions": wrong_list,
        "summary": {
            "total_wrong": len(wrong_list),
            "by_type": dict(by_type),
            "by_lesson": {k: v for k, v in by_lesson.most_common(10)},
            "most_missed_type": most_missed_type,
            "most_missed_lesson": most_missed_lesson,
        }
    }
```

#### 改动 5 · 学生也可以查自己的错题

**同一文件:** `backend/main.py`,新增:

```python
@app.get("/api/user/wrong-questions")
def my_wrong_questions(user: dict = Depends(get_current_user)):
    """学生查看自己的错题分析"""
    conn = get_db()
    rows = conn.execute(
        "SELECT question_id, lesson_group, question_type, user_answer, "
        "question_text, correct_answer, difficulty, created_at "
        "FROM answer_records WHERE user_id=? AND correct=0 "
        "ORDER BY created_at DESC LIMIT 200",
        (user["id"],)).fetchall()

    from collections import Counter
    wrong_count_map = Counter()
    seen = set()
    wrong_list = []
    for r in rows:
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        qid = d["question_id"]
        wrong_count_map[qid] += 1
        if qid not in seen:
            seen.add(qid)
            wrong_list.append({
                "question_id": qid,
                "lesson_group": d.get("lesson_group", ""),
                "question_type": d.get("question_type", "choice"),
                "user_answer": d.get("user_answer", ""),
                "question_text": d.get("question_text", ""),
                "correct_answer": d.get("correct_answer", ""),
                "difficulty": d.get("difficulty", "medium"),
                "wrong_count": 0,
                "created_at": d.get("created_at", ""),
            })
        if len(wrong_list) >= 50:
            break

    for item in wrong_list:
        item["wrong_count"] = wrong_count_map.get(item["question_id"], 1)

    by_type = Counter(item["question_type"] for item in wrong_list)
    by_lesson = Counter(item["lesson_group"] for item in wrong_list)
    most_missed_type = by_type.most_common(1)[0][0] if by_type else ""
    most_missed_lesson = by_lesson.most_common(1)[0][0] if by_lesson else ""

    return {
        "wrong_questions": wrong_list,
        "summary": {
            "total_wrong": len(wrong_list),
            "by_type": dict(by_type),
            "by_lesson": {k: v for k, v in by_lesson.most_common(10)},
            "most_missed_type": most_missed_type,
            "most_missed_lesson": most_missed_lesson,
        }
    }
```

#### 改动 6 · 前端 api.ts 更新

**文件:** `src/db/api.ts`

**更新 `submitAnswer` 签名(加 3 个可选字段):**

```ts
submitAnswer: (data: {
  question_id: string; correct: boolean; user_answer: string; time_spent: number;
  lesson_group?: string; question_type?: string;
  question_text?: string; correct_answer?: string; difficulty?: string;
}) => request('/api/practice/submit', { method: 'POST', body: JSON.stringify(data) }),
```

**加学生自查看错题的 API:**

```ts
// 在 wrongQuestions 方法旁边加:
myWrongQuestions: () => request('/api/user/wrong-questions'),
```

### 验证要求
- 重启后端: `kill %1; cd backend && python3 -m uvicorn main:app --reload --port 8000`
- 注册测试用户,做几道题(答错几道)
- `GET /api/parent/child/:id/wrong-questions` → 返回 `question_text/correct_answer/difficulty/wrong_count` + `summary` 聚合
- `GET /api/user/wrong-questions` (学生 token) → 同样结构
- 数据库 `answer_records` 表有 `question_text` 等新列
- `npx tsc -b` 零错误

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: QuestionCard 提交完整数据 + WrongQuestionPanel 组件 (预计 1.5 小时)

### 目标
答题时把原题文本/正确答案/难度一起推到后端。创建共享错题分析面板组件(含概览/分布图/分类视图/题目卡片)。

### 我需要的改动

#### 改动 1 · QuestionCard 提交扩展

**文件:** `src/components/questions/QuestionCard.tsx`

**已有的 `api.submitAnswer` 调用需要加 3 个字段。** 需要从 `question` 对象提取:

```tsx
api.submitAnswer({
  question_id: question.id,
  correct,
  user_answer: answer,
  time_spent: timeSpent,
  lesson_group: question.lessonGroup,
  question_type: question.type,
  // 🆕 3 个新字段
  question_text: getPromptText(question),
  correct_answer: getCorrectText(question),
  difficulty: question.difficulty || 'medium',
}).catch(() => {});
```

**在 QuestionCard 文件底部加两个工具函数(放在组件外部):**

```ts
/** 从题目对象提取题干文本 */
function getPromptText(q: Question): string {
  switch (q.type) {
    case 'choice': return (q as any).prompt + (q as any).question ? ' ' + (q as any).question : '';
    case 'fill': return (q as any).sentence || (q as any).prompt || '';
    case 'translate': return `翻译: ${(q as any).sourceText || ''}`;
    case 'reorder': return `连词成句: ${(q as any).correctSentence || ''}`;
    case 'listening': return (q as any).question || (q as any).prompt || '';
    default: return '';
  }
}

/** 从题目对象提取正确答案文本 */
function getCorrectText(q: Question): string {
  switch (q.type) {
    case 'choice': return (q as any).options?.[(q as any).correctIndex] || '';
    case 'fill': return (q as any).answer || '';
    case 'translate': return (q as any).acceptableAnswers?.[0] || '';
    case 'reorder': return (q as any).correctSentence || '';
    case 'listening': return (q as any).options?.[(q as any).correctIndex] || '';
    default: return '';
  }
}
```

#### 改动 2 · 创建 WrongQuestionPanel 共享组件

**新建文件:** `src/components/questions/WrongQuestionPanel.tsx`

这是一个独立的分析面板,接收 `wrongQuestions` 数据和 `summary` 数据,渲染:

**Props 接口:**
```tsx
interface WrongQ {
  question_id: string; lesson_group: string; question_type: string;
  user_answer: string; question_text: string; correct_answer: string;
  difficulty: string; wrong_count: number; created_at: string;
}
interface WrongSummary {
  total_wrong: number; by_type: Record<string, number>;
  by_lesson: Record<string, number>;
  most_missed_type: string; most_missed_lesson: string;
}
interface Props {
  wrongQuestions: WrongQ[];
  summary: WrongSummary;
  loading: boolean;
  role: 'student' | 'parent';  // 学生看自己的,家长看孩子的
  childId?: number;            // 家长模式下关联跳转
}
```

**组件结构:**

```
┌─ 📕 错题分析 ──────────────────────────┐
│                                         │
│  ┌─ 概览卡片 ───────────────────────┐   │
│  │ 错题总数: 15  最弱题型: 填空(40%)  │   │
│  │ 最弱课组: L03-04 (6 题)           │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [按题型] [按课组] [按时间]  ←3 个Tab   │
│                                         │
│  ┌─ L03-04 · 填空 (错 3 次) ───────┐   │
│  │ 题目: This ___ my book.          │   │
│  │ 你的: are ❌  正确: is ✅          │   │
│  │ 难度: ⭐  6月29日                 │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─ L01-02 · 选择 (错 1 次) ───────┐   │
│  │ 题目: "你好" 的英文是?            │   │
│  │ 你的: Hello ❌  正确: Hi ✅        │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**具体实现要点:**

1. **概览卡片:** 3 个统计数字横排 — 错题总数 / 最弱题型 / 最弱课组。使用 `summary` 数据。

2. **题型分布条(`by_type`):** 5 个横向条(选择/填空/翻译/连词/听力),每条长度按比例,右端显示数字。空题型不显示。

3. **3 个 Tab 切换:**
   - `const [viewMode, setViewMode] = useState<'type' | 'lesson' | 'time'>('lesson')`
   - **按题型:** 用 `summary.by_type` 分组,toggle 展开每个题型下的错题列表
   - **按课组:** 用 `summary.by_lesson` 分组,按课组展示
   - **按时间:** 今天/本周/更早 三组,用 `created_at` 字段判断

4. **每个错题卡片:**
   - 顶部: 课组标签 + 题型标签 + 错误次数(🔥3) + 日期
   - 中间: 原题文本(`question_text`) — 灰色背景框
   - 底部: 学生答案(红色 ❌) + 正确答案(绿色 ✅) — 并排对比
   - 难度星标: `{'⭐'.repeat(difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1)}`

5. **空状态:** 如果 `wrongQuestions.length === 0` 且不 loading,显示 "🎉 暂无错题,继续保持!"

6. **加载态:** 如果 `loading === true`,显示骨架或 spinner

#### 改动 3 · 前端 api.ts 类型定义

**文件:** `src/db/api.ts`

在文件顶部(或组件文件中)定义类型:

```ts
// 错题类型 (放在 api.ts 或 types/index.ts)
export interface WrongQuestionItem {
  question_id: string; lesson_group: string; question_type: string;
  user_answer: string; question_text: string; correct_answer: string;
  difficulty: string; wrong_count: number; created_at: string;
}
export interface WrongQuestionSummary {
  total_wrong: number;
  by_type: Record<string, number>;
  by_lesson: Record<string, number>;
  most_missed_type: string;
  most_missed_lesson: string;
}
```

### 验证要求
- `npx tsc -b` 零错误
- 学生做题(答错几道) → 后端 `answer_records` 表有 `question_text`/`correct_answer`/`difficulty`
- 家长面板点击"📕 查看错题本" → 显示完整错题卡片(原题/答案对比/错误次数)
- 3 个 Tab 切换流畅
- 空错题显示 "🎉 暂无错题"
- 学生也能看到自己的错题(后续批次接入)

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: LearningReport 共享组件 + 学生 Profile 升级 (预计 1 小时)

### 目标
从 ParentDashboardPage 抽取 `<LearningReport>` 组件,学生 Profile 复用。学生能看到自己的阶段完成率/题型正确率/活跃度/错题。

### 我需要的改动

#### 改动 1 · 创建 LearningReport 组件

**新建文件:** `src/components/report/LearningReport.tsx`

这是一个提取自 ParentDashboardPage 的学习报告组件。

**Props:**
```tsx
interface Props {
  userId: number;           // 学生 ID
  role: 'student' | 'parent';
  showControls?: boolean;   // 是否显示解锁/锁定按钮 (仅家长)
}
```

**组件内部逻辑:**
- `useEffect` 中调 `api.childReport(userId)` 获取数据(对于学生自己,需要确认 `childReport` API 是否对学生本人开放,或者新增一个 `/api/user/my-report` 接口)
- 渲染: 总进度条 → 6 阶段完成率 → 题型正确率 → 7 天活跃度 → 本周趋势 → 课组列表(家长模式可操作) → 错题分析面板

> ⚠️ 学生查看自己的报告需要后端支持。最简单的方式:新增 `GET /api/user/my-report`,逻辑与 `childReport` 相同,但 `child_id` 换成 `user["id"]`,不检查 parent 角色。

**后端新增路由 (backend/main.py):**

```python
@app.get("/api/user/my-report")
def my_report(user: dict = Depends(get_current_user)):
    """学生/家长查看自己的学习报告"""
    # 逻辑与 child_report 完全相同,但 child_id = user["id"],不检查 parent 角色
    # 直接复制 child_report 的函数体,把 child_id 替换为 user["id"]
    # 去掉 parent 角色检查
    ...
```

前端 `api.ts` 加: `myReport: () => request('/api/user/my-report')`

**组件内调用:**
- 如果 `role === 'student'` → 调 `api.myReport()`
- 如果 `role === 'parent'` → 调 `api.childReport(userId)`

**组件结构 (提取自 ParentDashboardPage):**
1. 总进度条
2. 6 阶段完成率网格 (用 STAGES)
3. 题型正确率
4. 7 天活跃度柱状图
5. 本周趋势
6. 课组列表 (showControls ? 可解锁 : 只读)
7. WrongQuestionPanel (内嵌)

**组件不需要** Hero/家庭码/学生头像/学生列表 —— 那些留在 ParentDashboardPage 中。

#### 改动 2 · ProfilePage 嵌入 LearningReport (学生)

**文件:** `src/pages/ProfilePage.tsx`

在学生视图部分,"⚙️ 设置" section **上方**,加:

```tsx
{/* ── 学习报告 ── */}
<SectionTitle emoji="📊" label="学习报告" />
<div className="glass-panel p-4">
  <LearningReport userId={0} role="student" showControls={false} />
</div>
```

> 注意: `userId=0` 表示"查自己",LearningReport 内部判断 role==='student' 时忽略 userId,调 `myReport()`。

同时,现有的学生统计区域(总答题/正确率/打卡/7天图/学习数据) **保留**,因为它们是本地 IndexedDB 数据,秒加载。LearningReport 是服务端数据,异步加载。两者互补——本地数据即时展示,服务端数据更详细。

#### 改动 3 · 家长面板改用 LearningReport

**文件:** `src/pages/ParentDashboardPage.tsx`

把学生卡片中展开的报告区域(总进度条/6阶段/题型/活跃度/课组列表/错题)替换为:

```tsx
{selectedChild === c.id && (
  <motion.div ...>
    <LearningReport userId={c.id} role="parent" showControls={true} />
  </motion.div>
)}
```

删除 ParentDashboardPage 中已提取到 LearningReport 的重复代码。

保留: 家庭码 Hero / 学生列表 / 头像 / 快捷按钮(解锁全部/重置全部)

### 验证要求
- `npx tsc -b` 零错误
- 学生登录 → Profile → 看到"📊 学习报告"区域(自己的阶段/题型/活跃度/错题)
- 家长登录 → /parent → 展开学生 → 报告正常加载
- 家长模式可解锁/锁定课程,学生模式只读
- 代码无重复(ParentDashboard 比之前短)

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 3: 收尾 + 推送 (预计 15 分钟)

### 目标
最后检查、提交、推送。

### 我需要的改动

1. **`npx tsc -b`** → 确保零错误
2. **检查后端启动** → `python3 -m uvicorn main:app --reload --port 8000` → 所有新 API 可访问
3. **浏览器回归**:
   - 学生做题(答错几道) → Profile 错题分析有数据
   - 家长面板 → 错题分析有数据(含原题/正确答案/错误次数/聚合摘要)
   - 学生 Profile → 学习报告显示阶段完成率/题型/活跃度
   - 家长 Tab 只有 3 个(无星图)
   - 家长 Profile 简洁版(无零数据)
4. **git add -A && git commit -m "feat: V7 错题分析+学习报告共享+学生报告升级"**
5. **git push origin main**

### 验证要求
- 以上 4 项检查全部通过
- git push 成功

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序 & 依赖

```
批次 0 (后端数据层)         ← 无依赖,先做 (45min)
    ↓
批次 1 (提交扩展+错题面板)  ← 依赖批次 0 的后端新字段 (1.5h)
    ↓
批次 2 (报告共享+学生升级)  ← 依赖批次 0+1 (1h)
    ↓
批次 3 (收尾推送)          ← 依赖全部 (15min)
```

**每批次完成后检查:**
1. `npx tsc -b` → 零错误
2. 后端 `/api/health` 正常
3. 该批次核心功能浏览器验证通过
4. 不做完不开始下一批

**全部完成后,系统将具备:**
- 错题分析: 原题文本 + 正确答案对比 + 错误次数 + 难度 + 聚合摘要 + 3 Tab 视图
- 学习报告: 学生和家长共用同一组件,6 阶段/题型/活跃度/错题一应俱全
- 学生 Profile: 嵌入学习报告,学生知道自己的短板
- 家长面板: 代码精简,复用共享组件
- 家长 Tab: 3 个(无星图),Profile 简洁版(无零数据)
