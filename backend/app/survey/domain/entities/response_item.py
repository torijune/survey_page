from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Any
from uuid import UUID


@dataclass
class ResponseItem:
    """응답 상세 엔티티"""
    id: Optional[UUID] = None
    response_id: Optional[UUID] = None
    question_id: Optional[UUID] = None
    answer_value: Optional[Any] = None  # 단일값, 배열, 또는 리커트 응답 객체
    answer_text: Optional[str] = None  # 기타(직접입력) 또는 텍스트 응답
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id) if self.id else None,
            "response_id": str(self.response_id) if self.response_id else None,
            "question_id": str(self.question_id) if self.question_id else None,
            "answer_value": self.answer_value,
            "answer_text": self.answer_text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

