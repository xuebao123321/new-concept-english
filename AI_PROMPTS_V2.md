# 新概念英语练习系统 — AI 分批提示词 V2

> **当前状态：** 前端完成（React + 2,056题 + 熊出没主题 + Vercel上线）
> 后端完成（FastAPI + JWT + Turso/SQLite 双模式，本地可运行）
> **下一步：** 部署后端 → 完善功能 → 优化

---

## 第 1 批：后端部署到 Railway

```
你是一个全栈工程师。当前项目在 /Users/andy/Documents/Andy AI/new concept english，
前端已部署到 Vercel，后端 FastAPI 在本地能跑。现在需要把后端部署到 Railway（免费、原生 Python 支持）。

## 操作步骤

1. 先在 Railway 创建一个 Python 服务：
   - 打开 railway.com → 用 GitHub 登录
   - 点击 New Project → Deploy from GitHub repo
   - 选择 xuebao123321/new-concept-english
   - Root Directory 填 backend
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

2. Railway 自动部署后会生成一个 URL，类似 https://nce-api.up.railway.app

3. 在 Railway 项目 Settings → Variables 添加环境变量：
   TURSO_URL=libsql://nce-db-xuebao123321.aws-us-west-2.turso.io
   TURSO_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI1Mzc4OTIsImlkIjoiMDE5ZjA3ODktNjYwMS03M2RhLWI3MDMtZTAzM2YwNDIxYTNhIiwicmlkIjoiOTc3NjA2YTMtN2FlZS00NThmLWFjNzMtYzBiYTZlNzVmNTM5In0.04DN7IvBfWtXy520Mf3guykxj28xfk8r7w_THwi6cPKxrf6S5vAdDTPm_zj2_R2z-6IooXK8E1vcuvBaVrvcCA
   JWT_SECRET=nce-jwt-2026-secret-key
   CORS_ORIGIN=https://new-concept-english-miybvd5lq-andys-projects-092ebccc.vercel.app

4. 验证后端部署成功：
   curl https://nce-api.up.railway.app/api/health
   确认返回 {"status": "ok"}

5. 更新前端代码，连接生产后端：
   编辑 src/db/api.ts，把 API_BASE 改为：
   ```
   const API_BASE = import.meta.env.PROD
     ? 'https://nce-api.up.railway.app'
     : 'http://localhost:8000';
   ```

6. 提交并推送：
   git add . && git commit -m "feat: 连接Railway生产后端" && git push

7. Vercel 自动重新部署。打开 Vercel 网址 /login 测试注册登录。

## 验证标准
- Railway 后端 curl 返回 HTTP 200
- Vercel 前端 /login 可注册登录
- 手机浏览器打开也能用

执行完这些提示词后，系统前后端都部署到公网，任何设备都能注册登录使用，不能有任何 bug。
```

---

## 第 2 批：间隔复习引擎

```
你是一个全栈工程师。在现有项目基础上，实现完整的间隔复习引擎。

## 需求
孩子通过综合测试（100%正确）后，系统自动安排巩固检查：
- 第1天（通过后24h） → 随机抽5题，必须全对
- 第3天 → 随机抽5题 + 混入2题更早的课
- 第7天 → 随机抽8题 + 混入3题更早的课
- 第30天 → 随机抽10题，全对→标记"永久掌握"

任何一次巩固检查失败 → 该课降级为"需回炉" → 重新综合测试。

## 实现步骤

1. 在 src/db/database.ts 中新增 reviewSchedule 表：
   - id, lessonGroup, stage(1/3/7/30), dueAt(timestamp), status(pending/completed/failed), score

2. 创建 src/utils/review-scheduler.ts：
   - scheduleReview(lessonGroup): 综合测试通过后自动排4次复习
   - getDueReviews(): 获取今日到期的复习任务
   - completeReview(lessonGroup, stage, passed): 完成复习，记录结果
   - resetLesson(lessonGroup): 复习失败，课程降级

3. 在综合测试通过后（MasteryTestPage），调用 scheduleReview()

4. 创建 src/pages/ScheduledReviewPage.tsx（/review/scheduled）：
   - 展示今日待复习列表
   - 点击进入复习答题
   - 通过/失败反馈

5. 首页增加"今日复习提醒"卡片（如果有待复习任务）

6. 更新 App.tsx 添加路由

执行完这些提示词后，间隔复习引擎完整可用，TypeScript 零错误，npm run build 成功。
```

---

## 第 3 批：快速诊断模式

```
你是一个全栈工程师。实现快速诊断功能。

## 需求
孩子已经学完全部144课（或部分），想快速找到薄弱课针对性练习。
从每课组随机抽3-5题 → 72课组 × 4题 ≈ 288题总诊断。

## 实现步骤

1. 创建 src/utils/diagnosis-engine.ts：
   - generateDiagnosis(): 从每个课组随机抽4题
   - analyzeDiagnosis(results): 计算每课正确率，分类为掌握/基本了解/薄弱
   - getRecommendedPath(): 生成推荐学习路径（先薄弱→再中等→最后巩固掌握）

2. 创建 src/pages/DiagnosisPage.tsx：
   - 诊断介绍页 + 开始按钮
   - 分批次答题（每次20题，分15次完成）
   - 进度保存，可中断续做
   - 诊断报告页：三色分类（🟢掌握 🟡基本 🔴薄弱）
   - 一键生成学习路径

3. 首页增加"快速诊断"入口

4. 更新 App.tsx 路由

执行完这些提示词后，快速诊断功能完整，TypeScript 零错误，npm run build 成功。
```

---

## 第 4 批：Vercel 前端更新 + 全局优化

```
你是一个全栈工程师。在前几批基础上做全局优化。

## 需求

1. 代码分割：当前 JS bundle 3.1MB，太大。用 React.lazy + Suspense 拆分路由：
   - 首页、StarMapPage、LoginPage 优先加载
   - LessonDetailPage、BlockSessionPage、MasteryTestPage 按需加载
   - ReviewPage、AchievementsPage、ProfilePage 按需加载

2. 更新 index.html PWA meta 标签：
   - 添加 <meta name="mobile-web-app-capable" content="yes">
   - 移除过时的 apple-mobile-web-app-capable

3. 验证生产构建：
   - npm run build 确认无警告（chunk 大小）
   - 确认 PWA 离线可用
   - 确认所有页面正常

4. 提交推送，Vercel 自动部署

执行完这些提示词后，系统性能优化完成，所有页面加载迅速，PWA 正常工作，TypeScript 零错误。
```

---

## 第 5 批：后端部署调试（如果 Railway 不行）

```
如果第1批Railway部署不成功，用这个备用方案。

## 方案：后端保持本地运行 + ngrok 隧道

1. 安装 ngrok：brew install ngrok

2. 本地启动后端：cd backend && python3 main.py

3. 新终端启动隧道：ngrok http 8000

4. ngrok 会输出一个公网 URL，类似 https://xxx.ngrok-free.app

5. 更新 src/db/api.ts：
   const API_BASE = 'https://xxx.ngrok-free.app'

6. 提交推送，Vercel 重新部署

优点：不需要服务器，免费，5分钟搞定
缺点：本地电脑必须开着

适合在孩子练习时段临时使用。长期方案还是 Railway。
```

---

## 📋 执行顺序

| 批次 | 内容 | 预计时间 |
|------|------|---------|
| 1 | Railway 部署后端 | 15分钟 |
| 2 | 间隔复习引擎 | 开发 |
| 3 | 快速诊断模式 | 开发 |
| 4 | 全局优化 | 30分钟 |
| 5 | 备用：ngrok隧道 | 5分钟（备选） |
