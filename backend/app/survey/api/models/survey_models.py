from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ==================== Request Models ====================

class ValidationRulesRequest(BaseModel):
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # "email", "phone", "url", or regex


class ConditionalLogicRequest(BaseModel):
    question_id: str
    operator: str = "equals"  # "equals", "not_equals", "contains", "greater_than", "less_than"
    value: Any
    action: str = "show"  # "show", "hide", "skip_to"
    target_section_id: Optional[str] = None


class LikertConfigRequest(BaseModel):
    scale_min: int = 1
    scale_max: int = 5
    labels: List[str] = ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]
    rows: List[Any] = []  # 문자열 또는 {text, image_url, style} 객체


class QuestionOptionRequest(BaseModel):
    label: str
    value: str
    order_index: int = 0
    allow_other: bool = False


class QuestionCreateRequest(BaseModel):
    section_id: str
    type: str  # single_choice, multiple_choice, likert, short_text, long_text, number, date, dropdown
    title: str
    description: Optional[str] = None
    required: bool = False
    order_index: int = 0
    is_hidden: bool = False
    validation_rules: Optional[ValidationRulesRequest] = None
    conditional_logic: Optional[ConditionalLogicRequest] = None
    likert_config: Optional[LikertConfigRequest] = None
    options: Optional[List[QuestionOptionRequest]] = None


class QuestionUpdateRequest(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    order_index: Optional[int] = None
    is_hidden: Optional[bool] = None
    validation_rules: Optional[ValidationRulesRequest] = None
    conditional_logic: Optional[ConditionalLogicRequest] = None
    likert_config: Optional[LikertConfigRequest] = None
    options: Optional[List[QuestionOptionRequest]] = None


class SectionCreateRequest(BaseModel):
    survey_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0
    is_conditional: bool = False
    conditional_logic: Optional[Dict[str, Any]] = None


class SectionUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_conditional: Optional[bool] = None
    conditional_logic: Optional[Dict[str, Any]] = None


class SurveyCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    intro_content: Optional[str] = None
    allow_edit: bool = True
    duplicate_prevention: bool = False
    logo_url: Optional[str] = None
    organization_name: Optional[str] = None
    organization_subtitle: Optional[str] = None
    logo_width: Optional[int] = None
    logo_height: Optional[int] = None
    text_position: Optional[str] = None


class SurveyUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    intro_content: Optional[str] = None
    allow_edit: Optional[bool] = None
    duplicate_prevention: Optional[bool] = None
    logo_url: Optional[str] = None
    organization_name: Optional[str] = None
    organization_subtitle: Optional[str] = None
    logo_width: Optional[int] = None
    logo_height: Optional[int] = None
    text_position: Optional[str] = None


# ==================== Response Models ====================

class QuestionOptionResponse(BaseModel):
    id: str
    question_id: str
    label: str
    value: str
    order_index: int
    allow_other: bool
    created_at: Optional[datetime] = None


class QuestionResponse(BaseModel):
    id: str
    section_id: str
    type: str
    title: str
    description: Optional[str] = None
    required: bool
    order_index: int
    is_hidden: bool = False
    validation_rules: Optional[Dict[str, Any]] = None
    conditional_logic: Optional[Dict[str, Any]] = None
    likert_config: Optional[Dict[str, Any]] = None
    options: List[QuestionOptionResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SectionResponse(BaseModel):
    id: str
    survey_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: int
    is_conditional: bool
    conditional_logic: Optional[Dict[str, Any]] = None
    questions: List[QuestionResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SurveyResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    intro_content: Optional[str] = None
    status: str
    share_id: Optional[str] = None
    allow_edit: bool
    duplicate_prevention: bool
    logo_url: Optional[str] = None
    organization_name: Optional[str] = None
    organization_subtitle: Optional[str] = None
    logo_width: Optional[int] = None
    logo_height: Optional[int] = None
    text_position: Optional[str] = None
    sections: List[SectionResponse] = []
    response_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SurveyListResponse(BaseModel):
    surveys: List[SurveyResponse]
    total: int


# ==================== PDF Import Response Models ====================

class PDFImportSectionPreview(BaseModel):
    """PDF에서 파싱된 섹션 미리보기"""
    title: str
    question_count: int


class PDFImportResponse(BaseModel):
    """PDF 설문 가져오기 응답"""
    success: bool
    survey_id: str
    survey_title: str
    message: str
    sections_count: int
    questions_count: int
    sections_preview: List[PDFImportSectionPreview] = []

