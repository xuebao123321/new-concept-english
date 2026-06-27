"""认证模块：PBKDF2 密码哈希 + JWT"""
import hashlib, os, secrets, time, jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_EXPIRY = 24 * 60 * 60  # 24小时


def hash_password(password: str) -> tuple[str, str]:
    """返回 (hash_hex, salt_hex)"""
    salt = secrets.token_hex(32)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 200000)
    return h.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 200000)
    return h.hex() == stored_hash


def create_token(user_id: int) -> str:
    payload = {"user_id": user_id, "exp": int(time.time()) + JWT_EXPIRY}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str):  # -> int | None (3.10+)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.PyJWTError:
        return None
