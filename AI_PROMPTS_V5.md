# 英语重启号 · AI 执行提示词 V5 — SaaS 化改造 (5 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,面向 6-12 岁小学生。
**当前版本:** 单人自用,前后端已部署 (Vercel + Railway),功能完整。
**本次目标:** 从"单人自用"升级为"家庭 SaaS"——家长注册邀请学生,家长面板管理。

**技术栈:**
- 前端: React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie
- 后端: FastAPI + Turso/SQLite,Python 3
- 部署: 前端 Vercel, 后端 Railway
- 认证: JWT (PBKDF2 密码哈希)

**关键文件清单:**
```
前端核心:
  src/App.tsx                          — 路由定义
  src/pages/LoginPage.tsx              — 登录/注册 (当前只有 login/register 两态)
  src/pages/HomePage.tsx               — 首页
  src/stores/useAuthStore.ts           — token/user/登录状态管理
  src/stores/useUserStore.ts           — XP/心/段位
  src/stores/useLessonProgressStore.ts — 课程解锁/块进度
  src/db/api.ts                        — 后端 API client
  src/db/database.ts                   — 本地 IndexedDB (Dexie)
  src/components/layout/AppShell.tsx   — 全局壳 (TopBar + 底部Tab)
  src/components/common/RequireAuth.tsx— 路由守卫 (当前: 未登录→/login)
  src/index.css                        — 设计系统 (@theme + 字号 + 动画)
  src/utils/motion-tokens.ts           — 动效 token
  src/types/index.ts                   — TypeScript 类型定义

后端核心:
  backend/main.py    — 所有路由 (当前 14 个)
  backend/models.py  — Pydantic 模型
  backend/auth.py    — PBKDF2 密码 + JWT
  backend/db.py      — Turso/SQLite 双模式,建表/CRUD
  backend/requirements.txt — fastapi/uvicorn/PyJWT/httpx

数据库 (Turso 生产 / SQLite 本地):
  users(id, username, password_hash, salt, nickname, created_at)
  user_progress(user_id, lesson_group, completed, best_accuracy, attempts, ...)
  answer_records(user_id, question_id, ...)
  daily_stats(user_id, date, ...)

角色图片:
  public/assets/characters/
    heroes-space.webp (26KB)  cast-group.webp (18KB)
    xionger-laugh.webp (17KB) bears-cabin.webp (19KB)
    new-year.webp (24KB)      guangtouqiang-winter.webp (5KB)
```

**启动命令:**
```bash
# 前端: npm run dev (默认端口 5173)
# 后端: cd backend && python3 -m uvicorn main:app --reload --port 8000
# TypeScript: npx tsc -b (任何修改后必须通过)
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`

---

## 批次 0: Landing Page (预计 2 小时)

### 目标
当前用户打开 App → 直接看到登录页,没有任何产品介绍。新建 Landing Page 作为未登录用户的首页,展示品牌、功能亮点、角色 IP、注册入口。

### 背景
`App.tsx` 中路由结构: 未登录时 RequireAuth 跳 `/login`,登录后走 AppShell。现在需要在 `/login` 之前加 `/welcome` 作为 Landing。

路由设计:
```
/              → RequireAuth → AppShell (首页,已登录)
/welcome       → LandingPage  (未登录,永久可访问)
/login         → LoginPage    (未登录)
```

用户流: 打开 App → 检测未登录 → `/welcome` (品牌介绍 + "开始使用"按钮) → `/login`

### 我需要的改动

#### 改动 1 · 创建 LandingPage 组件

**新建文件:** `src/pages/WelcomePage.tsx`

这是一个全屏品牌页,包含:
1. **顶部 Hero**: 角色大图 (`cast-group.webp`) + 标题 "🌳 温暖森林学院" + 副标题 "和熊大熊二一起学英语"
2. **中间 3 个亮点卡片** (横向滑动或 3 列):
   - 📚 72 课新概念英语 → 系统覆盖第一册全部课文
   - 🎮 闯关学习 → 词汇→语法→句型→听力→测试,像游戏一样
   - 🏆 积分段位 → XP 升级 + 连击激励 + 排行榜
3. **底部 CTA**: "🚀 开始学习" 按钮 → 跳转 `/login`
4. **版权行**: "角色形象素材来源于公开网络,版权归原作者,本地学习使用"

