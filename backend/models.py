from pydantic import BaseModel
from typing import Optional

# ── 用户 ──
class UserCreate(BaseModel):
    username: str
    password: str
    nickname: str = ""
    role: str = "student"
    family_code: str = ""

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    nickname: str
    grade: str = ""
    role: str = "student"
    family_code: str = ""
    parent_id: Optional[int] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

class FamilyBindRequest(BaseModel):
    family_code: str

class ChildUnlockRequest(BaseModel):
    lesson_group: str

class ChildResetRequest(BaseModel):
    lesson_group: str

# ── 学习进度 ──
class LessonProgressResponse(BaseModel):
    lesson_group: str
    completed: bool
    best_accuracy: float
    attempts: int
    last_attempt_at: Optional[str] = None
    completed_at: Optional[str] = None

# ── 答题 ──
class AnswerSubmitRequest(BaseModel):
    question_id: str
    correct: bool
    user_answer: str
    time_spent: float
    lesson_group: str = ""
    question_type: str = "choice"
    question_text: str = ""       # 题干文本
    correct_answer: str = ""      # 正确答案
    difficulty: str = "medium"    # easy/medium/hard

class AnswerSubmitResponse(BaseModel):
    xp_earned: int
    combo_bonus: int
    total_xp: int

# ── 统计 ──
class UserStatsResponse(BaseModel):
    total_xp: int
    streak_days: int
    total_questions: int
    total_correct: int
    completed_lessons: int
    total_lessons: int
