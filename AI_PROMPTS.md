# 新概念英语练习系统 — 后续 AI 执行提示词

> **当前状态：** 前端开发完成（React + TS + 357题 L1-24）、本地可运行
> **下一步：** 部署上线 → 扩充题库 → 多用户后端

---

## 第 1 批：Git 初始化 + 推送到 GitHub

```
你是一个全栈工程师。请在 /Users/andy/Documents/Andy AI/new concept english 项目目录下，
完成以下操作，将项目推送到 GitHub。

## 操作步骤

1. 先在 GitHub 上创建一个新的公开仓库，仓库名为 new-concept-english。
   如果用户还没有登录 GitHub CLI，请指导用户用 `gh auth login` 登录。
   然后用 `gh repo create new-concept-english --public --source=. --remote=origin --push` 创建并推送。

2. 推送之前，确认 .gitignore 文件包含以下内容（如果没有则创建）：
   ```
   node_modules/
   dist/
   .env
   .env.local
   data/
   .claude/
   ```

3. 执行 git add . 然后 git commit -m "feat: 新概念英语智能练习系统 v1.0 — L1-24题库357题，熊出没主题"

4. 推送成功后，用 git log --oneline -3 确认提交记录。

## 验证标准
- GitHub 仓库存在，代码已推送
- git status 显示 clean（无未提交文件）

执行完这些提示词后，项目代码必须完整推送到 GitHub，仓库可公开访问。
```

---

## 第 2 批：Vercel 部署

```
你是一个全栈工程师。项目已推送到 GitHub，现在将它部署到 Vercel。

## 操作步骤

1. 确认 package.json 中的 scripts 配置正确：
   - "dev": "vite"
   - "build": "tsc -b && vite build"
   - "preview": "vite preview"

2. 在本地先执行一次完整的构建验证：
   - npm run build
   - 确认 dist/ 目录生成，包含 index.html、assets/、sw.js 等文件
   - 如果有任何构建错误，先修复再继续

3. 使用 Vercel CLI 部署（如果没有安装，先 npm i -g vercel）：
   - 执行 vercel login（用 GitHub 账号登录）
   - 执行 vercel --prod
   - 按提示操作：
     - Set up and deploy? → Y
     - Which scope? → 选择你的账号
     - Link to existing project? → N
     - Project name? → new-concept-english（或自定义）
     - In which directory is your code? → ./
     - Auto-detected Vite project? → Y
     - Want to override settings? → N

4. 部署完成后，Vercel 会输出一个生产 URL，类似：
   https://new-concept-english.vercel.app

5. 用 curl 验证部署成功：
   curl -I https://new-concept-english.vercel.app
   确认返回 HTTP 200

6. 在手机浏览器上打开这个 URL，测试以下功能：
   - 首页正常加载
   - 点击「星图」能看到6个阶段
   - 点击「充能」进入练习界面
   - 选一课开始答题

## 重要注意事项
- 音频文件在 public/audio/ 目录下，会被自动部署
- PWA Service Worker 已配置，添加到主屏幕后可以离线使用
- 如果部署后页面空白，检查 Vercel 的 Build Log 是否有报错

## 验证标准
- 生产 URL 可公网访问，HTTP 200
- 所有页面正常渲染
- PWA manifest 可访问（/manifest.webmanifest）
- 手机浏览器测试通过

执行完这些提示词后，系统必须部署到 Vercel 并且公网可访问，所有页面功能正常，不能有任何 bug。
```

---

## 第 3 批：下载音频文件并部署

