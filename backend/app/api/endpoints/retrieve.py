from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.crud import get_execution_logs_by_user
from app.database.db import get_db

router = APIRouter()

# Endpoint to get logs for a specific user 
@router.get("/logs/{user_id}")
async def get_logs(user_id: str, db: Session = Depends(get_db)):
        logs = get_execution_logs_by_user(db, user_id)
        return logs


