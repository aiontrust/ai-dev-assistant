import os

class Settings:
    PROJECT_NAME: str = "AI-Development-Assistant"
    BACKEND_CORS_ORIGINS: list = ["*"]  # Adjust for production

# Load settings for API Key from environment variables
class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY")

settings = Settings()