```
你是一个全栈工程师。项目已部署到 Vercel，但听力题的音频文件可能不完整。
现在需要从 GitHub 下载新概念英语第一册的配套音频。

## 操作步骤

1. 检查当前 public/audio/ 目录下的文件：
   ls -lh public/audio/

2. 需要的12个音频文件（对应12个课组）：
   lesson-01-02.mp3、lesson-03-04.mp3、lesson-05-06.mp3、lesson-07-08.mp3
   lesson-09-10.mp3、lesson-11-12.mp3、lesson-13-14.mp3、lesson-15-16.mp3
   lesson-17-18.mp3、lesson-19-20.mp3、lesson-21-22.mp3、lesson-23-24.mp3

3. 音频来源：GitHub 仓库 tangx/New-Concept-English
   基础 URL：
   https://raw.githubusercontent.com/tangx/New-Concept-English/main/%E6%96%B0%E6%A6%82%E5%BF%B5%E8%8B%B1%E8%AF%AD%E7%AC%AC1%E5%86%8C%E7%BE%8E%E9%9F%B3%EF%BC%88MP3+LRC%EF%BC%89/NCE1-%E7%BE%8E%E9%9F%B3-(MP3+LRC)

   文件映射（从 GitHub API 获取的精确文件名）：
   - 001&002－Excuse Me.mp3 → lesson-01-02.mp3
   - 003&004－Sorry, Sir..mp3 → lesson-03-04.mp3
   - 005&006－Nice to Meet You..mp3 → lesson-05-06.mp3
   - 007&008－Are You a Teacher.mp3 → lesson-07-08.mp3
   - 009&010－How Are You Today.mp3 → lesson-09-10.mp3
   - 011&012－Is This Your Shirt.mp3 → lesson-11-12.mp3
   - 013&014－A New Dress.mp3 → lesson-13-14.mp3
   - 015&016－Your Passports, Please..mp3 → lesson-15-16.mp3
   - 017&018－How do you do.mp3 → lesson-17-18.mp3
   - 019&020－Tired and Thirsty.mp3 → lesson-19-20.mp3
   - 021&022－Which Book.mp3 → lesson-21-22.mp3
   - 023&024－Which Glasses.mp3 → lesson-23-24.mp3

4. 使用 curl 下载每个文件（注意 URL 中的特殊字符需要编码）：
   用 Python 脚本批量下载：
   ```python
   import urllib.request
   import os

   base = "https://raw.githubusercontent.com/tangx/New-Concept-English/main/%E6%96%B0%E6%A6%82%E5%BF%B5%E8%8B%B1%E8%AF%AD%E7%AC%AC1%E5%86%8C%E7%BE%8E%E9%9F%B3%EF%BC%88MP3+LRC%EF%BC%89/NCE1-%E7%BE%8E%E9%9F%B3-(MP3+LRC)"

   files = {
       "001%26002%EF%BC%8DExcuse%20Me.mp3": "lesson-01-02.mp3",
       "003%26004%EF%BC%8DSorry%2C%20Sir..mp3": "lesson-03-04.mp3",
       "005%26006%EF%BC%8DNice%20to%20Meet%20You..mp3": "lesson-05-06.mp3",
       "007%26008%EF%BC%8DAre%20You%20a%20Teacher.mp3": "lesson-07-08.mp3",
       "009%26010%EF%BC%8DHow%20Are%20You%20Today.mp3": "lesson-09-10.mp3",
       "011%26012%EF%BC%8DIs%20This%20Your%20Shirt.mp3": "lesson-11-12.mp3",
       "013%26014%EF%BC%8DA%20New%20Dress.mp3": "lesson-13-14.mp3",
       "015%26016%EF%BC%8DYour%20Passports%2C%20Please..mp3": "lesson-15-16.mp3",
       "017%26018%EF%BC%8DHow%20do%20you%20do.mp3": "lesson-17-18.mp3",
       "019%26020%EF%BC%8DTired%20and%20Thirsty.mp3": "lesson-19-20.mp3",
       "021%26022%EF%BC%8DWhich%20Book.mp3": "lesson-21-22.mp3",
       "023%26024%EF%BC%8DWhich%20Glasses.mp3": "lesson-23-24.mp3",
   }

   os.chdir("public/audio")
   for src, dst in files.items():
       url = f"{base}/{src}"
       print(f"Downloading {dst}...")
       try:
           urllib.request.urlretrieve(url, dst)
           size = os.path.getsize(dst)
           print(f"  ✓ {dst} ({size} bytes)")
       except Exception as e:
           print(f"  ✗ {dst} failed: {e}")
   ```

   执行这个脚本，下载所有音频文件。

5. 验证：每个文件至少 500KB（正常 800KB-1.5MB）。如果某个文件小于 100KB，说明下载失败，需要重试。

6. 下载完成后，重新部署：
   git add public/audio/
   git commit -m "feat: add all audio files for L1-24"
   git push
   # Vercel 会自动重新部署

7. 部署后测试：打开任意一课的综合测试，播放听力题，确认音频正常播放。

## 验证标准
- 12个音频文件全部下载，每个 ≥500KB
- git push 后 Vercel 自动部署成功
- 听力题可以正常播放音频

执行完这些提示词后，所有音频文件就位，听力题可正常播放，系统完整无 bug。
```

