"""FastAPI 主入口"""
import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

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
    pid = user.get("parent_id")
    if pid is not None and str(pid) == "None":
        pid = None
    return {"id": user["id"], "username": user["username"],
            "nickname": user.get("nickname", ""),
            "grade": user.get("grade", ""),
            "role": user.get("role", "student"),
            "family_code": user.get("family_code", ""),
            "parent_id": pid,
            "created_at": user.get("created_at", "")}


@app.get("/api/user/progress")
def progress(user: dict = Depends(get_current_user)):
    rows = get_user_progress(user["id"])
    return {"progress": [{"lesson_group": r["lesson_group"], "completed": bool(r["completed"]), "best_accuracy": r["best_accuracy"], "attempts": r["attempts"], "last_attempt_at": r.get("last_attempt_at"), "completed_at": r.get("completed_at"), "status": r.get("status", "locked"), "unlocked_by": r.get("unlocked_by", "")} for r in rows]}


@app.get("/api/user/stats", response_model=UserStatsResponse)
def stats(user: dict = Depends(get_current_user)):
    rows = get_user_progress(user["id"])
    completed = sum(1 for r in rows if r["completed"])
    from db import get_db
    conn = get_db()
    cur = conn.execute("SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records WHERE user_id=?", (user["id"],))
    row = cur.fetchone()
    total_q = (row["total"] if row else None) or 0
    total_c = (row["correct"] if row else None) or 0
    return {"total_xp": int(user.get("total_xp", 0) or 0), "streak_days": 0, "total_questions": int(total_q or 0), "total_correct": int(total_c or 0), "completed_lessons": completed, "total_lessons": 72}


# ── XP 同步 ──
@app.post("/api/user/sync-xp")
def sync_xp(data: dict, user: dict = Depends(get_current_user)):
    """同步客户端 totalXp 到服务端（取最大值）"""
    xp = int(data.get("total_xp", 0) or 0)
    current_xp = int(user.get("total_xp", 0) or 0)
    if xp > current_xp:
        conn = get_db()
        cur = conn.execute("UPDATE users SET total_xp=? WHERE id=?", (xp, user["id"]))
        cur.rowcount  # 强制 Turso 惰性游标执行
        if hasattr(conn, 'commit'): conn.commit()
        current_xp = xp
    return {"ok": True, "total_xp": current_xp}

# ── 个人资料更新 ──

@app.put("/api/user/update-profile")
def update_profile(data: dict, user: dict = Depends(get_current_user)):
    """更新用户昵称和年级"""
    nickname = data.get("nickname")
    grade = data.get("grade")

    conn = get_db()
    updates = []
    params: list = []

    if nickname is not None:
        updates.append("nickname=?")
        params.append(nickname)
    if grade is not None:
        updates.append("grade=?")
        params.append(grade)

    if not updates:
        return {"ok": True, "message": "无变更"}

    params.append(user["id"])
    conn.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id=?",
        tuple(params))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "message": "已更新"}


@app.put("/api/parent/child/{child_id}/update-profile")
def parent_update_child_profile(child_id: int, data: dict, user: dict = Depends(get_current_user)):
    """家长修改学生的昵称和年级"""
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")

    conn = get_db()
    child = conn.execute(
        "SELECT id FROM users WHERE id=? AND parent_id=?",
        (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")

    nickname = data.get("nickname")
    grade = data.get("grade")
    updates = []
    params: list = []

    if nickname is not None:
        updates.append("nickname=?")
        params.append(nickname)
    if grade is not None:
        updates.append("grade=?")
        params.append(grade)

    if not updates:
        return {"ok": True}

    params.append(child_id)
    conn.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id=?",
        tuple(params))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "message": "已更新"}


