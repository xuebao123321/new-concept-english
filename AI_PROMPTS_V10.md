# 英语重启号 · AI 执行提示词 V10 — 解锁奖励系统 + Bug 修复 (3 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,家庭 SaaS。
**当前版本:** V9 体验打磨已完成(退出保存+空壳标注+目标环+听力降级+口语题型+iPad横屏)。
**本次目标:** 将"解锁"从管理动作升级为激励引擎 + 修 5 个已知 bug。

**核心概念变更:**
- **旧:** 解锁 = `completed=1`(做完才算,家长开也是做完)
- **新:** 解锁 ≠ 完成。解锁有三条路 — 顺序(80%通过) / 奖励(连跳+复习达人+打卡) / 家长手动

**技术栈:** React 18 + TS + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie / FastAPI + Turso/SQLite

**关键文件:**
```
后端:
  backend/main.py    — 加 /api/rewards/check 等
  backend/models.py  — 加 RewardResult 等模型
  backend/db.py      — user_progress 表加 status/unlocked_by/unlocked_at

前端:
  src/pages/LessonSelectPage.tsx    — 课程列表四态标签
  src/pages/HomePage.tsx            — 优先推荐奖励课
  src/pages/BlockSessionPage.tsx    — 全对连跳弹窗
  src/components/layout/AppShell.tsx — Token过期温柔降级
  src/pages/ParentDashboardPage.tsx  — 家长解锁 vs 完成区分
  src/components/gamification/AchievementToast.tsx — 重要成就全屏
  src/db/api.ts                     — 加 rewards/check
  src/types/index.ts                — 加 unlock 相关类型
  vite.config.ts                    — orientation: 'any' (V9已做)
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`
**启动:** `npm run dev` (前端) / `cd backend && python3 -m uvicorn main:app --reload --port 8000` (后端)
**每次必须通过:** `npx tsc -b`

---

## 批次 0: 后端数据库 + 奖励逻辑 + API (预计 1 小时)

### 目标
user_progress 表加 status/unlocked_by/unlocked_at 三列。解锁/重置 API 改用 status。新增奖励检查 API。

### 背景
当前 `user_progress` 表用 `completed` (0/1) 表示状态。家长解锁也会设 `completed=1`,导致"真完成"和"家长解锁"无法区分。需要引入 `status` 字段区分四种状态:
- `'locked'` — 未解锁
- `'unlocked'` — 已解锁(奖励或家长),可学但没学
- `'in_progress'` — 正在学(有块完成)
- `'completed'` — 学完了(综合测试通过)

### 我需要的改动

#### 改动 1 · 数据库迁移

**文件:** `backend/db.py`

**在 `init_db()` 函数的迁移代码块中(spaced-repetition 迁移之后),** 加:

```python
# V10: 解锁奖励系统
_migrations_v10 = [
    "ALTER TABLE user_progress ADD COLUMN status TEXT DEFAULT 'locked'",
    "ALTER TABLE user_progress ADD COLUMN unlocked_by TEXT DEFAULT ''",
    "ALTER TABLE user_progress ADD COLUMN unlocked_at TEXT DEFAULT ''",
]
for _m in _migrations_v10:
    try: conn.execute(_m)
    except: pass
```

**同时迁移已有数据:** 在迁移之后,执行:
```python
try:
    conn.execute("UPDATE user_progress SET status='completed' WHERE completed=1")
    conn.execute("UPDATE user_progress SET status='locked' WHERE completed=0 AND status='locked'")
except: pass
```

对于 Turso 分支,在 `_turso_request` 数组中也要加对应的 ALTER TABLE 语句(以及 UPDATE 语句)。

**更新建表语句:** 在 SQLite 和 Turso 的 `CREATE TABLE IF NOT EXISTS user_progress` 中加这 3 列。

#### 改动 2 · unlock/reset API 改用 status

**文件:** `backend/main.py`

**改 `/api/parent/child/:id/unlock-lesson`:**

将 `INSERT OR REPLACE ... completed=1` 改为:
```python
conn.execute(
    "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
    "VALUES (?, ?, 'unlocked', 'parent', datetime('now'), 0, 0, 0) "
    "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
    "status='unlocked', unlocked_by='parent', unlocked_at=datetime('now')",
    (child_id, data.lesson_group))
```

**改 `/api/parent/child/:id/reset-lesson` (已有 DELETE,保持不变,但要加重置逻辑):**

