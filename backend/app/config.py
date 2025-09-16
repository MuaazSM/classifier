import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application configuration with environment variable support"""
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    RELOAD: bool = False
    
    # Classification settings
    CONFIDENCE_THRESHOLD: float = 0.85
    SECONDARY_THRESHOLD: float = 0.70
    MAX_QUESTIONS: int = 15
    MIN_QUESTIONS: int = 6
    LEARNING_RATE: float = 0.3
    
    # RAG settings
    OPENAI_API_KEY: Optional[str] = None
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    ENABLE_RAG: bool = True
    SIMILARITY_THRESHOLD: float = 0.7
    MAX_CHUNKS_PER_DEPT: int = 5
    
    # Optional external API keys (can be present but not required)
    HF_TOKEN: Optional[str] = None
    LANGCHAIN_API_KEY: Optional[str] = None
    
    # Data paths (relative to backend directory)
    DATA_DIR: str = "app/data"
    DEPARTMENTS_FILE: str = "app/data/departments.json"
    QUESTIONS_FILE: str = "app/data/question_bank.json"
    PDF_FILE: str = "app/data/departments.pdf"
    
    # CORS settings
    ALLOWED_ORIGINS: list = ["*"]  # Configure for production
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Allow extra fields to prevent validation errors from unused env vars
        extra = "ignore"

settings = Settings()