# ── 课程常量 ──
ALL_LESSON_GROUPS = [
    "lesson-01-02","lesson-03-04","lesson-05-06","lesson-07-08",
    "lesson-09-10","lesson-11-12","lesson-13-14","lesson-15-16",
    "lesson-17-18","lesson-19-20","lesson-21-22","lesson-23-24",
    "lesson-25-26","lesson-27-28","lesson-29-30","lesson-31-32",
    "lesson-33-34","lesson-35-36","lesson-37-38","lesson-39-40",
    "lesson-41-42","lesson-43-44","lesson-45-46","lesson-47-48",
    "lesson-49-50","lesson-51-52","lesson-53-54","lesson-55-56",
    "lesson-57-58","lesson-59-60","lesson-61-62","lesson-63-64",
    "lesson-65-66","lesson-67-68","lesson-69-70","lesson-71-72",
    # Stage 4-6
    "lesson-73-74","lesson-75-76","lesson-77-78","lesson-79-80","lesson-81-82","lesson-83-84",
    "lesson-85-86","lesson-87-88","lesson-89-90","lesson-91-92","lesson-93-94","lesson-95-96",
    "lesson-97-98","lesson-99-100","lesson-101-102","lesson-103-104","lesson-105-106","lesson-107-108",
    "lesson-109-110","lesson-111-112","lesson-113-114","lesson-115-116","lesson-117-118","lesson-119-120",
    "lesson-121-122","lesson-123-124","lesson-125-126","lesson-127-128","lesson-129-130","lesson-131-132",
    "lesson-133-134","lesson-135-136","lesson-137-138","lesson-139-140","lesson-141-142","lesson-143-144",
]

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
    """家长解锁课程（不会覆盖学生的 completed/blockProgress/attempts 数据）"""
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
                         (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    # DO UPDATE SET 仅改 status/unlocked_by/unlocked_at，不动 completed/blockProgress 等
    conn.execute(
        "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
        "VALUES (?, ?, 'unlocked', 'parent', datetime('now'), 0, 0, 0) "
        "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
        "status='unlocked', unlocked_by='parent', unlocked_at=datetime('now')",
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
    # 仅锁定状态，不摧毁已完成的进度数据
    existing = conn.execute(
        "SELECT completed, best_accuracy, attempts FROM user_progress "
        "WHERE user_id=? AND lesson_group=?", (child_id, data.lesson_group)).fetchone()
    if existing:
        conn.execute(
            "UPDATE user_progress SET status='locked', unlocked_by='parent_locked' WHERE user_id=? AND lesson_group=?",
            (child_id, data.lesson_group))
    else:
        conn.execute(
            "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, completed, best_accuracy, attempts) "
            "VALUES (?, ?, 'locked', 'parent_locked', 0, 0, 0)",
            (child_id, data.lesson_group))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True}


@app.post("/api/rewards/check")
def check_rewards(data: dict, user: dict = Depends(get_current_user)):
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
            try:
                idx = ALL_LESSON_GROUPS.index(lg)
                for offset in [1, 2]:
                    if idx + offset < len(ALL_LESSON_GROUPS):
                        target = ALL_LESSON_GROUPS[idx + offset]
                        existing = conn.execute(
                            "SELECT status FROM user_progress WHERE user_id=? AND lesson_group=?",
                            (uid, target)).fetchone()
                        ex_status = ''
                        if existing:
                            ed = existing.to_dict() if hasattr(existing, 'to_dict') else dict(existing)
                            ex_status = ed.get('status', '')
                        if not existing or ex_status == 'locked':
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

    # 2. 复习达人: 前端传 check_type=review_master
    if data.get("check_type") == "review_master":
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
            st = 'locked'
            if row:
                rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
                st = rd.get('status', 'locked')
            if st == 'locked':
                candidates.append(lg)

        if candidates:
            pick = _random.choice(candidates)
            conn.execute(
                "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
                "VALUES (?, ?, 'unlocked', 'reward', datetime('now'), 0, 0, 0) "
                "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
                "status='unlocked', unlocked_by='reward', unlocked_at=datetime('now')",
                (uid, pick))
            rewards.append({"type": "review_master", "lesson_group": pick,
                "message": f"🎁 复习达人! 奖励解锁 {pick}"})

    # 3. 复习 20 题: 从待解锁课组中随机选 1 个
    if data.get("check_type") == "review_20":
        max_completed = 0
        all_progress = conn.execute(
            "SELECT lesson_group FROM user_progress WHERE user_id=? AND (status='completed' OR completed=1)",
            (uid,)).fetchall()
        for r in all_progress:
            rd = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
            try: max_completed = max(max_completed, ALL_LESSON_GROUPS.index(rd["lesson_group"]))
            except: pass

        candidates = []
        for i in range(max_completed + 1, min(max_completed + 4, len(ALL_LESSON_GROUPS))):
            lg = ALL_LESSON_GROUPS[i]
            row = conn.execute("SELECT status FROM user_progress WHERE user_id=? AND lesson_group=?",
                               (uid, lg)).fetchone()
            st = 'locked'
            if row:
                rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
                st = rd.get('status', 'locked')
            if st == 'locked':
                candidates.append(lg)

        if candidates:
            pick = _random.choice(candidates)
            conn.execute(
                "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
                "VALUES (?, ?, 'unlocked', 'reward', datetime('now'), 0, 0, 0) "
                "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
                "status='unlocked', unlocked_by='reward', unlocked_at=datetime('now')",
                (uid, pick))
            rewards.append({"type": "review_20", "lesson_group": pick,
                "message": f"📚 复习 20 题达成! 奖励解锁 {pick}"})

    # 4. 水平测试通过: 从待解锁课组中随机选 1 个
    if data.get("check_type") == "diagnosis_pass":
        max_completed = 0
        all_progress = conn.execute(
            "SELECT lesson_group FROM user_progress WHERE user_id=? AND (status='completed' OR completed=1)",
            (uid,)).fetchall()
        for r in all_progress:
            rd = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
            try: max_completed = max(max_completed, ALL_LESSON_GROUPS.index(rd["lesson_group"]))
            except: pass

        candidates = []
        for i in range(max_completed + 1, min(max_completed + 4, len(ALL_LESSON_GROUPS))):
            lg = ALL_LESSON_GROUPS[i]
            row = conn.execute("SELECT status FROM user_progress WHERE user_id=? AND lesson_group=?",
                               (uid, lg)).fetchone()
            st = 'locked'
            if row:
                rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
                st = rd.get('status', 'locked')
            if st == 'locked':
                candidates.append(lg)

        if candidates:
            pick = _random.choice(candidates)
            conn.execute(
                "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
                "VALUES (?, ?, 'unlocked', 'reward', datetime('now'), 0, 0, 0) "
                "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
                "status='unlocked', unlocked_by='reward', unlocked_at=datetime('now')",
                (uid, pick))
            rewards.append({"type": "diagnosis_pass", "lesson_group": pick,
                "message": f"🔍 水平测试通过! 奖励解锁 {pick}"})

    if hasattr(conn, 'commit'): conn.commit()
    return {"rewards": rewards}


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

    # 逐课列表
    lesson_list = []
    for lg in ALL_LESSON_GROUPS:
        found = [r for r in progress_rows if r.get("lesson_group") == lg]
        if found:
            f = found[0]
            lesson_list.append({
                "lesson_group": lg,
                "completed": bool(f.get("completed")),
                "best_accuracy": float(f.get("best_accuracy") or 0),
                "attempts": int(f.get("attempts") or 0),
                "status": f.get("status", "locked"),
                "unlocked_by": f.get("unlocked_by", ""),
            })
        else:
            lesson_list.append({
                "lesson_group": lg, "completed": False,
                "best_accuracy": 0, "attempts": 0,
                "status": "locked",
                "unlocked_by": "",
            })

    # 最近 7 天活跃度
    from datetime import datetime, timedelta
    recent_activity = []
    for i in range(6, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records "
            "WHERE user_id=? AND date(created_at)=?", (child_id, d)).fetchone()
        rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
        recent_activity.append({
            "date": d, "total": rd.get("total") or 0,
            "correct": rd.get("correct") or 0,
        })

    return {
        "student": {"id": cd["id"], "nickname": cd.get("nickname", ""), "username": cd["username"]},
        "completed_lessons": completed, "total_lessons": len(ALL_LESSON_GROUPS),
        "type_stats": type_stats,
        "lesson_list": lesson_list,
        "recent_activity": recent_activity,
    }


@app.get("/api/user/my-report")
def my_report(user: dict = Depends(get_current_user)):
    """学生/家长查看自己的学习报告"""
    conn = get_db()
    uid = user["id"]
    progress_rows = get_user_progress(uid)
    completed = sum(1 for r in progress_rows if r.get("completed"))
    type_stats = {}
    for qt in ["choice", "fill", "translate", "reorder", "listening"]:
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records "
            "WHERE user_id=? AND question_type=?", (uid, qt)).fetchone()
        rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
        t = rd.get("total") or 0
        c = rd.get("correct") or 0
        type_stats[qt] = {"total": t, "correct": c, "accuracy": round(c / t * 100) if t > 0 else 0}

    # 逐课列表
    lesson_list = []
    for lg in ALL_LESSON_GROUPS:
        found = [r for r in progress_rows if r.get("lesson_group") == lg]
        if found:
            f = found[0]
            lesson_list.append({
                "lesson_group": lg,
                "completed": bool(f.get("completed")),
                "best_accuracy": float(f.get("best_accuracy") or 0),
                "attempts": int(f.get("attempts") or 0),
                "status": f.get("status", "locked"),
                "unlocked_by": f.get("unlocked_by", ""),
            })
        else:
            lesson_list.append({
                "lesson_group": lg, "completed": False,
                "best_accuracy": 0, "attempts": 0,
                "status": "locked",
                "unlocked_by": "",
            })

    # 最近 7 天活跃度
    from datetime import datetime, timedelta
    recent_activity = []
    for i in range(6, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records "
            "WHERE user_id=? AND date(created_at)=?", (uid, d)).fetchone()
        rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
        recent_activity.append({
            "date": d, "total": rd.get("total") or 0,
            "correct": rd.get("correct") or 0,
        })

    return {
        "student": {"id": uid, "nickname": user.get("nickname", ""), "username": user["username"]},
        "completed_lessons": completed, "total_lessons": len(ALL_LESSON_GROUPS),
        "type_stats": type_stats,
        "lesson_list": lesson_list,
        "recent_activity": recent_activity,
    }


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

    # 填充 wrong_count + 检查是否已订正
    corrected_count = 0
    for item in wrong_list:
        item["wrong_count"] = wrong_count_map.get(item["question_id"], 1)
        # 检查该题之后是否有正确答案（即学生是否订正过）
        cr = conn.execute(
            "SELECT created_at FROM answer_records "
            "WHERE user_id=? AND question_id=? AND correct=1 "
            "ORDER BY created_at DESC LIMIT 1",
            (child_id, item["question_id"])).fetchone()
        if cr:
            cd = cr.to_dict() if hasattr(cr, 'to_dict') else dict(cr)
            item["has_corrected"] = True
            item["corrected_at"] = cd.get("created_at", "")
            corrected_count += 1
        else:
            item["has_corrected"] = False
            item["corrected_at"] = ""
        # 最近一次做题时间（无论对错）
        lr = conn.execute(
            "SELECT created_at FROM answer_records "
            "WHERE user_id=? AND question_id=? "
            "ORDER BY created_at DESC LIMIT 1",
            (child_id, item["question_id"])).fetchone()
        if lr:
            ld = lr.to_dict() if hasattr(lr, 'to_dict') else dict(lr)
            item["last_attempt_at"] = ld.get("created_at", "")

    # 聚合摘要
    by_type = Counter(item["question_type"] for item in wrong_list)
    by_lesson = Counter(item["lesson_group"] for item in wrong_list)

    most_missed_type = by_type.most_common(1)[0][0] if by_type else ""
    most_missed_lesson = by_lesson.most_common(1)[0][0] if by_lesson else ""

    return {
        "wrong_questions": wrong_list,
        "summary": {
            "total_wrong": len(wrong_list),
            "corrected": corrected_count,
            "by_type": dict(by_type),
            "by_lesson": {k: v for k, v in by_lesson.most_common(10)},
            "most_missed_type": most_missed_type,
            "most_missed_lesson": most_missed_lesson,
        }
    }


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