---

## 第 4 批：创建 L25-48 题库（第二阶段 · 行动先锋）

```
你是一个资深英语教师 + 全栈工程师。现在需要为新概念英语第一册 L25-48 创建题库。

## 背景
- 项目已有 L1-24 题库（357题），格式和质量标准已经确立
- 现在要创建 L25-48（第二阶段"行动先锋"）的12个题库文件
- 题型格式参考 src/data/questions/lesson-01-02.ts 等现有文件
- 类型定义参考 src/types/index.ts

## 第二阶段语法重点（L25-48）
- 现在进行时（be + doing）
- There be 句型（There is/are + 名词 + 地点）
- 情态动词 can / must
- 一般将来时（be going to + 动词原形）
- have got 句型
- 可数/不可数名词 + some/any
- 频率副词（always, usually, often, sometimes, never）
- 祈使句进阶

## 12个课组的详细内容

### 1. lesson-25-26.ts — Mrs. Smith's kitchen
课文内容：描述厨房里的物品位置
单词：kitchen, refrigerator, cooker, sink, cupboard, electric, table, bottle, etc.
语法：There is/are 句型（存在有）
目标题数：~30题

### 2. lesson-27-28.ts — Mrs. Smith's living room
课文内容：描述客厅物品位置
单词：living room, sofa, armchair, television, newspaper, magazine, floor, wall, etc.
语法：There be + 介词（near, on, in front of, behind）
目标题数：~30题

### 3. lesson-29-30.ts — Come in, Amy.
课文内容：进房间的对话
单词：come in, shut, open, bedroom, untidy, wardrobe, clothes, etc.
语法：情态动词 must（必须/应该）
目标题数：~28题

### 4. lesson-31-32.ts — Where's Sally?
课文内容：现在进行时描述动作
单词：garden, tree, climb, run, eat, bone, letter, type, etc.
语法：现在进行时 be + doing（正在进行的动作）
目标题数：~30题

### 5. lesson-33-34.ts — A fine day
课文内容：描述天气和户外活动
单词：fine, sun, shine, sky, cloud, family, walk, bridge, boat, river, etc.
语法：现在进行时进阶（天气描述 + 动作描述）
目标题数：~30题

### 6. lesson-35-36.ts — Our village
课文内容：描述村庄环境
单词：village, photograph, between, hill, park, along, bank, beside, etc.
语法：现在进行时 + 介词（between, along, beside）
目标题数：~28题

### 7. lesson-37-38.ts — Making a bookcase
课文内容：制作书架
单词：bookcase, make, work, hard, paint, pink, favourite, hammer, etc.
语法：be going to 将来时（计划要做的事）
目标题数：~30题

### 8. lesson-39-40.ts — Don't drop it!
课文内容：搬运物品的对话
单词：drop, vase, careful, front, flower, show, send, take, etc.
语法：祈使句（Don't + 动词原形）+ be going to
目标题数：~28题

### 9. lesson-41-42.ts — Penny's bag
课文内容：包里的物品
单词：bag, piece, cheese, loaf, bread, bar, soap, chocolate, sugar, etc.
语法：可数/不可数名词 + some/any/a loaf of/a bar of
目标题数：~30题

### 10. lesson-43-44.ts — Hurry up!
课文内容：找东西的对话
单词：hurry, boil, kettle, teapot, cup, behind, find, can, etc.
语法：情态动词 can（能力/可能性）
目标题数：~28题

### 11. lesson-45-46.ts — The boss's letter
课文内容：办公室场景
单词：boss, letter, type, can, ask, minute, terrible, etc.
语法：can/can't + 频率副词
目标题数：~28题

### 12. lesson-47-48.ts — A cup of coffee
课文内容：饮料喜好
单词：coffee, black, white, like, want, biscuit, fresh, egg, etc.
语法：like/want + 现在时 vs 现在进行时对比
目标题数：~30题

## 每道题的解析格式（必须遵守）

每道题 explanation 必须 3-5行，使用以下结构：
```
【语法规则】...具体的规则说明
【词汇辨析】...易混词对比（如适用）
【记忆技巧】...趣味记忆法
【常见错误】...典型错误提醒
```

## 创建文件列表
所有文件放在 src/data/questions/ 下：
lesson-25-26.ts、lesson-27-28.ts、lesson-29-30.ts、lesson-31-32.ts
lesson-33-34.ts、lesson-35-36.ts、lesson-37-38.ts、lesson-39-40.ts
lesson-41-42.ts、lesson-43-44.ts、lesson-45-46.ts、lesson-47-48.ts

## 更新索引文件
在 src/data/questions/index.ts 中导入这12个新文件，加入 allQuestionArrays。

## 更新阶段数据
在 src/data/stages.ts 中，把阶段二的 groups 数组填完整（12个课组）。

## 验证标准
- npx tsc --noEmit 零错误
- npm run build 构建成功
- 在浏览器中打开 /star-map，阶段二应该显示12个课组
- 点击任意课组可以正常进入课程详情和练习

执行完这些提示词后，L1-48 题库完整（~700题），TypeScript 零错误，所有页面可正常交互，不能有任何 bug。
```

