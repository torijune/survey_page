from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Any, Dict  # Any used in ConditionalLogic.from_dict_or_list
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
    RANKING = "ranking"  # 순위 선택 (1순위, 2순위 등)
    SINGLE_SCALE = "single_scale"  # 단일 척도 (매우 필요, 다소 필요, 보통, 별로 불필요, 전혀 불필요 등)
    REPEATABLE_INPUTS = "repeatable_inputs"  # 반복 입력 (주소 등, + 버튼으로 행 추가)


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

    @classmethod
    def from_dict_or_list(cls, data: Any) -> Optional[List["ConditionalLogic"]]:
        """API/DB에서 단일 객체 또는 배열로 올 수 있는 conditional_logic 파싱."""
        if data is None:
            return None
        if isinstance(data, list):
            out = [cls.from_dict(d) for d in data if d]
            return out if out else None
        one = cls.from_dict(data)
        return [one] if one else None


@dataclass
class LikertRowItem:
    """리커트 척도 행 항목"""
    text: str
    image_url: Optional[str] = None
    style: Optional[Dict[str, Any]] = None  # e.g., {"bold": True, "color": "#FF0000"}
    
    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "image_url": self.image_url,
            "style": self.style,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LikertRowItem":
        return cls(
            text=data.get("text", ""),
            image_url=data.get("image_url"),
            style=data.get("style"),
        )


@dataclass
class LikertConfig:
    """리커트 척도 설정"""
    scale_min: int = 1
    scale_max: int = 5
    labels: List[str] = field(default_factory=lambda: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"])
    rows: List[Any] = field(default_factory=list)  # 리커트 표 행 항목 (문자열 또는 LikertRowItem 객체)
    
    def to_dict(self) -> dict:
        return {
            "scale_min": self.scale_min,
            "scale_max": self.scale_max,
            "labels": self.labels,
            "rows": [
                row.to_dict() if isinstance(row, LikertRowItem) else row
                for row in self.rows
            ],
        }
    
    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["LikertConfig"]:
        if not data:
            return None
        rows = []
        for row_item in data.get("rows", []):
            if isinstance(row_item, dict):
                rows.append(LikertRowItem.from_dict(row_item))
            elif isinstance(row_item, str):
                rows.append(LikertRowItem(text=row_item))
            else:
                rows.append(row_item)
        return cls(
            scale_min=data.get("scale_min", 1),
            scale_max=data.get("scale_max", 5),
            labels=data.get("labels", ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]),
            rows=rows,
        )


@dataclass
class RankingConfig:
    """순위 선택 설정"""
    max_ranks: int = 2  # 최대 몇 개까지 선택할 수 있는지 (예: 1순위, 2순위)
    rank_labels: List[str] = field(default_factory=lambda: ["1순위", "2순위"])  # 순위 레이블 (예: ["1순위", "2순위"])
    
    def to_dict(self) -> dict:
        return {
            "max_ranks": self.max_ranks,
            "rank_labels": self.rank_labels,
        }
    
    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["RankingConfig"]:
        if not data:
            return None
        return cls(
            max_ranks=data.get("max_ranks", 2),
            rank_labels=data.get("rank_labels", [f"{i+1}순위" for i in range(data.get("max_ranks", 2))]),
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
    question_number: Optional[str] = None  # 질문 넘버링 (SQ1, SQ2, A1, A2, B1, B2 등)
    validation_rules: Optional[ValidationRules] = None
    conditional_logic: Optional[List[ConditionalLogic]] = None
    likert_config: Optional[LikertConfig] = None
    ranking_config: Optional[RankingConfig] = None
    repeatable_config: Optional[Dict[str, Any]] = None  # { "parts": [ {"type": "text"|"input", "value"?, "key"?} ] }
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
            "question_number": self.question_number,
            "validation_rules": self.validation_rules.to_dict() if self.validation_rules else None,
            "conditional_logic": [c.to_dict() for c in self.conditional_logic] if self.conditional_logic else None,
            "likert_config": self.likert_config.to_dict() if self.likert_config else None,
            "ranking_config": self.ranking_config.to_dict() if self.ranking_config else None,
            "repeatable_config": self.repeatable_config,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Forward reference for type hints
from .question_option import QuestionOption

