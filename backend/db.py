"""数据库层：Turso (生产) / SQLite (本地开发) 双模式"""
import os, sqlite3
from typing import Optional

TURSO_URL = os.getenv("TURSO_URL", "")
TURSO_TOKEN = os.getenv("TURSO_TOKEN", "")
LOCAL_DB = os.path.join(os.path.dirname(__file__), "..", "data", "nce.db")


def _turso_request(statements: list[tuple]) -> list[list[dict]]:
    """批量执行 SQL 语句，每个 (sql, params)"""
    import httpx
    http_url = TURSO_URL.replace('libsql://', 'https://')
    url = f"{http_url}/v2/pipeline"
    headers = {"Authorization": f"Bearer {TURSO_TOKEN}", "Content-Type": "application/json"}
    reqs = []
    for sql, params in statements:
        args = []
        for p in (params or ()):
            if p is None:
                args.append({"type": "null"})
            elif isinstance(p, bool):
                args.append({"type": "integer", "value": "1" if p else "0"})
            elif isinstance(p, int):
                args.append({"type": "integer", "value": str(p)})
            elif isinstance(p, float):
                args.append({"type": "float", "value": str(p)})
            else:
                args.append({"type": "text", "value": str(p)})
        reqs.append({"type": "execute", "stmt": {"sql": sql, "args": args}})
    resp = httpx.post(url, json={"requests": reqs}, headers=headers, timeout=30)
    if not resp.is_success:
        raise Exception(f"Turso {resp.status_code}: {resp.text[:500]}")
    data = resp.json()
    results = []
    for r in data.get("results", []):
        if r.get("type") == "error":
            raise Exception(f"Turso error: {r.get('error',{}).get('message','unknown')}")
        if r.get("type") == "ok" and "response" in r:
            rr = r["response"]["result"]
            cols = [c["name"] for c in rr.get("cols", [])]
            rows = []
            for row in rr.get("rows", []):
                rows.append({cols[i]: v.get("value") if isinstance(v, dict) else v for i, v in enumerate(row)})
            results.append(rows)
        else:
            results.append([])
    return results


def get_db() -> sqlite3.Connection:
    if TURSO_URL and TURSO_TOKEN:
        return _TursoWrapper()
    os.makedirs(os.path.dirname(LOCAL_DB), exist_ok=True)
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


class _TursoWrapper:
    def execute(self, sql: str, params: tuple = ()):
        cur = _TursoCursor(self, sql, params)
        # 立即执行 SQL，避免惰性游标导致 DML 语句丢失
        cur._ensure()
        return cur
    def commit(self): pass
    def cursor(self): return self


class _TursoCursor:
    def __init__(self, wrapper: _TursoWrapper, sql: str, params: tuple = ()):
        self._sql = sql
        self._params = params
        self._rows = None

    def _ensure(self):
        if self._rows is None:
            results = _turso_request([(self._sql, self._params)])
            self._rows = results[0] if results else []

    def fetchone(self):
        self._ensure()
        return _TursoRow(self._rows[0]) if self._rows else None

    def fetchall(self):
        self._ensure()
        return [_TursoRow(r) for r in self._rows]

    @property
    def rowcount(self):
        self._ensure()
        return len(self._rows)

    @property
    def lastrowid(self):
        self._ensure()
        if self._rows:
            return self._rows[-1].get("id", 0)
        return 0


class _TursoRow:
    def __init__(self, data: dict): self._data = data

    @staticmethod
    def _parse(v):
        """Turso 返回所有值为字符串，自动转为 Python 类型"""
        if v is None or v == "None" or v == "null":
            return None
        if isinstance(v, str):
            if v.isdigit() or (v.startswith('-') and v[1:].isdigit()):
                return int(v)
            try: return float(v)
            except: pass
        return v

    def to_dict(self):
        return {k: self._parse(v) for k, v in self._data.items()}

    def __getitem__(self, key):
        return self._parse(self._data.get(key))

    def get(self, key, default=None):
        val = self._data.get(key, default)
        return self._parse(val) if val is not default else default

    def keys(self): return self._data.keys()
    def __repr__(self): return str(self._data)


