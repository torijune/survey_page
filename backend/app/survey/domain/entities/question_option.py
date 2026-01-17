from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class QuestionOption:
    """문항 옵션 엔티티 (단일/다중선택, 드롭다운용)"""
    id: Optional[UUID] = None
    question_id: Optional[UUID] = None
    label: str = ""
    value: str = ""
    order_index: int = 0
    allow_other: bool = False  # 기타(직접입력) 허용
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id) if self.id else None,
            "question_id": str(self.question_id) if self.question_id else None,
            "label": self.label,
            "value": self.value,
            "order_index": self.order_index,
            "allow_other": self.allow_other,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

