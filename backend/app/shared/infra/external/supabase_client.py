import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseClient:
    """Supabase 클라이언트 (공유)"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        self.client = None
        if self.supabase_url and self.supabase_key and self.supabase_url != "placeholder":
            try:
                self.client: Client = create_client(self.supabase_url, self.supabase_key)
                logger.info("✅ Supabase 연결 성공")
            except Exception as e:
                logger.warning(f"⚠️  Supabase 연결 실패: {e}")
                self.client = None
        else:
            logger.warning("⚠️  Supabase 환경변수 미설정 - 일부 기능 제한")

    def get_client(self) -> Client:
        """Supabase 클라이언트 인스턴스 반환"""
        if not self.client:
            raise Exception("Supabase 클라이언트가 초기화되지 않았습니다.")
        return self.client

# 싱글톤 인스턴스
supabase_client = SupabaseClient()
