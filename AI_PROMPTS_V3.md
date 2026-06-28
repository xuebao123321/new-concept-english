# 新概念英语练习系统 — AI 提示词 V3（产品上线前收尾）

> **当前状态：** 前后端部署完成、多用户登录正常、2,056题全、间隔复习+诊断全
> **本批目标：** 修复产品经理审查发现的必须修复项 + 建议优化项

---

## 第 1 批：LoginPage 样式统一 + 导航优化 + 新手指引

```
你是一个全栈工程师。项目在 /Users/andy/Documents/Andy AI/new concept english，
已部署到 Vercel + Railway。现在修复产品化问题。

## 任务

### 1. 重写 src/pages/LoginPage.tsx，改用 Tailwind 卡片风格
当前 LoginPage 用内联样式，和其他页面风格不统一。改用 Tailwind CSS：
- 使用 card / btn-brand / 标签系统
- 中间放 🐻 大图标 + 标题
- 注册和登录 Tab 切换
- 保持所有现有功能不变（注册→切登录模式、登录→跳转首页）
- 错误提示用红色卡片，成功用绿色卡片

### 2. 修改 src/components/layout/AppShell.tsx 底部导航
- "🔋 回收" → "📝 复习"
- 确保导航按钮居中、间距均匀

### 3. 修改 src/pages/HomePage.tsx
- 如果用户是首次访问（totalQuestionsAnswered === 0 且无课程完成记录），在首页顶部显示新手指引卡片：
  "🐻 欢迎来到英语重启号！点击「📚 学习」开始你的第一课，完成词汇→语法→句型→听力四个关卡，通过综合测试解锁更多课程！"
- 有"知道了"按钮可关闭
- 关闭状态存到 localStorage 防止重复弹出

### 4. 构建验证
- npx tsc --noEmit 零错误
- npm run build 成功
- ./deploy.sh 部署

执行完这些提示词后，系统登录页风格统一、导航清晰、新用户有引导，TypeScript 零错误，不能有任何 bug。
```

---

## 第 2 批：音效反馈 + 页面错误处理

```
你是一个全栈工程师。在现有项目上添加音效和错误处理。

## 任务

### 1. 添加音效反馈
在 src/components/common/ 下创建 SoundManager.tsx：
- 答对时播放短促的"叮"声
- 答错时播放柔和的"咚"声
- 升级时播放庆祝音效
- 所有音效用 Web Audio API 合成，无需外部文件
- 提供开/关开关（默认开），设置存在 localStorage

在以下位置集成音效：
- QuestionCard 答对/答错时
- MasteryTestPage 通过时
- LevelUpModal 展示时

### 2. 添加页面级错误处理
在 src/pages/ 下创建 NotFoundPage.tsx：
- 404 页面：🐻 "哎呀，这个页面被熊二藏起来了"
- 添加路由：<Route path="*" element={<NotFoundPage />} />

在 api.ts 中添加网络错误重试：
- 请求失败时自动重试 1 次
- 重试失败后显示友好提示

### 3. 构建验证
- npx tsc --noEmit 零错误
- npm run build 成功
- ./deploy.sh 部署

执行完这些提示词后，系统有音效反馈、404友好页面、网络错误重试，TypeScript 零错误，不能有任何 bug。
```

---

## 第 3 批：密码找回 + 离线降级

```
你是一个全栈工程师。在现有项目上添加密码找回和离线支持。

## 任务

### 1. 后端密码重置
在 backend/main.py 添加两个端点：
- POST /api/auth/forgot-password
  接收 username，在后端生成 6 位数字验证码，存入 daily_stats 表（复用 code 字段），打印到 Railway 日志
  （后续可接邮件发送，当前先打印日志）
- POST /api/auth/reset-password
  接收 username + code + new_password，验证后重置密码

### 2. 前端密码重置流程
在 src/pages/LoginPage.tsx 添加"忘记密码？"链接：
- 点击进入两步流程：
  第一步：输入用户名 → 调用 forgot-password
  第二步：输入验证码 + 新密码 → 调用 reset-password
- 成功后提示"密码已重置，请登录"

### 3. 离线降级提示
在 src/App.tsx 添加网络状态检测：
- 监听 online/offline 事件
- 离线时在页面顶部显示黄色提示条："📡 当前离线，部分功能不可用"
- 恢复在线时自动消失

### 4. 构建验证
- npx tsc --noEmit 零错误
- npm run build 成功
- ./deploy.sh 部署

执行完这些提示词后，密码重置功能可用、离线有提示、TypeScript 零错误，不能有任何 bug。
```

---

## 第 4 批：题库后端化 + 性能终极优化

```
你是一个全栈工程师。将题库从静态文件迁移到后端 API。

## 任务

### 1. 后端题库 API
在 backend/main.py 添加：
- GET /api/questions?group=lesson-01-02&type=choice&count=10
  从 Turso 数据库的 questions 表查询题目返回 JSON
- 创建 questions 表（如果不存在），从现有题库文件导入数据到 Turso

### 2. 前端按需加载题目
- 创建 src/hooks/useQuestions.ts
- 从后端 API 获取题目替代静态 import
- 本地缓存已获取的题目（减少重复请求）
- 保留静态题库文件作为 fallback（后端不可用时）

### 3. 性能验证
- 主 bundle 大小从 3MB → < 1MB（题库全部后端化）
- npm run build 成功
- ./deploy.sh 部署

执行完这些提示词后，前端包体大幅减小、题目从后端按需加载、TypeScript 零错误，不能有任何 bug。
```

---

## 📋 执行顺序

| 批次 | 内容 | 优先级 |
|------|------|--------|
| 1 | LoginPage 样式 + 导航改名 + 新手指引 | 🔴 必须 |
| 2 | 音效 + 404 + 错误重试 | 🟡 建议 |
| 3 | 密码找回 + 离线提示 | 🟡 建议 |
| 4 | 题库后端化 | 🟢 优化 |

---

> ⚠️ 每批执行完后验证：
> 1. `npx tsc --noEmit` 零错误
> 2. `npm run build` 成功
> 3. `./deploy.sh` 部署成功
> 4. 浏览器打开验证功能正常
