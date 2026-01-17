from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID


@dataclass
class Section:
    """섹션(페이지) 엔티티"""
    id: Optional[UUID] = None
    survey_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0
    is_conditional: bool = False
    conditional_logic: Optional[Dict[str, Any]] = None  # {"question_id": "...", "operator": "equals", "value": "..."}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # 관계 데이터 (조회 시 포함)
    questions: List["Question"] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id) if self.id else None,
            "survey_id": str(self.survey_id) if self.survey_id else None,
            "title": self.title,
            "description": self.description,
            "order_index": self.order_index,
            "is_conditional": self.is_conditional,
            "conditional_logic": self.conditional_logic,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Forward reference for type hints
from .question import Question

