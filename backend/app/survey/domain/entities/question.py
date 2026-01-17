from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Any, Dict
from uuid import UUID


class QuestionType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    LIKERT = "likert"
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    NUMBER = "number"
    DATE = "date"
    DROPDOWN = "dropdown"


@dataclass
class ValidationRules:
    """문항 검증 규칙"""
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # "email", "phone", "url", or regex pattern
    
    def to_dict(self) -> dict:
        return {
            "min_length": self.min_length,
            "max_length": self.max_length,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "pattern": self.pattern,
        }
    
    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["ValidationRules"]:
        if not data:
            return None
        return cls(
            min_length=data.get("min_length"),
            max_length=data.get("max_length"),
            min_value=data.get("min_value"),
            max_value=data.get("max_value"),
            pattern=data.get("pattern"),
        )


@dataclass
class ConditionalLogic:
    """분기 로직"""
    question_id: str
    operator: str  # "equals", "not_equals", "contains", "greater_than", "less_than"
    value: Any
    action: str = "show"  # "show", "hide", "skip_to"
    target_section_id: Optional[str] = None  # skip_to 액션용
    
    def to_dict(self) -> dict:
        return {
            "question_id": self.question_id,
            "operator": self.operator,
            "value": self.value,
            "action": self.action,
            "target_section_id": self.target_section_id,
        }
    
    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["ConditionalLogic"]:
        if not data:
            return None
        return cls(
            question_id=data.get("question_id", ""),
            operator=data.get("operator", "equals"),
            value=data.get("value"),
            action=data.get("action", "show"),
            target_section_id=data.get("target_section_id"),
        )


@dataclass
class LikertConfig:
    """리커트 척도 설정"""
    scale_min: int = 1
    scale_max: int = 5
    labels: List[str] = field(default_factory=lambda: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"])
    rows: List[Any] = field(default_factory=list)  # 리커트 표 행 항목 (문자열 또는 {text, image_url, style} 객체)
    
    def to_dict(self) -> dict:
        return {
            "scale_min": self.scale_min,
            "scale_max": self.scale_max,
            "labels": self.labels,
            "rows": self.rows,
        }
    
    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["LikertConfig"]:
        if not data:
            return None
        return cls(
            scale_min=data.get("scale_min", 1),
            scale_max=data.get("scale_max", 5),
            labels=data.get("labels", ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]),
            rows=data.get("rows", []),
        )


@dataclass
class Question:
    """문항 엔티티"""
    id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    type: QuestionType = QuestionType.SHORT_TEXT
    title: str = ""
    description: Optional[str] = None
    required: bool = False
    order_index: int = 0
    is_hidden: bool = False  # 숨기기 기능 (미리보기/실제 설문에서 숨김)
    validation_rules: Optional[ValidationRules] = None
    conditional_logic: Optional[ConditionalLogic] = None
    likert_config: Optional[LikertConfig] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # 관계 데이터 (조회 시 포함)
    options: List["QuestionOption"] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id) if self.id else None,
            "section_id": str(self.section_id) if self.section_id else None,
            "type": self.type.value,
            "title": self.title,
            "description": self.description,
            "required": self.required,
            "order_index": self.order_index,
            "is_hidden": self.is_hidden,
            "validation_rules": self.validation_rules.to_dict() if self.validation_rules else None,
            "conditional_logic": self.conditional_logic.to_dict() if self.conditional_logic else None,
            "likert_config": self.likert_config.to_dict() if self.likert_config else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Forward reference for type hints
from .question_option import QuestionOption