当前是 `DELETE FROM user_progress`。改为:
```python
# 如果已完成的课,重置为 locked(不删除,保留记录)
conn.execute(
    "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, completed, best_accuracy, attempts) "
    "VALUES (?, ?, 'locked', '', 0, 0, 0) "
    "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
    "status='locked', unlocked_by='', completed=0",
    (child_id, data.lesson_group))
```

#### 改动 3 · 顺序解锁逻辑改用 status

**文件:** `src/stores/useLessonProgressStore.ts`

**当前 `isUnlocked` 检查 `progressMap.get(prevGroup)?.completed === true`。改为同时检查 status:**

```ts
isUnlocked: (lessonGroup: string) => {
  const { progressMap } = get();
  const idx = LESSON_GROUPS.indexOf(lessonGroup);
  if (idx === 0) return true;
  if (idx === -1) return false;
  // 自身被标记为 unlocked/completed/in_progress 就算解锁
  const self = progressMap.get(lessonGroup);
  if (self && (self as any).status && (self as any).status !== 'locked') return true;
  // 前一课完成了 → 顺序解锁
  const prevGroup = LESSON_GROUPS[idx - 1];
  const prevProgress = progressMap.get(prevGroup);
  return prevProgress?.completed === true || (prevProgress as any)?.status === 'completed';
},
```

> ⚠️ 前端的 `LessonProgress` 接口需要扩展。在 `src/types/index.ts` 中 `LessonProgress` 接口加:
> ```ts
> status?: 'locked' | 'unlocked' | 'in_progress' | 'completed';
> unlocked_by?: string;  // 'sequential' | 'reward' | 'parent' | ''
> unlocked_at?: string;
> ```

#### 改动 4 · 新增奖励检查 API

**文件:** `backend/main.py`

```python
@app.post("/api/rewards/check")
def check_rewards(user: dict = Depends(get_current_user)):
    """检查并触发当前用户应得的奖励"""
    conn = get_db()
    uid = user["id"]
    rewards = []

    # 1. 全对连跳: 找到最新完成的课,如果 best_accuracy=1.0 → 连跳 2 课
    last_completed = conn.execute(
        "SELECT lesson_group, best_accuracy FROM user_progress "
        "WHERE user_id=? AND (status='completed' OR completed=1) "
        "ORDER BY completed_at DESC LIMIT 1",
        (uid,)).fetchone()
    
    if last_completed:
        ld = last_completed.to_dict() if hasattr(last_completed, 'to_dict') else dict(last_completed)
        if float(ld.get("best_accuracy") or 0) >= 1.0:
            lg = ld["lesson_group"]
            # 找该课组后面 2 个课组
            try:
                idx = ALL_LESSON_GROUPS.index(lg)
                for offset in [1, 2]:
                    if idx + offset < len(ALL_LESSON_GROUPS):
                        target = ALL_LESSON_GROUPS[idx + offset]
                        existing = conn.execute(
                            "SELECT status FROM user_progress WHERE user_id=? AND lesson_group=?",
                            (uid, target)).fetchone()
                        if not existing or (existing.to_dict() if hasattr(existing, 'to_dict') else dict(existing)).get('status') == 'locked':
                            conn.execute(
                                "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
                                "VALUES (?, ?, 'unlocked', 'reward', datetime('now'), 0, 0, 0) "
                                "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
                                "status='unlocked', unlocked_by='reward', unlocked_at=datetime('now')",
                                (uid, target))
                            rewards.append({"type": "combo_jump", "lesson_group": target,
                                "message": f"🌟 全对通关! 连跳解锁 {target}"})
            except ValueError:
                pass

    # 2. 复习达人: 今天没有到期未复习的错题 → 随机解锁 1 课
    # (前端检查 IndexedDB 的到期错题,调此 API 时传 check_type='review_master')
    # 此处留接口,由前端触发
    review_check = user.get("_check_review_master")  # 前端传参
    if review_check:
        # 从所有 locked 课组中随机选一个(在当前进度 +5 范围内)
        max_completed = 0
        all_progress = conn.execute(
            "SELECT lesson_group FROM user_progress WHERE user_id=? AND (status='completed' OR completed=1)",
            (uid,)).fetchall()
        for r in all_progress:
            rd = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
            try: max_completed = max(max_completed, ALL_LESSON_GROUPS.index(rd["lesson_group"]))
            except: pass
        
        candidates = []
        for i in range(max_completed + 1, min(max_completed + 6, len(ALL_LESSON_GROUPS))):
            lg = ALL_LESSON_GROUPS[i]
            row = conn.execute("SELECT status FROM user_progress WHERE user_id=? AND lesson_group=?",
                (uid, lg)).fetchone()
            if not row or (row.to_dict() if hasattr(row, 'to_dict') else dict(row)).get('status', 'locked') == 'locked':
                candidates.append(lg)
        
        if candidates:
            import random as _rand
            pick = _rand.choice(candidates)
            conn.execute(
                "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
                "VALUES (?, ?, 'unlocked', 'reward', datetime('now'), 0, 0, 0) "
                "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
                "status='unlocked', unlocked_by='reward', unlocked_at=datetime('now')",
                (uid, pick))
            rewards.append({"type": "review_master", "lesson_group": pick,
                "message": f"🎁 复习达人! 奖励解锁 {pick}"})

    if hasattr(conn, 'commit'): conn.commit()
    return {"rewards": rewards}
```

