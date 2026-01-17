import os
import logging
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class SurveySupabaseClient:
    """설문조사용 Supabase 클라이언트"""
    
    _instance: Optional["SurveySupabaseClient"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        self.client: Optional[Client] = None
        if self.supabase_url and self.supabase_key and self.supabase_url != "placeholder":
            try:
                self.client = create_client(self.supabase_url, self.supabase_key)
                logger.info("✅ Survey Supabase 연결 성공")
            except Exception as e:
                logger.error(f"⚠️ Survey Supabase 연결 실패: {e}")
                self.client = None
        else:
            logger.warning("⚠️ Supabase 환경변수 미설정 - 일부 기능 제한")
        
        self._initialized = True
    
    def get_client(self) -> Optional[Client]:
        return self.client
    
    def is_connected(self) -> bool:
        return self.client is not None


# 싱글톤 인스턴스
survey_supabase_client = SurveySupabaseClient()

