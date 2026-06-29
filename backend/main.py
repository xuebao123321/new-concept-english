"""FastAPI 主入口"""
import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import UserCreate, UserLogin, UserResponse, TokenResponse, AnswerSubmitRequest, AnswerSubmitResponse, UserStatsResponse, FamilyBindRequest, ChildUnlockRequest, ChildResetRequest
import random as _random, time as _time
from auth import hash_password, verify_password, create_token, decode_token
from db import init_db, create_user, get_user_by_username, get_user_by_id, get_user_progress, update_lesson_progress, save_answer, update_daily_stats, get_db

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
@app.post("/api/auth/register")
def register(data: UserCreate):
    try:
        if not data.username or not data.password:
            raise HTTPException(400, "Username and password required")
        if len(data.username) < 3:
            raise HTTPException(400, "Username too short (min 3)")
        if get_user_by_username(data.username):
            raise HTTPException(400, "Username already exists")

        # 家长: 生成 6 位家庭码
        family_code = ""
        if data.role == "parent":
            family_code = ''.join(_random.choice('ABCDEFGHJKMNPQRSTUVWXYZ23456789') for _ in range(6))

        # 学生: 验证家庭码
        parent_id = None
        if data.role == "student" and data.family_code:
            conn = get_db()
            parent = conn.execute(
                "SELECT id FROM users WHERE family_code=? AND role='parent'",
                (data.family_code,)).fetchone()
            if not parent:
                raise HTTPException(400, "家庭码无效，请检查后重试")
            pd = dict(parent) if not isinstance(parent, dict) else parent
            parent_id = pd.get("id") if pd else None

        h, s = hash_password(data.password)
        user = create_user(data.username, h, s, data.nickname or data.username,
                          data.role, family_code, parent_id)
        if not user:
            return JSONResponse({"detail": "创建用户失败，数据库写入异常"}, status_code=500)
        token = create_token(user.get("id", 0))
        return {"access_token": token, "user": {
            "id": user["id"], "username": user["username"],
            "nickname": user.get("nickname", ""),
            "role": user.get("role", "student"),
            "family_code": user.get("family_code", family_code),
            "parent_id": user.get("parent_id"),
            "created_at": user.get("created_at", ""),
        }}
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"detail": f"服务器错误: {str(e)}"}, status_code=500)


@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: UserLogin):
    user = get_user_by_username(data.username)
    if not user or not verify_password(data.password, user["password_hash"], user["salt"]):
        raise HTTPException(400, "Invalid username or password")
    token = create_token(user["id"])
    return {"access_token": token, "user": {"id": user["id"], "username": user["username"], "nickname": user.get("nickname", ""), "created_at": user.get("created_at", "")}}


# ── 密码重置 ──
_reset_codes: dict = {}

@app.post("/api/auth/forgot-password")
def forgot_password(data: dict):
    username = data.get("username", "")
    user = get_user_by_username(username)
    if not user: return {"ok": True, "message": "如果账号存在，验证码已发送"}
    code = str(_random.randint(100000, 999999))
    _reset_codes[username] = {"code": code, "expires": _time.time() + 600}
    print(f"[PWD RESET] user={username} code={code}")
    return {"ok": True, "message": "验证码已生成", "code": code}

@app.post("/api/auth/reset-password")
def reset_password(data: dict):
    username = data.get("username", "")
    code = data.get("code", "")
    new_pw = data.get("new_password", "")
    rec = _reset_codes.get(username)
    if not rec or rec["code"] != code or _time.time() > rec["expires"]:
        raise HTTPException(400, "验证码无效或已过期")
    if len(new_pw) < 4: raise HTTPException(400, "密码至少4位")
    h, s = hash_password(new_pw)
    conn = get_db()
    conn.execute("UPDATE users SET password_hash=?, salt=? WHERE username=?", (h, s, username))
    if hasattr(conn, 'commit'): conn.commit()
    del _reset_codes[username]
    return {"ok": True, "message": "密码已重置"}


# ── 账户管理 ──

@app.put("/api/user/password")
def change_password(data: dict, user: dict = Depends(get_current_user)):
    old_pw = data.get("old_password", "")
    new_pw = data.get("new_password", "")
    if not old_pw or not new_pw:
        raise HTTPException(400, "请填写原密码和新密码")
    if not verify_password(old_pw, user["password_hash"], user["salt"]):
        raise HTTPException(400, "原密码错误")
    if len(new_pw) < 4:
        raise HTTPException(400, "新密码至少4位")
    h, s = hash_password(new_pw)
    conn = get_db()
    conn.execute("UPDATE users SET password_hash=?, salt=? WHERE id=?",
                 (h, s, user["id"]))
    if hasattr(conn, 'commit'):
        conn.commit()
    return {"ok": True, "message": "密码已修改"}


@app.delete("/api/user/account")
def delete_account(user: dict = Depends(get_current_user)):
    uid = user["id"]
    conn = get_db()
    for table in ["answer_records", "daily_stats", "user_progress"]:
        conn.execute(f"DELETE FROM {table} WHERE user_id=?", (uid,))
    conn.execute("DELETE FROM users WHERE id=?", (uid,))
    if hasattr(conn, 'commit'):
        conn.commit()
    return {"ok": True, "message": "账号已删除"}


