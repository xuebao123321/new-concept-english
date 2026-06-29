"""为乐乐(id=2)生成测试错题数据"""
from db import get_db, init_db
from datetime import datetime, timedelta

init_db()
conn = get_db()
uid = 2

data = [
    # (question_id, lesson_group, type, correct, user_answer, correct_answer, question_text, difficulty, time)
    ('L01-ch-001','lesson-01-02','choice',0,'书包','女士手提包','"handbag" 是什么意思？','easy', datetime.now() - timedelta(days=3)),
    ('L01-ch-001','lesson-01-02','choice',0,'钱包','女士手提包','"handbag" 是什么意思？','easy', datetime.now() - timedelta(days=2)),
    ('L01-ch-001','lesson-01-02','choice',0,'旅行箱','女士手提包','"handbag" 是什么意思？','easy', datetime.now() - timedelta(days=1)),
    ('L01-fill-001','lesson-01-02','fill',0,'is','am','This ___ my book.','easy', datetime.now() - timedelta(days=5)),
    ('L01-fill-001','lesson-01-02','fill',1,'is','am','This ___ my book.','easy', datetime.now() - timedelta(days=4)),
    ('L03-trans-001','lesson-03-04','translate',0,'This is my','Here is my','___ ticket. (这是我的票)','medium', datetime.now() - timedelta(days=2)),
    ('L03-trans-001','lesson-03-04','translate',0,'This is my','Here is my','___ ticket. (这是我的票)','medium', datetime.now() - timedelta(days=1)),
    ('L05-listen-001','lesson-05-06','listening',0,'Yes','No','Is this your pen?','medium', datetime.now() - timedelta(hours=12)),
    ('L07-reorder-001','lesson-07-08','reorder',0,'What is job your','What is your job','连词成句: what / is / your / job','hard', datetime.now() - timedelta(days=6)),
    ('L07-reorder-001','lesson-07-08','reorder',1,'What is your job','What is your job','连词成句: what / is / your / job','hard', datetime.now() - timedelta(days=5)),
    ('L09-choice-003','lesson-09-10','choice',0,'busy','lazy','"lazy" 是什么意思？','easy', datetime.now() - timedelta(days=1)),
    ('L11-fill-002','lesson-11-12','fill',0,'her','his','This is ___ tie. (他的)','easy', datetime.now() - timedelta(days=4)),
    ('L11-fill-002','lesson-11-12','fill',1,'his','his','This is ___ tie. (他的)','easy', datetime.now() - timedelta(days=3)),
    ('L13-listen-001','lesson-13-14','listening',0,'green','red','What colour is the dress?','medium', datetime.now() - timedelta(hours=6)),
    ('L15-trans-002','lesson-15-16','translate',0,'These is','These are','___ my friends. (这些是)','medium', datetime.now() - timedelta(days=2)),
]

for d in data:
    conn.execute(
        'INSERT INTO answer_records (user_id, question_id, lesson_group, question_type, correct, user_answer, correct_answer, question_text, difficulty, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        (uid, d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8])
    )

if hasattr(conn, 'commit'): conn.commit()

rows = conn.execute('SELECT COUNT(*) as cnt FROM answer_records WHERE user_id=? AND correct=0', (uid,)).fetchone()
d = rows.to_dict() if hasattr(rows,'to_dict') else dict(rows)
wrong = conn.execute('SELECT COUNT(DISTINCT question_id) as cnt FROM answer_records WHERE user_id=? AND correct=0', (uid,)).fetchone()
wd = wrong.to_dict() if hasattr(wrong,'to_dict') else dict(wrong)
print(f'✅ 插入完成: 乐乐共 {d["cnt"]} 条错误记录, {wd["cnt"]} 道不同错题')
print(f'   其中 3 道已订正 (有后续正确答案)')
print(f'   涉及 6 个课组: L1-2, L3-4, L5-6, L7-8, L9-10, L11-12, L13-14, L15-16')