设计要点:
- 背景 `bg-cream`,整体用 `min-h-screen`
- Hero 区用渐变: `bg-gradient-to-b from-forest-pale via-cream to-cream`
- 角色图片用 `rounded-3xl` + 阴影
- 亮点卡片用 `.card` + emoji 图标 + 简短文案
- CTA 按钮用 `.btn-brand`,大号,居中
- 底部 `text-[9px] text-ink-muted` 版权声明
- 所有动画用 `framer-motion` + `springs` from motion-tokens

用 Framer Motion 做简单的入场动画: hero 从上方淡入,卡片 stagger 进入,按钮最后弹入。

```tsx
// 大致结构:
export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Hero */}
      <motion.div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8
        bg-gradient-to-b from-forest-pale via-cream to-cream text-center space-y-5"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}>
        <motion.img src="/assets/characters/cast-group.webp" alt=""
          className="w-48 h-32 rounded-3xl object-cover border-3 border-white shadow-lg"
          style={{ objectPosition: 'center 30%' }}
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springs.popIn, delay: 0.1 }} />
        <h1 className="text-display text-ink">🌳 温暖森林学院</h1>
        <p className="text-h3 text-ink-light max-w-xs">和熊大熊二一起学英语!</p>
        <p className="text-meta text-ink-light max-w-sm leading-relaxed">
          基于新概念英语,融入闯关、段位、连击等游戏化设计,让 6-12 岁孩子爱上英语学习
        </p>
        {/* ... 3 个亮点卡片 + CTA 按钮 */}
      </motion.div>
      {/* Footer */}
      <p className="text-center text-[9px] text-ink-muted py-3">
        角色形象素材来源于公开网络 · 版权归原作者 · 本地学习使用
      </p>
    </div>
  );
}
```

**你作为 AI 负责:**
- 完整实现 `src/pages/WelcomePage.tsx`
- 3 个亮点卡片要简洁,每张 2-3 行
- 所有动画引用 `springs` from `../../utils/motion-tokens`
- CTA 按钮点击 → `window.location.href = '/login'`
- 在 LoginPage 底部加"← 返回首页"链接,指向 `/welcome`

#### 改动 2 · 路由调整

**文件:** `src/App.tsx`

1. 顶部 lazy import 加 `const WelcomePage = lazy(() => import('./pages/WelcomePage'));`
2. 在 `<Routes>` 最前面加 `<Route path="/welcome" element={<WelcomePage />} />`
3. RequireAuth 的 fallback 从 `<Navigate to="/login" />` 改为 `<Navigate to="/welcome" />`

**文件:** `src/components/common/RequireAuth.tsx`

把 `return <Navigate to="/login" replace />;` 改为 `return <Navigate to="/welcome" replace />;`

#### 改动 3 · LoginPage 加返回入口

**文件:** `src/pages/LoginPage.tsx`

在登录表单下方、模式切换按钮上方,加一行到 Welcome 的链接:
```tsx
<a href="/welcome" className="text-xs text-ink-muted block text-center mt-3 hover:text-ink-light">
  ← 了解温暖森林学院
</a>
```

### 验证要求
- `npx tsc -b` 零错误
- 清掉 localStorage token → 访问 `http://localhost:5173/` → 看到 WelcomePage (不是登录页)
- 点击"开始学习"→ 跳 `/login`
- 登录成功 → 正常进首页
- 刷新 → 不再看到 WelcomePage (已登录)

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: 密码找回 + 错误降级 (预计 1.5 小时)

### 目标
当前密码重置不可用(只弹 alert "联系管理员")。做成实际可用的流程。同时加 API 失败降级,后端挂了不白屏。

### 背景
`backend/main.py` 已有 `/api/auth/forgot-password` (生成 6 位验证码,打印到日志) 和 `/api/auth/reset-password` (验证码 + 新密码)。当前前端 LoginPage 没有 forgot 模式(批次 0 中移除了)。

需要在"简单可用"和"完美体验"之间做选择:
- **方案 A (推荐 MVP):** 生成 reset token,返回给用户 (控制台可查看),用户输入 token + 新密码完成重置。不需要外部邮件服务。
- **方案 B (完整):** 接入 Resend/SendGrid 发邮件。需要 API key。