@app.get("/api/user/profile", response_model=UserResponse)
def profile(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"],
            "nickname": user.get("nickname", ""),
            "role": user.get("role", "student"),
            "family_code": user.get("family_code", ""),
            "parent_id": user.get("parent_id"),
            "created_at": user.get("created_at", "")}


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


# ── 家庭 & 家长 API ──

@app.post("/api/family/bind")
def bind_family(data: FamilyBindRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    parent = conn.execute(
        "SELECT id FROM users WHERE family_code=? AND role='parent'",
        (data.family_code,)).fetchone()
    if not parent:
        raise HTTPException(400, "家庭码无效")
    pd = dict(parent) if not isinstance(parent, dict) else parent
    parent_id = pd["id"]
    conn.execute("UPDATE users SET parent_id=? WHERE id=?", (parent_id, user["id"]))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "parent_id": parent_id}


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
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        prog = conn.execute(
            "SELECT COUNT(*) as total, SUM(completed) as done FROM user_progress WHERE user_id=?",
            (d["id"],)).fetchone()
        pd = prog.to_dict() if hasattr(prog, 'to_dict') else dict(prog)
        children.append({
            "id": d["id"], "username": d["username"], "nickname": d.get("nickname", ""),
            "total_lessons": pd.get("total") or 0,
            "completed_lessons": pd.get("done") or 0,
        })
    return {"children": children, "family_code": user.get("family_code", "")}


@app.post("/api/parent/child/{child_id}/unlock-lesson")
def unlock_lesson(child_id: int, data: ChildUnlockRequest, user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
                         (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    conn.execute(
        "INSERT OR REPLACE INTO user_progress (user_id, lesson_group, completed, best_accuracy, attempts) "
        "VALUES (?, ?, 1, 1.0, 0)",
        (child_id, data.lesson_group))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True}


@app.post("/api/parent/child/{child_id}/reset-lesson")
def reset_lesson(child_id: int, data: ChildResetRequest, user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
                         (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    conn.execute("DELETE FROM user_progress WHERE user_id=? AND lesson_group=?",
                 (child_id, data.lesson_group))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True}


@app.get("/api/parent/child/{child_id}/report")
def child_report(child_id: int, user: dict = Depends(get_current_user)):
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可访问")
    conn = get_db()
    child = conn.execute("SELECT id, username, nickname FROM users WHERE id=? AND parent_id=?",
                         (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    cd = child.to_dict() if hasattr(child, 'to_dict') else dict(child)
    progress_rows = get_user_progress(child_id)
    completed = sum(1 for r in progress_rows if r.get("completed"))
    type_stats = {}
    for qt in ["choice", "fill", "translate", "reorder", "listening"]:
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records "
            "WHERE user_id=? AND question_type=?", (child_id, qt)).fetchone()
        rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
        t = rd.get("total") or 0
        c = rd.get("correct") or 0
        type_stats[qt] = {"total": t, "correct": c, "accuracy": round(c / t * 100) if t > 0 else 0}
    return {
        "student": {"id": cd["id"], "nickname": cd.get("nickname", ""), "username": cd["username"]},
        "completed_lessons": completed, "total_lessons": 36,
        "type_stats": type_stats,
    }


# ── 排行榜 ──
@app.get("/api/leaderboard")
def leaderboard(sort: str = "completed", limit: int = 50):
    conn = get_db()
    cur = conn.execute(
        "SELECT u.id, u.username, u.nickname, COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed "
        "FROM users u LEFT JOIN user_progress up ON u.id = up.user_id "
        "GROUP BY u.id ORDER BY completed DESC LIMIT ?", (limit,))
    results = []
    for r in cur.fetchall():
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        results.append({"id": d["id"], "username": d["username"][:1]+"***", "nickname": d.get("nickname",""), "completed": d["completed"]})
    return {"leaderboard": results}


@app.get("/api/user/{user_id}/public")
def public_profile(user_id: int):
    conn = get_db()
    u = conn.execute("SELECT id, username, nickname, created_at FROM users WHERE id=?", (user_id,)).fetchone()
    if not u: raise HTTPException(404, "User not found")
    d = u.to_dict() if hasattr(u, 'to_dict') else dict(u)
    rows = get_user_progress(user_id)
    completed = sum(1 for r in rows if r["completed"])
    return {"id": d["id"], "nickname": d.get("nickname",""), "completed": completed, "created_at": d.get("created_at","")}


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


# ── 健康检查 + 调试 ──
@app.get("/api/health")
def health():
    return {"status": "ok", "db": "turso" if os.getenv("TURSO_URL") else "sqlite"}

@app.get("/api/debug")
def debug():
    from db import get_db
    try:
        conn = get_db()
        r1 = conn.execute("SELECT 1 as ok").fetchone()
        select_ok = dict(r1) if r1 else "FAIL"
        conn.execute("CREATE TABLE IF NOT EXISTS _debug (id INTEGER PRIMARY KEY, msg TEXT)")
        conn.execute("INSERT INTO _debug (msg) VALUES (?)", ("hello",))
        r2 = conn.execute("SELECT * FROM _debug").fetchone()
        insert_ok = dict(r2) if r2 else "FAIL"
        return {"select": select_ok, "insert": insert_ok, "db_type": "turso" if os.getenv("TURSO_URL") else "sqlite"}
    except Exception as e:
        return {"error": str(e)}


# ── Vercel Serverless 入口 ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
