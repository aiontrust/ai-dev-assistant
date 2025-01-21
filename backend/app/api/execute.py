from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.utils.docker_executor import execute_code_in_docker
from app.database.crud import create_execution_log
from app.database.db import get_db

router = APIRouter()

@router.post("/execute")
async def execute_code(request: dict, db: Session = Depends(get_db)):
    code = request.get("code")
    language = request.get("language")
    user_id = request.get("user_id")  # Pass user ID from frontend

    if not code or not language or not user_id:
        raise HTTPException(status_code=400, detail="Code, language, or user ID is missing.")
    
    result = execute_code_in_docker(code, language)
    
    # Save the result to the database
    log = create_execution_log(
        db=db,
        user_id=user_id,
        language=language,
        code=code,
        stdout=result["stdout"],
        stderr=result["stderr"]
    )
    return {"id": log.id, "stdout": result["stdout"], "stderr": result["stderr"]}