#### 改动 5 · 前端 api.ts + 类型定义

**文件:** `src/db/api.ts`,加:
```ts
checkRewards: (params?: { check_type?: string }) =>
  request('/api/rewards/check', { method: 'POST', body: JSON.stringify(params || {}) }),
```

**文件:** `src/types/index.ts`,`LessonProgress` 接口扩展(改动 3 中已提)。

### 验证要求
- 后端重启,数据库迁移成功 → `user_progress` 表有 status/unlocked_by/unlocked_at
- 已有数据的 status 正确(completed=1 → status='completed')
- 家长解锁一课 → status='unlocked', unlocked_by='parent'
- 学生做完综合测试 80% → status='completed'
- `POST /api/rewards/check` → 返回可能的奖励
- `npx tsc -b` 零错误

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: 课程列表 + 奖励弹窗 + 首页奖励推荐 (预计 1.5 小时)

### 目标
课程列表区分四种状态。奖励课带星星动效。三个奖励弹窗(连跳/复习达人/打卡)。首页优先推荐奖励课。

### 我需要的改动

#### 改动 1 · 课程列表四态标签

**文件:** `src/pages/LessonSelectPage.tsx`

**在渲染每门课时,根据 `status` 显示不同标签:**

```tsx
// 在组件内取 progressMap 中的状态:
const progress = progressMap.get(group);
const pStatus = (progress as any)?.status || (progress?.completed ? 'completed' : isUnlocked(group) ? 'unlocked' : 'locked');
const unlockedBy = (progress as any)?.unlocked_by || '';

// 替代现有的锁/完成图标:
<div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
  pStatus === 'completed' ? 'bg-forest-pale text-forest' :
  pStatus === 'unlocked' ? unlockedBy === 'reward'
    ? 'bg-sun-pale text-sun'     // 奖励课: 金色
    : 'bg-sky-pale text-sky'    // 家长解锁: 蓝色
  : pStatus === 'in_progress' ? 'bg-honey-pale text-honey' :
  'bg-warm-bg text-ink-muted'   // locked
}`}>
  {pStatus === 'completed' ? '✅' :
   pStatus === 'unlocked' ? unlockedBy === 'reward' ? '🎁' : '🔓' :
   pStatus === 'in_progress' ? '🔄' : '🔒'}
</div>

{/* 状态标签 */}
{pStatus === 'unlocked' && unlockedBy === 'reward' && (
  <motion.span className="px-1.5 py-0.5 text-[10px] font-bold bg-sun-pale text-sun rounded-full"
    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
    🎁 奖励解锁
  </motion.span>
)}
{pStatus === 'unlocked' && unlockedBy === 'parent' && (
  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-pale text-sky rounded-full">
    👨‍👩‍👧 家长解锁
  </span>
)}
```

#### 改动 2 · 全对连跳弹窗

**文件:** `src/pages/BlockSessionPage.tsx` (或 `MasteryTestPage.tsx`)

**在综合测试完成页,`finishTest` 之后,加奖励检查:**

```tsx
// 在 finishTest 函数末尾(setDone(true) 之后):
if (isPassed) {
  api.checkRewards().then(res => {
    const rewards = res?.rewards || [];
    if (rewards.length > 0) {
      setRewards(rewards);  // 新 state
      setShowRewards(true);
    }
  }).catch(() => {});
}
```

**加两个 state:**
```tsx
const [rewards, setRewards] = useState<Array<{type:string; lesson_group:string; message:string}>>([]);
const [showRewards, setShowRewards] = useState(false);
```

**奖励弹窗(在完成页渲染,Confetti 旁边):**

```tsx
{showRewards && rewards.length > 0 && (
  <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowRewards(false)}>
    <motion.div className="card mx-4 max-w-xs w-full p-6 text-center space-y-4 border-sun/40"
      initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={springs.popIn}
      onClick={e => e.stopPropagation()}>
      <div className="text-5xl">🎁</div>
      <h2 className="text-h2 text-ink">获得奖励!</h2>
      {rewards.map((r, i) => (
        <div key={i} className="bg-sun-pale rounded-xl p-3 border border-sun/30">
          <p className="text-sm font-bold text-ink">{r.message}</p>
          <p className="text-xs text-ink-muted mt-0.5">已解锁,去课程列表看看吧~</p>
        </div>
      ))}
      <button onClick={() => setShowRewards(false)}
        className="btn-brand w-full text-base">🎉 太棒了!</button>
    </motion.div>
  </motion.div>
)}
```

#### 改动 3 · 首页优先推荐奖励课

**文件:** `src/pages/HomePage.tsx`

**在 Hero 区"今日推荐"逻辑中,如果存在 `status='unlocked' && unlocked_by='reward'` 的课组,优先推荐:**

```tsx
// 查找奖励课(优先) + 进行中课程
const rewardLesson = LESSON_GROUPS.find(g => {
  const p = progressMap.get(g);
  return p && (p as any).status === 'unlocked' && (p as any).unlocked_by === 'reward';
});

