from fastapi import APIRouter, HTTPException
from app.utils.docker_executor import execute_code_in_docker

router = APIRouter()

@router.post("/execute")
async def execute_code(request: dict):
    code = request.get("code")
    language = request.get("language")
    if not code or not language:
        raise HTTPException(status_code=400, detail="Code or language is missing.")
    
    result = execute_code_in_docker(code, language)
    return result
