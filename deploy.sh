#!/bin/bash
# 新概念英语练习系统 — 一键部署脚本
echo "🔨 Building..."
npm run build
echo "📦 Deploying to Vercel..."
echo '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > dist/vercel.json
npx vercel deploy dist --prod -y
echo "✅ Done! Open the URL above."
