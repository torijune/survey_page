import os
import aiohttp
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class OpenAIClient:
    """OpenAI API 클라이언트"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = "https://api.openai.com/v1"
        
        if not self.api_key:
            raise ValueError("API Key가 제공되지 않았습니다. OPENAI_API_KEY 환경변수를 설정해주세요.")
    
    async def _call_chat_completion(self, prompt: str, model: str = "gpt-4o-mini", max_tokens: int = 2000, temperature: float = 0.7) -> str:
        """ChatGPT API 호출"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        connector = aiohttp.TCPConnector(ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    error_text = await response.text()
                    logger.error(f"OpenAI API 오류: {response.status} - {error_text}")
                    raise Exception(f"API 오류: {response.status}")


def get_openai_client(api_key: Optional[str] = None) -> OpenAIClient:
    """OpenAI 클라이언트 인스턴스를 반환합니다."""
    return OpenAIClient(api_key=api_key)
