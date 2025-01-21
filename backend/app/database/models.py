from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database.db import Base

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)  # User ID for tracking
    language = Column(String, index=True)
    code = Column(Text)
    stdout = Column(Text)
    stderr = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