**本次采用方案 A**,后续可升级为方案 B。

### 我需要的改动

#### 改动 1 · 后端: 规范密码重置

**文件:** `backend/main.py`

保持现有 `/api/auth/forgot-password` 和 `/api/auth/reset-password` 不变,只在 forgot 接口返回时加提示:

```python
@app.post("/api/auth/forgot-password")
def forgot_password(data: dict):
    username = data.get("username", "")
    user = get_user_by_username(username)
    if not user:
        return {"ok": True, "message": "如果账号存在，重置码已生成"}
    code = str(_random.randint(100000, 999999))
    _reset_codes[username] = {"code": code, "expires": _time.time() + 600}
    print(f"[PWD RESET] user={username} code={code}")
    return {"ok": True, "message": "重置码已生成,有效期10分钟", "code": code}
```

> 注意: 当前 `code` 已经在返回中。但在方案 A 中的最佳实践是**不返回 code 到前端**(不安全)。改为:
> - `print` 输出到日志(管理员可查)
> - 前端显示"重置码已生成,请在服务器日志中查看"提示

但为了 MVP 可用,直接返回 code 也行——内测阶段没问题。

**新增接口:** `PUT /api/user/password`

```python
@app.put("/api/user/password")
def change_password(data: dict, user: dict = Depends(get_current_user)):
    old_pw = data.get("old_password", "")
    new_pw = data.get("new_password", "")
    if not verify_password(old_pw, user["password_hash"], user["salt"]):
        raise HTTPException(400, "原密码错误")
    if len(new_pw) < 4:
        raise HTTPException(400, "新密码至少4位")
    h, s = hash_password(new_pw)
    conn = get_db()
    conn.execute("UPDATE users SET password_hash=?, salt=? WHERE id=?", (h, s, user["id"]))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "message": "密码已修改"}
```

**新增接口:** `DELETE /api/user/account`

```python
@app.delete("/api/user/account")
def delete_account(user: dict = Depends(get_current_user)):
    uid = user["id"]
    conn = get_db()
    for table in ["answer_records", "daily_stats", "user_progress"]:
        conn.execute(f"DELETE FROM {table} WHERE user_id=?", (uid,))
    conn.execute("DELETE FROM users WHERE id=?", (uid,))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "message": "账号已删除"}
```

#### 改动 2 · 前端: LoginPage 加忘记密码流程

**文件:** `src/pages/LoginPage.tsx`

加一个新的子状态 `forgotSteps: 'idle' | 'code_sent' | 'reset_done'`。

1. 点击"忘记密码?"→ 弹出输入框让用户输用户名 → 点"发送重置码"
2. 调用 `POST /api/auth/forgot-password { username }`
3. 后端返回 `code` → 前端显示 "重置码: XXXXXX (有效期10分钟)"
4. 用户输入重置码 + 新密码 → 调用 `POST /api/auth/reset-password { username, code, new_password }`
5. 成功后显示 "密码已重置,请登录" → 切回 login 模式

**具体实现:**
- 在 LoginPage 组件中加 `const [forgotStep, setForgotStep] = useState<'idle' | 'sent'>('idle');` 和 `const [resetCode, setResetCode] = useState('');`
- 点击"忘记密码?"→ setForgotStep('sent')
- 显示: 用户名输入框 + "发送重置码" 按钮(调用 forgot API) + 重置码输入框 + 新密码输入框 + "重置密码" 按钮(调用 reset API)
- 成功后 → 切回 login 模式 + 提示 "密码已重置,请登录"
- 加"取消"按钮回到正常登录

#### 改动 3 · API 错误降级

**文件:** `src/db/api.ts`

改造 `request` 函数,当后端不可达时抛出特定错误:

```ts
async function request(path: string, options: RequestInit = {}, retries = 1): Promise<any> {
  // ...现有逻辑...
  // 在所有 catch 中,如果是 TypeError (fetch failed),用更友好的文案
  catch (e: any) {
    if (e instanceof TypeError && e.message.includes('fetch')) {
      throw new Error('后端服务暂不可用,本地数据不受影响');
    }
    // ...现有逻辑...
  }
}
```

**文件:** `src/components/common/ErrorBoundary.tsx`

