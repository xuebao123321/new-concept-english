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
        reqs.append({"type": "execute", "stmt": {"sql": sql, "args": list(params) if params else []}})
    resp = httpx.post(url, json={"requests": reqs}, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for r in data.get("results", []):
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
        return _TursoCursor(self, sql, params)
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
    def to_dict(self): return dict(self._data)
    def __getitem__(self, key): return self._data.get(key)
    def keys(self): return self._data.keys()
    def __repr__(self): return str(self._data)


# ── 建表（必须批量化，CREATE TABLE 和 INSERT 在同一请求中执行）──
def init_db():
    conn = get_db()
    if TURSO_URL and TURSO_TOKEN:
        _turso_request([
            ("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, nickname TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))", ()),
            ("CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lesson_group TEXT NOT NULL, completed INTEGER DEFAULT 0, best_accuracy REAL DEFAULT 0, attempts INTEGER DEFAULT 0, last_attempt_at TEXT, completed_at TEXT, UNIQUE(user_id, lesson_group), FOREIGN KEY(user_id) REFERENCES users(id))", ()),
            ("CREATE TABLE IF NOT EXISTS answer_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id TEXT NOT NULL, lesson_group TEXT DEFAULT '', question_type TEXT DEFAULT 'choice', correct INTEGER DEFAULT 0, user_answer TEXT DEFAULT '', time_spent REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))", ()),
            ("CREATE TABLE IF NOT EXISTS daily_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, questions_done INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, minutes_spent REAL DEFAULT 0, UNIQUE(user_id, date), FOREIGN KEY(user_id) REFERENCES users(id))", ()),
        ])
    else:
        conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, nickname TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))")
        conn.execute("CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lesson_group TEXT NOT NULL, completed INTEGER DEFAULT 0, best_accuracy REAL DEFAULT 0, attempts INTEGER DEFAULT 0, last_attempt_at TEXT, completed_at TEXT, UNIQUE(user_id, lesson_group), FOREIGN KEY(user_id) REFERENCES users(id))")
        conn.execute("CREATE TABLE IF NOT EXISTS answer_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, question_id TEXT NOT NULL, lesson_group TEXT DEFAULT '', question_type TEXT DEFAULT 'choice', correct INTEGER DEFAULT 0, user_answer TEXT DEFAULT '', time_spent REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id))")
        conn.execute("CREATE TABLE IF NOT EXISTS daily_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, questions_done INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, minutes_spent REAL DEFAULT 0, UNIQUE(user_id, date), FOREIGN KEY(user_id) REFERENCES users(id))")


# ── 用户 CRUD ──
def create_user(username: str, password_hash: str, salt: str, nickname: str = "") -> dict:
    conn = get_db()
    conn.execute("INSERT INTO users (username, password_hash, salt, nickname) VALUES (?,?,?,?)", (username, password_hash, salt, nickname))
    if hasattr(conn, 'commit'): conn.commit()
    return get_user_by_username(username) or {}


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
        conn.execute("UPDATE user_progress SET completed=?, best_accuracy=?, attempts=?, last_attempt_at=datetime('now'), completed_at=CASE WHEN ? AND NOT completed THEN datetime('now') ELSE completed_at END WHERE user_id=? AND lesson_group=?",
            (1 if (d.get('completed') or passed) else 0, max(d.get('best_accuracy', 0), accuracy), d.get('attempts', 0) + 1, passed, user_id, lesson_group))
    else:
        conn.execute("INSERT INTO user_progress (user_id, lesson_group, completed, best_accuracy, attempts, last_attempt_at, completed_at) VALUES (?,?,?,?,?,datetime('now'),?)",
            (user_id, lesson_group, 1 if passed else 0, accuracy, 1, datetime('now') if passed else None))
    if hasattr(conn, 'commit'): conn.commit()


def save_answer(user_id: int, data: dict):
    conn = get_db()
    conn.execute("INSERT INTO answer_records (user_id, question_id, lesson_group, question_type, correct, user_answer, time_spent) VALUES (?,?,?,?,?,?,?)",
        (user_id, data['question_id'], data.get('lesson_group', ''), data.get('question_type', 'choice'), int(data.get('correct', False)), data.get('user_answer', ''), data.get('time_spent', 0)))
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