---

## 第 5 批：创建 L49-72 题库（第三阶段 · 过去回溯者）

```
你是资深英语教师 + 全栈工程师。在前4批基础上，创建 L49-72 题库。

## 第三阶段语法重点
- 一般过去时（was/were + 规则/不规则动词过去式）
- 形容词比较级（-er/more）和最高级（-est/most）
- be going to（巩固）
- 时间介词（at/on/in）
- 序数词（first, second, third...）

## 12个课组
L49-50（一般过去时 be动词）、L51-52（一般过去时 规则动词）、L53-54（一般过去时 不规则动词）
L55-56（一般过去时 日常活动）、L57-58（过去时 时间表达）、L59-60（购物对话）
L61-62（生病看医生）、L63-64（比较级 -er）、L65-66（比较级 more）
L67-68（最高级）、L69-70（过去时 故事叙述）、L71-72（电话对话 过去时）

每课 ~28-30题，总计 ~350题。解析格式与前两批一致。

创建文件：src/data/questions/lesson-49-50.ts 到 lesson-71-72.ts（12个文件）
更新 src/data/questions/index.ts 和 stages.ts 阶段三 groups

执行完这些提示词后，L1-72 题库完整（~1050题），TypeScript 零错误，系统完整可运行，不能有任何 bug。
```

---

## 第 6 批：创建 L73-96 题库（第四阶段 · 时间编织者）

```
你是资深英语教师 + 全栈工程师。创建 L73-96 题库。

## 第四阶段语法重点
- 现在完成时（have/has + 过去分词）
- 过去进行时（was/were + doing）
- 不定式（to do）
- 时间状语从句（when/while/before/after）
- 副词比较级

## 12个课组
L73-74（现在完成时 入门）、L75-76（现在完成时 不规则动词）、L77-78（现在完成时 经历）
L79-80（have been to/have gone to）、L81-82（现在完成时 vs 一般过去时）
L83-84（现在完成时 持续性）、L85-86（现在完成时 完成性）
L87-88（过去进行时）、L89-90（过去进行时 vs 一般过去时）
L91-92（时间状语从句 when/while）、L93-94（不定式 to do）
L95-96（时间状语从句 before/after）

每课 ~28-30题，总计 ~350题。

创建文件并更新 index.ts 和 stages.ts

执行完这些提示词后，L1-96 题库完整（~1400题），TypeScript 零错误，系统完整可运行，不能有任何 bug。
```