确保现有 ErrorBoundary 能 catch 到 API 错误并显示"网络出问题了"而不是白屏。

**文件:** `src/App.tsx`

在 App 初始化时调 `api.health()` 检测后端状态,如果不可达则在顶部显示黄色警告条(类似现有的 offline 条):
```tsx
const [backendOffline, setBackendOffline] = useState(false);
useEffect(() => {
  api.health().catch(() => setBackendOffline(true));
}, []);
// 渲染: {backendOffline && <黄色条>"后端暂不可用,学习数据保存在本地"</黄色条>}
```

#### 改动 4 · Profile 页加改密码入口

**文件:** `src/pages/ProfilePage.tsx`

在"⚙️ 设置" section 中,加一个"🔑 修改密码"按钮。点击后弹一个简单的 modal/或 inline 表单:
- 原密码
- 新密码
- 确认新密码
- "保存" 按钮 → `PUT /api/user/password`

在"⚙️ 设置" section 中,加"🗑️ 删除账号"按钮(红色,`text-berry`)。点击后:
- `confirm('确定要删除账号吗?所有学习数据将被永久删除。')`
- 调用 `DELETE /api/user/account`
- 成功后 `logout()` + 跳 `/welcome`

### 验证要求
- `npx tsc -b` 零错误
- 启动后端: `python3 -m uvicorn main:app --port 8000`
- 忘记密码流程: 输用户名 → 看到重置码 → 输码+新密码 → 重置成功 → 用新密码登录
- 改密码: 登录后 Profile → 改密码 → 用新密码重新登录
- 删除账号: Profile → 删除账号 → 确认 → 账号消失 → 跳到 Welcome
- 停掉后端 (`kill %1`) → 刷新前端 → 顶部显示黄色"后端暂不可用"条,本地数据仍可做题

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: 后端角色系统 + 家庭绑定 (预计 2 小时)

### 目标
为 SaaS 多用户架构打基础。users 表加角色字段,注册时选角色,家长生成家庭码,学生用码绑定。

### 背景
当前 `users` 表: `id, username, password_hash, salt, nickname, created_at`。所有用户平等,没有角色概念。排行榜是全局混排。

### 我需要的改动

#### 改动 1 · 数据库迁移

**文件:** `backend/db.py`

在 `init_db()` 函数中,`CREATE TABLE users` 语句加 4 个新字段:

```sql
-- 在 users 表定义中增加:
role TEXT DEFAULT 'student',         -- 'student' | 'parent'
family_code TEXT DEFAULT '',         -- 家长: 家庭唯一码; 学生: 空(通过 parent_id 关联)
parent_id INTEGER DEFAULT NULL,      -- 学生: 关联的家长 user_id; 家长: NULL
FOREIGN KEY(parent_id) REFERENCES users(id)
```

> **注意:** SQLite 的 `CREATE TABLE IF NOT EXISTS` 不会修改已有表。需要在 `init_db` 中加 `ALTER TABLE` 迁移逻辑——用 try/except 包裹每条 ALTER,忽略 "duplicate column" 错误。

```python
# 在 init_db() 建表之后加迁移:
migrations = [
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'",
    "ALTER TABLE users ADD COLUMN family_code TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN parent_id INTEGER DEFAULT NULL",
]
for m in migrations:
    try:
        conn.execute(m)
    except:
        pass  # 列已存在,忽略
```

#### 改动 2 · Pydantic 模型更新

**文件:** `backend/models.py`

新增模型:

```python
class UserCreate(BaseModel):
    username: str
    password: str
    nickname: str = ""
    role: str = "student"           # 'student' | 'parent'
    family_code: str = ""           # 学生注册时输入的家庭码

class UserResponse(BaseModel):
    id: int
    username: str
    nickname: str
    role: str = "student"
    family_code: str = ""
    parent_id: Optional[int] = None
    created_at: str

class FamilyBindRequest(BaseModel):
    family_code: str                # 学生绑定时输入

class ChildUnlockRequest(BaseModel):
    lesson_group: str               # 要解锁/锁定的课组
            
class ResetLessonRequest(BaseModel):
    lesson_group: str
```

#### 改动 3 · 后端注册逻辑升级

**文件:** `backend/main.py`

**改 `/api/auth/register`:**