# ── 建表（必须批量化，CREATE TABLE 和 INSERT 在同一请求中执行）──
def init_db():
    conn = get_db()
    if TURSO_URL and TURSO_TOKEN:
        _turso_request([
            ("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, nickname TEXT DEFAULT '', grade TEXT DEFAULT '', role TEXT DEFAULT 'student', family_code TEXT DEFAULT '', parent_id INTEGER DEFAULT NULL, total_xp INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))", ()),
            ("CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lesson_group TEXT NOT NULL, completed INTEGER DEFAULT 0, best_accuracy REAL DEFAULT 0, attempts INTEGER DEFAULT 0, last_attempt_at TEXT, completed_at TEXT, status TEXT DEFAULT 'locked', unlocked_by TEXT DEFAULT '', unlocked_at TEXT DEFAULT '', UNIQUE(user_id, lesson_group), FOREIGN KEY(user_id) REFERENCES users(id))", ()),
            ("CREATE TABLE IF NOT EXISTS answer_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id TEXT NOT NULL, lesson_group TEXT DEFAULT '', question_type TEXT DEFAULT 'choice', correct INTEGER DEFAULT 0, user_answer TEXT DEFAULT '', time_spent REAL DEFAULT 0, question_text TEXT DEFAULT '', correct_answer TEXT DEFAULT '', difficulty TEXT DEFAULT 'medium', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))", ()),
            ("CREATE TABLE IF NOT EXISTS daily_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, questions_done INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, minutes_spent REAL DEFAULT 0, UNIQUE(user_id, date), FOREIGN KEY(user_id) REFERENCES users(id))", ()),
        ])
        # Turso 迁移：必须通过 _turso_request 直接发送，_TursoCursor 是惰性的无法执行 DDL
        for _m in [
            ("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'", ()),
            ("ALTER TABLE users ADD COLUMN family_code TEXT DEFAULT ''", ()),
            ("ALTER TABLE users ADD COLUMN parent_id INTEGER DEFAULT NULL", ()),
        ]:
            try: _turso_request([_m])
            except: pass
        for _m in [
            ("ALTER TABLE answer_records ADD COLUMN question_text TEXT DEFAULT ''", ()),
            ("ALTER TABLE answer_records ADD COLUMN correct_answer TEXT DEFAULT ''", ()),
            ("ALTER TABLE answer_records ADD COLUMN difficulty TEXT DEFAULT 'medium'", ()),
        ]:
            try: _turso_request([_m])
            except: pass
        for _m in [
            ("ALTER TABLE user_progress ADD COLUMN status TEXT DEFAULT 'locked'", ()),
            ("ALTER TABLE user_progress ADD COLUMN unlocked_by TEXT DEFAULT ''", ()),
            ("ALTER TABLE user_progress ADD COLUMN unlocked_at TEXT DEFAULT ''", ()),
        ]:
            try: _turso_request([_m])
            except: pass
        for _m in [
            ("ALTER TABLE users ADD COLUMN grade TEXT DEFAULT ''", ()),
            ("ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0", ()),
        ]:
            try: _turso_request([_m])
            except: pass
    else:
        conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, nickname TEXT DEFAULT '', grade TEXT DEFAULT '', role TEXT DEFAULT 'student', family_code TEXT DEFAULT '', parent_id INTEGER DEFAULT NULL, total_xp INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))")
        conn.execute("CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lesson_group TEXT NOT NULL, completed INTEGER DEFAULT 0, best_accuracy REAL DEFAULT 0, attempts INTEGER DEFAULT 0, last_attempt_at TEXT, completed_at TEXT, status TEXT DEFAULT 'locked', unlocked_by TEXT DEFAULT '', unlocked_at TEXT DEFAULT '', UNIQUE(user_id, lesson_group), FOREIGN KEY(user_id) REFERENCES users(id))")
        conn.execute("CREATE TABLE IF NOT EXISTS answer_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id TEXT NOT NULL, lesson_group TEXT DEFAULT '', question_type TEXT DEFAULT 'choice', correct INTEGER DEFAULT 0, user_answer TEXT DEFAULT '', time_spent REAL DEFAULT 0, question_text TEXT DEFAULT '', correct_answer TEXT DEFAULT '', difficulty TEXT DEFAULT 'medium', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))")
        conn.execute("CREATE TABLE IF NOT EXISTS daily_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, questions_done INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, minutes_spent REAL DEFAULT 0, UNIQUE(user_id, date), FOREIGN KEY(user_id) REFERENCES users(id))")
    # 本地 SQLite 迁移
    _migrations = [
        "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'",
        "ALTER TABLE users ADD COLUMN family_code TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN parent_id INTEGER DEFAULT NULL",
    ]
    for _m in _migrations:
        try: conn.execute(_m)
        except: pass

    _migrations_v7 = [
        "ALTER TABLE answer_records ADD COLUMN question_text TEXT DEFAULT ''",
        "ALTER TABLE answer_records ADD COLUMN correct_answer TEXT DEFAULT ''",
        "ALTER TABLE answer_records ADD COLUMN difficulty TEXT DEFAULT 'medium'",
    ]
    for _m in _migrations_v7:
        try: conn.execute(_m)
        except: pass

    _migrations_v10 = [
        "ALTER TABLE user_progress ADD COLUMN status TEXT DEFAULT 'locked'",
        "ALTER TABLE user_progress ADD COLUMN unlocked_by TEXT DEFAULT ''",
        "ALTER TABLE user_progress ADD COLUMN unlocked_at TEXT DEFAULT ''",
    ]
    for _m in _migrations_v10:
        try: conn.execute(_m)
        except: pass
    try:
        conn.execute("UPDATE user_progress SET status='completed' WHERE completed=1")
        conn.execute("UPDATE user_progress SET status='locked' WHERE completed=0 AND status='locked'")
    except: pass

    _migrations_v11 = [
        "ALTER TABLE users ADD COLUMN grade TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0",
    ]
    for _m in _migrations_v11:
        try: conn.execute(_m)
        except: pass


