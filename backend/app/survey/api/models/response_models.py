from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ==================== Request Models ====================

class ResponseItemRequest(BaseModel):
    question_id: str
    answer_value: Optional[Any] = None  # 단일값, 배열, 또는 리커트 응답 객체
    answer_text: Optional[str] = None


class ResponseCreateRequest(BaseModel):
    survey_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ResponseSubmitRequest(BaseModel):
    items: List[ResponseItemRequest]
    user_info: Optional[str] = None  # 사용자 정보 (암호화 전)


class DownloadRequest(BaseModel):
    format: str = "xlsx"  # "csv" or "xlsx"


# ==================== Response Models ====================

class ResponseItemResponse(BaseModel):
    id: str
    response_id: str
    question_id: str
    answer_value: Optional[Any] = None
    answer_text: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ResponseResponse(BaseModel):
    id: str
    survey_id: str
    user_info_hash: Optional[str] = None
    ip_address: Optional[str] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    is_complete: bool
    items: List[ResponseItemResponse] = []


class ResponseListResponse(BaseModel):
    responses: List[ResponseResponse]
    total: int


class QuestionStatistics(BaseModel):
    response_count: int
    value_counts: Dict[str, int] = {}
    text_responses: List[str] = []
    average: Optional[float] = None


class ResponseStatisticsResponse(BaseModel):
    total_responses: int
    question_stats: Dict[str, QuestionStatistics] = {}