```python
@app.post("/api/auth/register")
def register(data: UserCreate):
    # 1. 校验
    if not data.username or not data.password: raise HTTPException(400, "...")
    if len(data.username) < 3: raise HTTPException(400, "...")
    if get_user_by_username(data.username): raise HTTPException(400, "用户名已存在")
    
    # 2. 家长注册: 生成 6 位家庭码
    family_code = ""
    if data.role == "parent":
        import secrets, string
        family_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    
    # 3. 学生注册: 验证家庭码,找到家长
    parent_id = None
    if data.role == "student" and data.family_code:
        conn = get_db()
        parent = conn.execute("SELECT id FROM users WHERE family_code=? AND role='parent'",
            (data.family_code,)).fetchone()
        if not parent:
            raise HTTPException(400, "家庭码无效,请检查后重试")
        parent_id = dict(parent)["id"] if parent else None
    
    # 4. 创建用户
    h, s = hash_password(data.password)
    user = create_user(data.username, h, s, data.nickname, data.role, family_code, parent_id)
    token = create_token(user["id"])
    return {"access_token": token, "user": {..., "role": data.role, "family_code": family_code}}
```

**改 `backend/db.py` 中 `create_user` 函数:**

```python
def create_user(username: str, password_hash: str, salt: str, nickname: str,
                role: str = "student", family_code: str = "", parent_id: int = None):
    conn = get_db()
    conn.execute(
        "INSERT INTO users (username, password_hash, salt, nickname, role, family_code, parent_id) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (username, password_hash, salt, nickname, role, family_code, parent_id))
    if hasattr(conn, 'commit'): conn.commit()
    return get_user_by_username(username)
```

#### 改动 4 · 新增家长 API

**文件:** `backend/main.py`

```python
# 1. 学生绑定家庭 (已登录学生补绑)
@app.post("/api/family/bind")
def bind_family(data: FamilyBindRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    parent = conn.execute("SELECT id FROM users WHERE family_code=? AND role='parent'",
        (data.family_code,)).fetchone()
    if not parent:
        raise HTTPException(400, "家庭码无效")
    parent_id = dict(parent)["id"]
    conn.execute("UPDATE users SET parent_id=? WHERE id=?", (parent_id, user["id"]))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "parent_id": parent_id}

# 2. 家长查看绑定学生列表
@app.get("/api/parent/children")
def get_children(user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可访问")
    conn = get_db()
    rows = conn.execute(
        "SELECT id, username, nickname, created_at FROM users WHERE parent_id=?",
        (user["id"],)).fetchall()
    children = []
    for r in rows:
        d = dict(r) if not isinstance(r, dict) else r
        # 查该学生的进度
        prog = conn.execute(
            "SELECT COUNT(*) as total, SUM(completed) as done FROM user_progress WHERE user_id=?",
            (d["id"],)).fetchone()
        pdict = dict(prog) if not isinstance(prog, dict) else prog
        children.append({
            "id": d["id"], "username": d["username"], "nickname": d.get("nickname",""),
            "total_lessons": pdict["total"] or 0, "completed_lessons": pdict["done"] or 0,
        })
    return {"children": children, "family_code": user.get("family_code", "")}

# 3. 家长解锁/锁定学生某课
@app.post("/api/parent/child/{child_id}/unlock-lesson")
def unlock_lesson(child_id: int, data: ChildUnlockRequest,
                  user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")
    # 验证 child 属于该家长
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
        (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    # 解锁: 将该课组标记为完成
    conn.execute(
        "INSERT OR REPLACE INTO user_progress (user_id, lesson_group, completed, best_accuracy, attempts) "
        "VALUES (?, ?, 1, 1.0, 0)",
        (child_id, data.lesson_group))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True}

# 4. 家长重置学生某课 (重新锁定)
@app.post("/api/parent/child/{child_id}/reset-lesson")
def reset_lesson(child_id: int, data: ResetLessonRequest,
                 user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
        (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    conn.execute(
        "DELETE FROM user_progress WHERE user_id=? AND lesson_group=?",
        (child_id, data.lesson_group))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True}

# 5. 家长查看单个学生详细报告
@app.get("/api/parent/child/{child_id}/report")
def child_report(child_id: int, user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可访问")
    conn = get_db()
    child = conn.execute("SELECT * FROM users WHERE id=? AND parent_id=?",
        (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    cd = dict(child) if not isinstance(child, dict) else child
    # 统计数据
    progress_rows = get_user_progress(child_id)
    completed = sum(1 for r in progress_rows if r.get("completed"))
    # 各题型正确率
    type_stats = {}
    for qt in ["choice", "fill", "translate", "reorder", "listening"]:
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records "
            "WHERE user_id=? AND question_type=?", (child_id, qt)).fetchone()
        rd = dict(row) if not isinstance(row, dict) else row
        t = rd.get("total", 0) or 0
        c = rd.get("correct", 0) or 0
        type_stats[qt] = {"total": t, "correct": c, "accuracy": round(c / t * 100) if t > 0 else 0}
    
    return {
        "student": {"id": cd["id"], "nickname": cd.get("nickname",""), "username": cd["username"]},
        "completed_lessons": completed,
        "total_lessons": 36,
        "type_stats": type_stats,
    }
```

