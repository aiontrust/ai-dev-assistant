from pydantic import BaseModel

class ExampleModel(BaseModel):
    id: int
    name: str

# Request model
class GPTRequest(BaseModel):
    prompt: str
    max_tokens: int = 150