"""Vercel Serverless 入口 — 导入 FastAPI app"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app

# Vercel 要求导出 `app` 变量
# 不需要 uvicorn.run() — Vercel 自动处理 HTTP