const displayGroup = rewardLesson || inProgressGroup || getNextUnlocked();
const isReward = !!rewardLesson;
```

在 Hero 卡片内显示:
```tsx
{isReward && (
  <motion.div className="bg-sun-pale rounded-xl p-3 border-2 border-sun"
    animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
    <span className="text-sm font-extrabold text-sun">🎁 奖励课: 第 {groupIdx} 关</span>
    <p className="text-xs text-ink-muted mt-0.5">因为你的优秀表现,这堂课已提前解锁!</p>
  </motion.div>
)}
```

奖励课卡片用金色边框 + 微呼吸动效。

#### 改动 4 · 打卡 7 天奖励

**文件:** `src/stores/useUserStore.ts` 或在 `HomePage.tsx` 的 `checkDailyStreak` 回调中

**当 `streakDays === 7` 且今天还没触发过奖励时:**

```tsx
useEffect(() => {
  if (userState?.streakDays === 7) {
    const today = new Date().toISOString().slice(0, 10);
    const lastCheck = localStorage.getItem('nce_reward_check');
    if (lastCheck !== today) {
      api.checkRewards({ check_type: 'streak_7' }).then(res => {
        localStorage.setItem('nce_reward_check', today);
        if (res?.rewards?.length > 0) {
          setStreakRewards(res.rewards);
        }
      }).catch(() => {});
    }
  }
}, [userState?.streakDays]);
```

### 验证要求
- `npx tsc -b` 零错误
- 课程列表: 四种标签正常(✅/🔓/🎁/🔒)
- 奖励课带金色呼吸动效
- 综合测试 100% → 完成页弹"获得奖励"弹窗 → 后面两课解锁
- 首页有奖励课时优先显示奖励课卡片
- 打卡第 7 天 → 触发奖励检查

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: Bug 修复 + 细节打磨 (预计 1 小时)

### 目标
修 5 个已知问题: Token 过期温柔降级 / 复习标记二次确认 / 家长按阶段解锁 / 重要成就全屏 / 听说花园改名。

### 我需要的改动

#### Bug 1 · Token 过期温柔降级

**文件:** `src/db/api.ts`

**在 `request` 函数的错误处理中,检测 401:**

```ts
if (!res.ok) {
  if (res.status === 401) {
    // Token 过期: 清除本地 token,5 秒后跳转登录
    localStorage.removeItem('nce_token');
    // 弹全局提示(用简单的 alert 或自定义 Toast)
    alert('登录已过期,请重新登录');
    setTimeout(() => { window.location.href = '/welcome'; }, 500);
    throw new Error('登录已过期');
  }
  const err = await res.json().catch(() => ({ detail: '网络错误，请稍后重试' }));
  throw new Error(err.detail || '请求失败');
}
```

#### Bug 2 · 复习标记完成加二次确认

**文件:** `src/pages/ReviewPage.tsx`

**在 `handleReviewResult` 中,当 `passed === true` 时,加确认:**

```tsx
if (passed) {
  const confirmed = window.confirm('确定认为这道题已经掌握了吗?以后不会再出现在复习列表中。');
  if (!confirmed) { setReviewing(null); return; }
}
```

#### Bug 3 · 家长"解锁全部"改为"按阶段解锁"

**文件:** `src/pages/ParentDashboardPage.tsx`

**替换 `handleUnlockAll` 和 `handleResetAll` 为一个带下拉选择的按钮:**

```tsx
const [showBulkUnlock, setShowBulkUnlock] = useState(false);

