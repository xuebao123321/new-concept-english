"""FastAPI 主入口"""
import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import UserCreate, UserLogin, UserResponse, TokenResponse, AnswerSubmitRequest, AnswerSubmitResponse, UserStatsResponse
from auth import hash_password, verify_password, create_token, decode_token
from db import init_db, create_user, get_user_by_username, get_user_by_id, get_user_progress, update_lesson_progress, save_answer, update_daily_stats

app = FastAPI(title="NCE API", version="1.0")

# CORS
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
app.add_middleware(CORSMiddleware, allow_origins=[CORS_ORIGIN], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

init_db()


# ── 认证依赖 ──
async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    user_id = decode_token(auth[7:])
    if not user_id:
        raise HTTPException(401, "Invalid token")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ── 路由 ──
@app.post("/api/auth/register", response_model=TokenResponse)
def register(data: UserCreate):
    if not data.username or not data.password:
        raise HTTPException(400, "Username and password required")
    if len(data.username) < 3:
        raise HTTPException(400, "Username too short (min 3)")
    if get_user_by_username(data.username):
        raise HTTPException(400, "Username already exists")
    h, s = hash_password(data.password)
    user = create_user(data.username, h, s, data.nickname or data.username)
    token = create_token(user["id"])
    return {"access_token": token, "user": {"id": user["id"], "username": user["username"], "nickname": user.get("nickname", ""), "created_at": user.get("created_at", "")}}


@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: UserLogin):
    user = get_user_by_username(data.username)
    if not user or not verify_password(data.password, user["password_hash"], user["salt"]):
        raise HTTPException(400, "Invalid username or password")
    token = create_token(user["id"])
    return {"access_token": token, "user": {"id": user["id"], "username": user["username"], "nickname": user.get("nickname", ""), "created_at": user.get("created_at", "")}}


@app.get("/api/user/profile", response_model=UserResponse)
def profile(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "nickname": user.get("nickname", ""), "created_at": user.get("created_at", "")}


@app.get("/api/user/progress")
def progress(user: dict = Depends(get_current_user)):
    rows = get_user_progress(user["id"])
    return {"progress": [{"lesson_group": r["lesson_group"], "completed": bool(r["completed"]), "best_accuracy": r["best_accuracy"], "attempts": r["attempts"], "last_attempt_at": r.get("last_attempt_at"), "completed_at": r.get("completed_at")} for r in rows]}


@app.get("/api/user/stats", response_model=UserStatsResponse)
def stats(user: dict = Depends(get_current_user)):
    rows = get_user_progress(user["id"])
    completed = sum(1 for r in rows if r["completed"])
    from db import get_db
    conn = get_db()
    cur = conn.execute("SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records WHERE user_id=?", (user["id"],))
    row = cur.fetchone()
    return {"total_xp": 0, "streak_days": 0, "total_questions": row["total"] if row else 0, "total_correct": row["correct"] if row else 0, "completed_lessons": completed, "total_lessons": 72}


@app.post("/api/practice/submit", response_model=AnswerSubmitResponse)
def submit_answer(data: AnswerSubmitRequest, user: dict = Depends(get_current_user)):
    save_answer(user["id"], data.model_dump())
    xp = 10 if data.correct else 0
    return {"xp_earned": xp, "combo_bonus": 0, "total_xp": 0}


@app.post("/api/progress/update")
def progress_update(data: dict, user: dict = Depends(get_current_user)):
    lesson_group = data.get("lesson_group", "")
    correct = data.get("correct", 0)
    total = data.get("total", 0)
    update_lesson_progress(user["id"], lesson_group, correct, total)
    return {"ok": True}


# ── 健康检查 ──
@app.get("/api/health")
def health():
    return {"status": "ok", "db": "turso" if os.getenv("TURSO_URL") else "sqlite"}


# ── Vercel Serverless 入口 ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
