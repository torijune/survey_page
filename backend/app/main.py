from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="설문조사 시스템 Backend",
    description="설문조사 생성, 배포, 응답 수집을 위한 API",
    version="1.0.0"
)

# CORS 설정 - 모든 도메인 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
try:
    from app.survey.api.routes.survey_routes import router as survey_router
    logger.info("survey_router import 성공")
except Exception as e:
    logger.error(f"survey_router import 실패: {e}")
    survey_router = None

# 라우터 등록
logger.info("라우터 등록 시작...")

if survey_router:
    app.include_router(survey_router, prefix="/api/v1/surveys", tags=["surveys"])
    logger.info("survey_router 등록 완료")
else:
    logger.error("survey_router가 None이므로 등록하지 않음")

logger.info("라우터 등록 완료")


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "설문조사 시스템 Backend API",
        "version": "1.0.0",
        "features": [
            "설문 CRUD",
            "설문 배포/마감",
            "응답 수집",
            "응답 통계",
            "CSV/XLSX 다운로드",
        ],
        "endpoints": {
            "surveys": "/api/v1/surveys",
        }
    }


@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {"status": "healthy", "service": "survey_backend"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
