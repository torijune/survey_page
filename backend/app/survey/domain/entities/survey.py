from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID


class SurveyStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"


@dataclass
class Survey:
    """설문 엔티티"""
    id: Optional[UUID] = None
    title: str = ""
    description: Optional[str] = None
    intro_content: Optional[str] = None  # 설문 시작 페이지 콘텐츠 (HTML)
    status: SurveyStatus = SurveyStatus.DRAFT
    share_id: Optional[str] = None
    allow_edit: bool = True
    duplicate_prevention: bool = False
    # 로고 설정
    logo_url: Optional[str] = None  # 로고 이미지 URL
    organization_name: Optional[str] = None  # 조직명 (예: "서울신용보증재단")
    organization_subtitle: Optional[str] = None  # 부제목 (예: "서울특별시")
    logo_width: Optional[int] = None  # 로고 너비 (픽셀, 기본값: 48)
    logo_height: Optional[int] = None  # 로고 높이 (픽셀, 기본값: 48)
    text_position: Optional[str] = None  # 텍스트 위치: 'left', 'right', 'top', 'bottom' (기본값: 'right')
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # 관계 데이터 (조회 시 포함)
    sections: List["Section"] = field(default_factory=list)
    response_count: int = 0
    
    def is_published(self) -> bool:
        return self.status == SurveyStatus.PUBLISHED
    
    def is_closed(self) -> bool:
        return self.status == SurveyStatus.CLOSED
    
    def can_accept_responses(self) -> bool:
        return self.status == SurveyStatus.PUBLISHED
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id) if self.id else None,
            "title": self.title,
            "description": self.description,
            "intro_content": self.intro_content,
            "status": self.status.value,
            "share_id": self.share_id,
            "allow_edit": self.allow_edit,
            "duplicate_prevention": self.duplicate_prevention,
            "logo_url": self.logo_url,
            "organization_name": self.organization_name,
            "organization_subtitle": self.organization_subtitle,
            "logo_width": self.logo_width,
            "logo_height": self.logo_height,
            "text_position": self.text_position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "response_count": self.response_count,
        }


# Forward reference for type hints
from .section import Section