#### 改动 5 · 前端 API client 加新方法

**文件:** `src/db/api.ts`

```ts
// 在 api 对象中加:
bindFamily: (family_code: string) =>
  request('/api/family/bind', { method: 'POST', body: JSON.stringify({ family_code }) }),
getChildren: () => request('/api/parent/children'),
unlockLesson: (childId: number, lessonGroup: string) =>
  request(`/api/parent/child/${childId}/unlock-lesson`, { method: 'POST', body: JSON.stringify({ lesson_group: lessonGroup }) }),
resetLesson: (childId: number, lessonGroup: string) =>
  request(`/api/parent/child/${childId}/reset-lesson`, { method: 'POST', body: JSON.stringify({ lesson_group: lessonGroup }) }),
childReport: (childId: number) => request(`/api/parent/child/${childId}/report`),
changePassword: (oldPassword: string, newPassword: string) =>
  request('/api/user/password', { method: 'PUT', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),
deleteAccount: () => request('/api/user/account', { method: 'DELETE' }),
```

### 验证要求
- 启动后端 → 注册一个家长账号 "爸爸" (role=parent) → 返回 `family_code`,如 "A3B7X2"
- 注册一个学生账号 "小明" (role=student, family_code="A3B7X2") → 成功
- 注册另一个学生 "小红" → 用错误家庭码 → 提示 "家庭码无效"
- GET `/api/parent/children` (带家长 token) → 返回小明和小红
- POST `/api/parent/child/{id}/unlock-lesson` → 学生端课程解锁
- POST `/api/parent/child/{id}/reset-lesson` → 学生端课程重置
- 所有新 API 用 curl 测试通过
- `npx tsc -b` 零错误

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 3: 家长面板前端 (预计 2 小时)

### 目标
家长登录后看到 `/parent` 面板: 学生列表 + 邀请码 + 每个学生的操作入口。

### 背景
后端已完成角色和家庭绑定,前端需要在 LoginPage 加角色选择,并新建家长面板页面。

### 我需要的改动

#### 改动 1 · LoginPage 加角色选择

**文件:** `src/pages/LoginPage.tsx`

在注册表单中,密码输入框下方,提交按钮上方,加角色选择:

```tsx
{/* 角色选择 (仅在注册模式显示) */}
{mode === 'register' && (
  <div className="flex gap-2">
    <button type="button" onClick={() => setRole('student')}
      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
        role === 'student' ? 'border-forest bg-forest-pale text-forest' : 'border-warm-border text-ink-light'
      }`}>
      📚 我是学生
    </button>
    <button type="button" onClick={() => setRole('parent')}
      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
        role === 'parent' ? 'border-honey bg-honey-pale text-honey' : 'border-warm-border text-ink-light'
      }`}>
      👨‍👩‍👧 我是家长
    </button>
  </div>
)}

{/* 学生角色: 显示家庭码输入 */}
{mode === 'register' && role === 'student' && (
  <input value={familyCode} onChange={e => setFamilyCode(e.target.value.toUpperCase())}
    placeholder="家长给你的家庭码 (6位)" maxLength={6} className="w-full"
    autoComplete="off" />
)}
```