{/* 批量操作按钮 */}
<div className="flex gap-2">
  <div className="relative flex-1">
    <button onClick={() => setShowBulkUnlock(!showBulkUnlock)}
      className="w-full py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30">
      🔓 批量解锁 ▾
    </button>
    {showBulkUnlock && (
      <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl border border-warm-border shadow-lg z-10">
        {STAGES.map(stage => (
          <button key={stage.id} onClick={(e) => {
            e.stopPropagation();
            setShowBulkUnlock(false);
            bulkUnlockStage(c.id, stage.groups);
          }} className="w-full text-left px-3 py-2 text-xs font-bold text-ink hover:bg-warm-bg">
            {stage.icon} {stage.name} (L{stage.lessonStart}-{stage.lessonEnd})
          </button>
        ))}
      </div>
    )}
  </div>
  <button onClick={(e) => { e.stopPropagation(); handleResetAll(c.id); }}
    className="flex-1 py-2 text-xs font-bold rounded-xl bg-berry-pale text-berry border border-berry/30">
    🔒 重置全部
  </button>
</div>
```

**加 `bulkUnlockStage` 函数:**

```tsx
const bulkUnlockStage = async (childId: number, groups: string[]) => {
  if (!window.confirm(`确定要解锁该阶段全部 ${groups.length} 个课组吗?`)) return;
  for (const g of groups) { await api.unlockLesson(childId, g); }
  setMsg('✅ 已解锁');
  await loadReport(childId); await loadChildren();
};
```

#### Bug 4 · 重要成就全屏庆祝

**文件:** `src/components/gamification/AchievementToast.tsx`

**判断成就类别:** 如果 `achievement.category === 'milestone'`,弹全屏庆祝而非顶部 Toast。

```tsx
{newAchievements.map((achievement, index) => (
  achievement.category === 'milestone' ? (
    // 全屏庆祝
    <motion.div key={achievement.id}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => clearNewAchievements()}>
      <motion.div className="card mx-4 max-w-xs w-full p-8 text-center space-y-4 border-sun/40"
        initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={springs.popIn}
        onClick={e => e.stopPropagation()}>
        <motion.div className="text-6xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
          {achievement.icon}
        </motion.div>
        <h2 className="text-h2 text-ink">🎉 成就解锁!</h2>
        <p className="text-h1 font-extrabold text-forest">{achievement.name}</p>
        <p className="text-meta text-ink-light">{achievement.description}</p>
        <button onClick={clearNewAchievements} className="btn-brand w-full text-base">
          太棒了!
        </button>
      </motion.div>
    </motion.div>
  ) : (
    // 普通 Toast (保持现有逻辑)
    <现有Toast代码 />
  )
))}
```

#### Bug 5 · "听力花园"改名"听说花园"

**文件:** `src/pages/BlockSessionPage.tsx`、`src/pages/LessonDetailPage.tsx`

找到 `BLOCK_INFO.listening`,改名:
```tsx
listening: { icon: '🎤', name: '听说花园', color: '#FF8C42', bg: '#FFF2E8' },
```

同时把 icon 从 📻 改为 🎤,名字从 `name: '听力花园'` → `name: '听说花园'`。

检查 `LessonDetailPage.tsx` 中的 BLOCKS 数组,做相同修改。

### 验证要求
- `npx tsc -b` 零错误
- Token 过期 → 弹 alert → 5 秒后跳 welcome
- 复习标记"答对" → 确认弹窗 → 点确定才执行
- 家长面板 → 点批量解锁 → 弹出阶段下拉 → 点某个阶段 → 该阶段课组全部解锁
- 解锁重要成就(如 milestone 类) → 全屏庆祝
- 听力块显示"🎤 听说花园"

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序 & 依赖

```
批次 0 (后端 DB + API)       ← 无依赖,先做 (1h)
    ↓
批次 1 (前端奖励系统)         ← 依赖批次 0 的 API + 类型 (1.5h)
    ↓
批次 2 (Bug 修复)            ← 无硬依赖,最后做 (1h)
```

每批次完成后: `npx tsc -b` 零错误 + 浏览器验证 + 后端无 500。

**全部完成后:**
- 解锁是奖励引擎: 全对连跳 / 复习达人 / 打卡 7 天 / 家长手动
- 课程列表四种状态标签(✅🔓🎁🔒),奖励课有呼吸动效
- 综合测试 100% → 弹连跳奖励
- 首页优先推荐奖励课
- 5 个已知 bug 已修复