# ── 排行榜 ──
@app.get("/api/leaderboard")
def leaderboard(sort: str = "xp", limit: int = 50):
    conn = get_db()
    order = "total_xp DESC" if sort != "completed" else "completed DESC"
    cur = conn.execute(
        "SELECT u.id, u.username, u.nickname, u.grade, u.total_xp, "
        "COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed "
        "FROM users u LEFT JOIN user_progress up ON u.id = up.user_id "
        f"GROUP BY u.id ORDER BY {order} LIMIT ?", (limit,))
    results = []
    for r in cur.fetchall():
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        results.append({
            "id": d["id"],
            "username": d["username"][:1] + "***",
            "nickname": d.get("nickname", ""),
            "grade": d.get("grade", ""),
            "completed": int(d.get("completed", 0) or 0),
            "xp": int(d.get("total_xp", 0) or 0),
        })
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


# ── 静态文件服务（在所有 API 路由之后注册，避免拦截）──
_candidates = [
    Path(__file__).resolve().parent / "dist",
    Path(__file__).resolve().parent.parent / "dist",
]
DIST_DIR = None
for _c in _candidates:
    if (_c / "index.html").exists():
        DIST_DIR = _c.resolve()
        break

if DIST_DIR and DIST_DIR.exists():
    print(f"[init] Serving static files from {DIST_DIR}")
    for _sub in ["assets", "audio", "icons"]:
        _p = DIST_DIR / _sub
        if _p.exists():
            app.mount(f"/{_sub}", StaticFiles(directory=str(_p)), name=_sub)

    @app.get("/", include_in_schema=False)
    async def _root():
        return HTMLResponse(
            (DIST_DIR / "index.html").read_text(encoding="utf-8"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def _spa(request: Request, full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        fp = DIST_DIR / full_path
        if fp.is_file():
            return FileResponse(str(fp), headers={"Cache-Control": "no-cache, max-age=0"})
        fp = DIST_DIR / "index.html"
        if fp.exists():
            return HTMLResponse(
                fp.read_text(encoding="utf-8"),
                headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
            )
        raise HTTPException(404)
else:
    print(f"[init] DIST_DIR not found, API only mode")

# ── Vercel Serverless 入口 ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