---

## 第 7 批：创建 L97-120 题库（第五阶段 · 逻辑大师）

```
你是资深英语教师 + 全栈工程师。创建 L97-120 题库。

## 第五阶段语法重点
- 宾语从句（I think that... / He says that...）
- 条件句第一类（If + 一般现在时, will + 动词原形）
- 直接引语 → 间接引语（时态变化）
- 定语从句初步（who/which/that）

## 12个课组
L97-98（宾语从句 that 引导）、L99-100（宾语从句 if/whether）、L101-102（宾语从句 wh-词）
L103-104（条件句 第一类 入门）、L105-106（条件句 第一类 进阶）
L107-108（直接引语→间接引语 陈述句）、L109-110（间接引语 时态变化）
L111-112（间接引语 疑问句）、L113-114（间接引语 祈使句）
L115-116（定语从句 who/which）、L117-118（定语从句 that）
L119-120（综合复习 引语+从句）

每课 ~28-30题，总计 ~350题。

执行完这些提示词后，L1-120 题库完整（~1750题），TypeScript 零错误，系统完整可运行，不能有任何 bug。
```

---

## 第 8 批：创建 L121-144 题库（第六阶段 · 文明守护者）

```
你是资深英语教师 + 全栈工程师。创建 L121-144 题库。

## 第六阶段语法重点
- 被动语态（be + 过去分词）
- 条件句第二类（If + 过去式, would + 动词原形）
- 现在完成进行时（have/has been doing）
- 综合复习与应用

## 12个课组
L121-122（被动语态 一般现在时）、L123-124（被动语态 一般过去时）
L125-126（被动语态 现在完成时）、L127-128（被动语态 情态动词）
L129-130（条件句 第二类 入门）、L131-132（条件句 第二类 进阶）
L133-134（现在完成进行时 入门）、L135-136（现在完成进行时 对比完成时）
L137-138（综合复习 时态1）、L139-140（综合复习 时态2）
L141-142（综合复习 从句）、L143-144（综合复习 全册）

每课 ~28-30题，总计 ~350题。

更新 stages.ts 阶段六 groups 为空数组表示无需再细分，在 StarMapPage 中自动按课号范围生成。

执行完这些提示词后，全部144课 ~2100题完整交付，TypeScript 零错误，系统完整可运行，不能有任何 bug。
```

---

## 第 9 批：后端 API + Turso 云数据库（多用户版）