# ── 用户 CRUD ──
def create_user(username: str, password_hash: str, salt: str, nickname: str = "",
                role: str = "student", family_code: str = "", parent_id: int = None) -> dict:
    conn = get_db()
    if TURSO_URL and TURSO_TOKEN:
        results = _turso_request([
            ("INSERT INTO users (username, password_hash, salt, nickname, role, family_code, parent_id) VALUES (?,?,?,?,?,?,?)",
             (username, password_hash, salt, nickname, role, family_code, parent_id)),
            ("SELECT * FROM users WHERE username=?", (username,)),
        ])
        if len(results) >= 2 and results[1]:
            return results[1][0]
        return {}
    else:
        conn.execute("INSERT INTO users (username, password_hash, salt, nickname, role, family_code, parent_id) VALUES (?,?,?,?,?,?,?)",
                     (username, password_hash, salt, nickname, role, family_code, parent_id))
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return dict(row) if row else {}


def get_user_by_username(username: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    if row: return row.to_dict() if hasattr(row, 'to_dict') else dict(row)
    return None


def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if row: return row.to_dict() if hasattr(row, 'to_dict') else dict(row)
    return None


# ── 学习进度 ──
def get_user_progress(user_id: int) -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM user_progress WHERE user_id=?", (user_id,)).fetchall()
    return [r.to_dict() if hasattr(r, 'to_dict') else dict(r) for r in rows]


def update_lesson_progress(user_id: int, lesson_group: str, correct: int, total: int):
    conn = get_db()
    accuracy = correct / total if total > 0 else 0
    passed = accuracy >= 1.0
    row = conn.execute("SELECT * FROM user_progress WHERE user_id=? AND lesson_group=?", (user_id, lesson_group)).fetchone()
    if row:
        d = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
        was_completed = d.get('completed') or False
        new_status = 'completed' if passed else d.get('status', 'locked')
        conn.execute("UPDATE user_progress SET completed=?, best_accuracy=?, attempts=?, status=?, last_attempt_at=datetime('now'), completed_at=CASE WHEN ? AND NOT completed THEN datetime('now') ELSE completed_at END WHERE user_id=? AND lesson_group=?",
            (1 if (was_completed or passed) else 0, max(d.get('best_accuracy', 0), accuracy), d.get('attempts', 0) + 1, new_status, passed, user_id, lesson_group))
    else:
        conn.execute("INSERT INTO user_progress (user_id, lesson_group, completed, best_accuracy, attempts, status, last_attempt_at, completed_at) VALUES (?,?,?,?,?,?,datetime('now'),?)",
            (user_id, lesson_group, 1 if passed else 0, accuracy, 1, 'completed' if passed else 'locked', datetime('now') if passed else None))
    if hasattr(conn, 'commit'): conn.commit()


def save_answer(user_id: int, data: dict):
    if TURSO_URL and TURSO_TOKEN:
        _turso_request([(
            "INSERT INTO answer_records (user_id, question_id, lesson_group, question_type, correct, user_answer, time_spent, question_text, correct_answer, difficulty) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (user_id, str(data.get('question_id','')), str(data.get('lesson_group','')), str(data.get('question_type','choice')),
             1 if data.get('correct') else 0, str(data.get('user_answer','')),
             float(data.get('time_spent', 0)), str(data.get('question_text','')),
             str(data.get('correct_answer','')), str(data.get('difficulty','medium')))
        )])
        return
    conn = get_db()
    conn.execute("INSERT INTO answer_records (user_id, question_id, lesson_group, question_type, correct, user_answer, time_spent, question_text, correct_answer, difficulty) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (user_id, data['question_id'], data.get('lesson_group', ''), data.get('question_type', 'choice'), int(data.get('correct', False)), data.get('user_answer', ''), data.get('time_spent', 0), data.get('question_text', ''), data.get('correct_answer', ''), data.get('difficulty', 'medium')))
    if hasattr(conn, 'commit'): conn.commit()


def update_daily_stats(user_id: int, correct: int, total: int, xp: int, minutes: float):
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')
    conn = get_db()
    row = conn.execute("SELECT * FROM daily_stats WHERE user_id=? AND date=?", (user_id, today)).fetchone()
    if row:
        d = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
        conn.execute("UPDATE daily_stats SET questions_done=?, correct_count=?, xp_earned=?, minutes_spent=? WHERE user_id=? AND date=?",
            (d.get('questions_done', 0) + total, d.get('correct_count', 0) + correct, d.get('xp_earned', 0) + xp, d.get('minutes_spent', 0) + minutes, user_id, today))
    else:
        conn.execute("INSERT INTO daily_stats (user_id, date, questions_done, correct_count, xp_earned, minutes_spent) VALUES (?,?,?,?,?,?)",
            (user_id, today, total, correct, xp, minutes))
    if hasattr(conn, 'commit'): conn.commit()
