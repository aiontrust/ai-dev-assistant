from sqlalchemy.orm import Session
from app.database.models import ExecutionLog

def create_execution_log(db: Session, user_id: str, language: str, code: str, stdout: str, stderr: str):
    log = ExecutionLog(user_id=user_id, language=language, code=code, stdout=stdout, stderr=stderr)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

def get_execution_logs_by_user(db: Session, user_id: str):
    return db.query(ExecutionLog).filter(ExecutionLog.user_id == user_id).all()
