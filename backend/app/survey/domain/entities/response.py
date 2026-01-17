from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID


@dataclass
class Response:
    """응답 엔티티"""
    id: Optional[UUID] = None
    survey_id: Optional[UUID] = None
    user_info_encrypted: Optional[str] = None  # 암호화된 사용자 정보
    user_info_hash: Optional[str] = None  # SHA-256 해시 (빠른 중복 체크용)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    is_complete: bool = False
    
    # 관계 데이터 (조회 시 포함)
    items: List["ResponseItem"] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id) if self.id else None,
            "survey_id": str(self.survey_id) if self.survey_id else None,
            "user_info_encrypted": self.user_info_encrypted,
            "user_info_hash": self.user_info_hash,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "is_complete": self.is_complete,
        }


# Forward reference for type hints
from .response_item import ResponseItem