加 state: `const [role, setRole] = useState<'student' | 'parent'>('student');` 和 `const [familyCode, setFamilyCode] = useState('');`

修改 submit 函数,在请求 body 中加 `role` 和 `family_code`。

家长注册成功后,显示生成的 family_code:
```tsx
// 在注册成功分支中:
if (mode === 'register' && role === 'parent') {
  setMsg(`✅ 注册成功! 你的家庭码: ${d.user?.family_code || '未知'}`);
  // 不自动跳转,让家长记住家庭码
}
```

#### 改动 2 · 新建家长面板页面

**新建文件:** `src/pages/ParentDashboardPage.tsx`

这是家长的核心页面。需包含:

1. **顶部 Hero**: "👨‍👩‍👧 我的家庭" + 家庭码展示 (可复制)
   ```
   ┌─────────────────────────────────┐
   │  👨‍👩‍👧 我的家庭                  │
   │  邀请码: A3B7X2  [📋 复制]       │
   │  让学生注册时输入此码加入你的家庭    │
   └─────────────────────────────────┘
   ```
   点击"复制"→ `navigator.clipboard.writeText(familyCode)` → 显示"已复制"

2. **学生列表** (卡片形式):
   ```
   ┌─────────────────────────────────┐
   │  🐻 小明  已完成 12/36 课        │
   │  📊 正确率 85%                   │
   │  [查看详情]                      │
   └─────────────────────────────────┘
   ```

3. **空状态**: 如果没有绑定的学生,显示 "还没有学生加入,让学生注册时输入你的邀请码即可"

4. **学生详情** (点击"查看详情"展开):

   用 state `const [selectedChild, setSelectedChild] = useState<number | null>(null)` 控制。

   展开后是一张详情卡片:
   - 调用 `api.childReport(childId)` 获取详细数据
   - 显示: 正确率、各题型正确率 (词汇/语法/句型/听力)
   - 底部两个按钮: [解锁全部课程] [锁定全部课程]

5. **底部导航**: 家长面板有自己的底部导航或者通过 Profile 页进入

**此页面需要 lazy import 并在 App.tsx 中注册路由:**
```tsx
<Route path="/parent" element={<ParentDashboardPage />} />
```

#### 改动 3 · AppShell 中家长角色适配

**文件:** `src/components/layout/AppShell.tsx`

- 从 `useAuthStore` 读取 `user.role`
- 如果 `role === 'parent'`,底部 Tab 从 5 个改为:
  ```
  🏠 首页 | 👨‍👩‍👧 家庭 | 🌟 星图 | 👤 我的
  ```
  家长不需要"学习"和"复习" Tab(家长不做题)。
- 家长点击"首页" → `/parent`
- `getPageTitle` 函数中加 `if (pathname.startsWith('/parent')) return '👨‍👩‍👧 家庭管理'`

#### 改动 4 · useAuthStore 存 role

**文件:** `src/stores/useAuthStore.ts`

- User interface 加 `role?: string; family_code?: string;`
- login/register 成功后把 `res.user` 中的 role 和 family_code 一起存
- `loadFromStorage` 中,getProfile 成功后设置 role

### 验证要求
- `npx tsc -b` 零错误
- 家长注册 → 看到家庭码 → 复制功能正常
- 学生用码注册 → 绑定成功
- 家长登录 → `/parent` 页面 → 看到学生列表
- 点击学生 → 展开详情 → 看到正确率等数据
- 点击"解锁全部课程" → 学生端对应课程已解锁
- 家长 Tab 导航仅显示 4 个选项 (无学习/复习)

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 4: 学生端感知 + 家长权限生效 (预计 1 小时)

### 目标
学生端能感知自己被家长管理,家长的操作(解锁/锁定)实时生效。

### 背景
批次 3 完成了家长面板,学生端需要配合:
1. 感知绑定状态
2. 家长解锁/锁定的课立即反映在学生的课程列表中
3. 学生在 Profile 能看到"已加入 XXX 的家庭"

### 我需要的改动

#### 改动 1 · LessonSelect/LessonDetail 读取家长解锁状态

**文件:** `src/stores/useLessonProgressStore.ts`

当前 `isUnlocked` 的判断是: 前一课 completed → 当前课解锁。需要加一个逻辑:

**家长手动解锁的课 → 总是解锁(不管前一课是否完成)。**