```
你是全栈工程师。在完整题库基础上，构建多用户后端。

## 技术栈
- 后端：Python FastAPI
- 数据库：Turso（生产）/ SQLite（本地开发）双模式
- 认证：JWT + PBKDF2 密码哈希
- 部署：Vercel Serverless Functions

## 创建文件

### 1. backend/requirements.txt
```
fastapi==0.115.0
uvicorn==0.30.0
PyJWT==2.9.0
httpx==0.27.0
```

### 2. backend/.env.example
```
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-token
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://xxx.vercel.app
```

### 3. backend/models.py — Pydantic 数据模型
- UserCreate(username, password, nickname)
- UserLogin(username, password)
- UserResponse(id, username, nickname, created_at)
- TokenResponse(access_token, user)
- LessonProgressResponse(lessonGroup, completed, bestAccuracy, etc.)
- AnswerSubmitRequest(questionId, correct, userAnswer, timeSpent)
- AnswerSubmitResponse(xpEarned, comboBonus)

### 4. backend/db.py — 数据库层
- get_db()：检测 TURSO_URL，有则返回 Turso 连接，无则返回本地 SQLite
- init_db()：创建 users、user_progress、answer_records、review_schedule 表
- 所有 CRUD 函数

### 5. backend/auth.py — 认证模块
- hash_password(password, salt) → PBKDF2+SHA256
- verify_password(password, stored_hash, salt) → bool
- create_token(user_id) → JWT
- decode_token(token) → user_id

### 6. backend/main.py — FastAPI 主入口
- CORS 中间件
- POST /api/auth/register — 注册
- POST /api/auth/login — 登录返回 JWT
- GET /api/user/profile — 获取个人信息（需认证）
- GET /api/user/progress — 获取全部课程进度
- POST /api/practice/submit — 提交单题答案
- GET /api/user/stats — 获取统计数据

### 7. 前端 src/db/api.ts — API 客户端
- login(username, password)
- register(username, password, nickname)
- getProfile()
- getProgress()
- submitAnswer(data)
- getStats()

### 8. 前端 src/stores/useAuthStore.ts — 认证状态
- token, user, isLoggedIn
- login(), register(), logout(), loadFromStorage()

### 9. 前端 src/pages/LoginPage.tsx — 登录/注册页面
- 登录表单：用户名 + 密码
- 注册表单：用户名 + 密码 + 昵称
- 登录后跳转到首页

### 10. 更新前端入口
- src/App.tsx：添加 /login 路由
- src/main.tsx：启动时检查本地 token，自动登录

### 11. 后端部署
- 在 vercel.json 中配置 Serverless Functions：
  ```json
  {
    "functions": {
      "backend/main.py": {
        "runtime": "python3.11"
      }
    }
  }
  ```
- Vercel Secrets 配置 TURSO_URL、TURSO_TOKEN、JWT_SECRET

## 数据迁移策略
- 现有 IndexedDB 数据保留在前端作为离线缓存
- 用户登录后，首次同步将本地数据上传到云端
- 后续每次练习完成后自动同步到云端

## 验证标准
- 本地开发：后端启动在 localhost:8000，前端可正常调用
- 注册新用户 → 登录 → 练习 → 数据同步到 Turso
- 换一个浏览器登录同一账号 → 数据一致
- Vercel 部署后公网可访问

执行完这些提示词后，多用户系统完整，注册/登录/数据同步正常，TypeScript 零错误，不能有任何 bug。
```

---

## 第 10 批：管理员后台 + CSV 题库导入

```
你是全栈工程师。在第9批基础上，构建管理员后台。

## 功能需求
1. 管理员可以上传 CSV 格式的题库文件
2. 系统自动解析 CSV 并导入到 Turso 数据库
3. 管理员可以查看所有用户的统计数据
4. 管理员可以管理用户（查看、禁用、删除）

## CSV 格式
```
序号,题型,难度,课组,标签,题干,选项A,选项B,选项C,选项D,正确答案,解析
```

## 创建文件

### backend/admin.py — 管理后台 API
- POST /api/admin/questions/upload — 上传 CSV 导入题库
- GET /api/admin/users — 查看所有用户
- GET /api/admin/stats — 全局统计
- PUT /api/admin/users/:id — 管理用户

### 前端 src/pages/AdminPage.tsx
- 题库上传界面
- 用户管理表格
- 统计仪表盘

执行完这些提示词后，管理后台可用，CSV 导入题库功能正常，TypeScript 零错误，系统完整可运行，不能有任何 bug。
```

---

## 📋 批次总览

| 批 | 内容 | 关键产出 |
|----|------|---------|
| 1 | Git + GitHub | 代码推送 |
| 2 | Vercel 部署 | 公网 URL |
| 3 | 音频下载 | 12个 MP3 |
| 4 | L25-48 题库 | ~350题 |
| 5 | L49-72 题库 | ~350题 |
| 6 | L73-96 题库 | ~350题 |
| 7 | L97-120 题库 | ~350题 |
| 8 | L121-144 题库 | ~350题 |
| 9 | 后端 + 多用户 | 注册/登录 |
| 10 | 管理后台 | CSV 导入 |