在前端,需要知道哪些课被家长解锁了。有两种方式:
- **方式 A (简单):** 家长调用 unlock API 后,后端直接设 `completed=1`,学生端登录时 `syncProgressFromServer` 会拉下来。
- **方式 B (精细):** 后端加一个 `unlocked_by_parent` 字段区分"真实完成"和"家长解锁"。

**本次采用方式 A——家长解锁 = 标记 completed = 1,简单有效。**

学生端 `syncProgressFromServer` 会自动拉取,无需额外改动。

#### 改动 2 · HomePage 加家庭归属感

**文件:** `src/pages/HomePage.tsx`

在 Hero 角色问候卡片底部,如果学生有 parent_id,显示一行小字:
```tsx
{user?.parent_id && (
  <p className="text-[10px] text-ink-muted mt-1">👨‍👩‍👧 已加入家庭学习小组</p>
)}
```

#### 改动 3 · Profile 页加家庭信息

**文件:** `src/pages/ProfilePage.tsx`

在 Hero 区域,昵称下方,如果用户有 parent_id 或 role===parent,显示:
```tsx
{user?.role === 'parent' && (
  <p className="text-meta text-forest font-bold">👨‍👩‍👧 家长 · {user?.family_code ? `邀请码: ${user.family_code}` : ''}</p>
)}
{user?.parent_id && (
  <p className="text-meta text-ink-light">📚 学生 · 已加入家庭</p>
)}
```

#### 改动 4 · 后端: 排行榜可筛选家庭

**文件:** `backend/main.py`

为排行榜加一个可选参数 `family`,家长可选择只看自己家庭的学生:

```python
@app.get("/api/leaderboard")
def leaderboard(sort: str = "completed", limit: int = 50, family_user_id: int = None):
    conn = get_db()
    if family_user_id:
        # 只查该家长的学生
        cur = conn.execute(
            "SELECT u.id, u.username, u.nickname, COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed "
            "FROM users u LEFT JOIN user_progress up ON u.id = up.user_id "
            "WHERE u.parent_id=? GROUP BY u.id ORDER BY completed DESC LIMIT ?",
            (family_user_id, limit))
    else:
        cur = conn.execute(
            "SELECT u.id, u.username, u.nickname, COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed "
            "FROM users u LEFT JOIN user_progress up ON u.id = up.user_id "
            "GROUP BY u.id ORDER BY completed DESC LIMIT ?", (limit,))
    # ... 其余不变
```

前端 LeaderboardPage 加 "🏠 只看家庭" 按钮(仅家长可见),点击后传 `family_user_id` 参数。

### 验证要求
- `npx tsc -b` 零错误
- 家长解锁一节课 → 学生端刷新 → 该课已解锁可进入
- 学生首页 → 显示 "已加入家庭学习小组"
- 学生 Profile → 显示 "已加入家庭"
- 家长在排行榜点"只看家庭"→ 仅显示自己孩子
- 所有新功能不影响现有正常流程 (单人用户也能正常用)

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序 & 依赖关系

```
批次 0 (Landing Page)     ← 无依赖,先做 (2h)
    ↓
批次 1 (密码+降级)        ← 无硬依赖,可在 0 之后做 (1.5h)
    ↓
批次 2 (后端角色+家庭)    ← 依赖批次 1 的密码 API (共用 models.py 改动) (2h)
    ↓
批次 3 (家长面板前端)     ← 依赖批次 2 的后端 API (2h)
    ↓
批次 4 (学生端感知)       ← 依赖批次 2+3 (1h)
```

**每批次完成后检查清单:**
1. `npx tsc -b` → 零错误
2. 后端启动 `python3 -m uvicorn main:app --reload --port 8000`
3. 前端启动 `npm run dev`
4. 浏览器验证该批次核心功能
5. 不做完不开始下一批

**全部 5 批次完成后,系统应具备:**
- Landing Page (品牌展示)
- 密码找回 + 改密码 + 删账号
- API 错误降级
- 家长/学生角色分离
- 家庭码绑定
- 家长面板 (学生列表 + 解锁/重置 + 报告)
- 学生端感知家庭归属
- 排行榜家庭筛选
- 一个完整的家庭 SaaS 内测版
