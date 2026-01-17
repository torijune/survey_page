import logging
from typing import List, Optional
from uuid import UUID

from ...domain.entities import (
    Survey, SurveyStatus, Section, Question, QuestionType,
    QuestionOption, ValidationRules, ConditionalLogic, LikertConfig
)
from ...domain.repositories import SurveyRepository
from ...api.models import (
    SurveyCreateRequest, SurveyUpdateRequest,
    SectionCreateRequest, SectionUpdateRequest,
    QuestionCreateRequest, QuestionUpdateRequest,
    QuestionOptionRequest,
)

logger = logging.getLogger(__name__)


class SurveyService:
    """설문 서비스"""
    
    def __init__(self, survey_repository: SurveyRepository):
        self.survey_repository = survey_repository
    
    # ==================== Survey Operations ====================
    
    async def create_survey(self, request: SurveyCreateRequest) -> Survey:
        """설문 생성"""
        survey = Survey(
            title=request.title,
            description=request.description,
            intro_content=request.intro_content,
            allow_edit=request.allow_edit,
            duplicate_prevention=request.duplicate_prevention,
        )
        
        created_survey = await self.survey_repository.create_survey(survey)
        
        # 기본 섹션 생성
        default_section = Section(
            survey_id=created_survey.id,
            title="",
            order_index=0,
        )
        created_section = await self.survey_repository.create_section(default_section)
        created_survey.sections = [created_section]
        
        return created_survey
    
    async def get_survey(self, survey_id: str, include_details: bool = True) -> Optional[Survey]:
        """설문 조회"""
        return await self.survey_repository.get_survey_by_id(UUID(survey_id), include_details)
    
    async def get_survey_by_share_id(self, share_id: str) -> Optional[Survey]:
        """공유 ID로 설문 조회"""
        return await self.survey_repository.get_survey_by_share_id(share_id)
    
    async def get_all_surveys(self, status: Optional[str] = None) -> List[Survey]:
        """설문 목록 조회"""
        return await self.survey_repository.get_all_surveys(status)
    
    async def update_survey(self, survey_id: str, request: SurveyUpdateRequest) -> Survey:
        """설문 수정"""
        existing = await self.survey_repository.get_survey_by_id(UUID(survey_id), include_details=False)
        if not existing:
            raise ValueError("설문을 찾을 수 없습니다.")
        
        if request.title is not None:
            existing.title = request.title
        if request.description is not None:
            existing.description = request.description
        if request.intro_content is not None:
            existing.intro_content = request.intro_content
        if request.allow_edit is not None:
            existing.allow_edit = request.allow_edit
        if request.duplicate_prevention is not None:
            existing.duplicate_prevention = request.duplicate_prevention
        
        return await self.survey_repository.update_survey(existing)
    
    async def delete_survey(self, survey_id: str) -> bool:
        """설문 삭제"""
        return await self.survey_repository.delete_survey(UUID(survey_id))
    
    async def publish_survey(self, survey_id: str) -> Survey:
        """설문 배포"""
        return await self.survey_repository.update_survey_status(UUID(survey_id), SurveyStatus.PUBLISHED.value)
    
    async def close_survey(self, survey_id: str) -> Survey:
        """설문 마감"""
        return await self.survey_repository.update_survey_status(UUID(survey_id), SurveyStatus.CLOSED.value)
    
    # ==================== Section Operations ====================
    
    async def create_section(self, request: SectionCreateRequest) -> Section:
        """섹션 생성"""
        section = Section(
            survey_id=UUID(request.survey_id),
            title=request.title,
            description=request.description,
            order_index=request.order_index,
            is_conditional=request.is_conditional,
            conditional_logic=request.conditional_logic,
        )
        return await self.survey_repository.create_section(section)
    
    async def update_section(self, section_id: str, request: SectionUpdateRequest) -> Section:
        """섹션 수정"""
        sections = await self.survey_repository.get_sections_by_survey_id(UUID(section_id))
        existing = next((s for s in sections if str(s.id) == section_id), None)
        
        if not existing:
            # section_id로 직접 조회 시도
            existing = Section(id=UUID(section_id))
        
        if request.title is not None:
            existing.title = request.title
        if request.description is not None:
            existing.description = request.description
        if request.order_index is not None:
            existing.order_index = request.order_index
        if request.is_conditional is not None:
            existing.is_conditional = request.is_conditional
        if request.conditional_logic is not None:
            existing.conditional_logic = request.conditional_logic
        
        return await self.survey_repository.update_section(existing)
    
    async def delete_section(self, section_id: str) -> bool:
        """섹션 삭제"""
        return await self.survey_repository.delete_section(UUID(section_id))
    
    async def reorder_sections(self, survey_id: str, section_orders: List[dict]) -> bool:
        """섹션 순서 변경"""
        return await self.survey_repository.reorder_sections(UUID(survey_id), section_orders)
    
    # ==================== Question Operations ====================
    
    async def create_question(self, request: QuestionCreateRequest) -> Question:
        """문항 생성"""
        question = Question(
            section_id=UUID(request.section_id),
            type=QuestionType(request.type),
            title=request.title,
            description=request.description,
            required=request.required,
            order_index=request.order_index,
            is_hidden=request.is_hidden,
            validation_rules=self._map_validation_rules(request.validation_rules),
            conditional_logic=self._map_conditional_logic(request.conditional_logic),
            likert_config=self._map_likert_config(request.likert_config),
        )
        
        created_question = await self.survey_repository.create_question(question)
        
        # 옵션 생성
        if request.options:
            options = [
                QuestionOption(
                    question_id=created_question.id,
                    label=opt.label,
                    value=opt.value,
                    order_index=opt.order_index,
                    allow_other=opt.allow_other,
                )
                for opt in request.options
            ]
            created_question.options = await self.survey_repository.create_question_options(options)
        
        return created_question
    
    async def update_question(self, question_id: str, request: QuestionUpdateRequest) -> Question:
        """문항 수정"""
        existing = Question(id=UUID(question_id))
        
        if request.type is not None:
            existing.type = QuestionType(request.type)
        if request.title is not None:
            existing.title = request.title
        if request.description is not None:
            existing.description = request.description
        if request.required is not None:
            existing.required = request.required
        if request.order_index is not None:
            existing.order_index = request.order_index
        if request.is_hidden is not None:
            existing.is_hidden = request.is_hidden
        if request.validation_rules is not None:
            existing.validation_rules = self._map_validation_rules(request.validation_rules)
        if request.conditional_logic is not None:
            existing.conditional_logic = self._map_conditional_logic(request.conditional_logic)
        if request.likert_config is not None:
            existing.likert_config = self._map_likert_config(request.likert_config)
        
        updated_question = await self.survey_repository.update_question(existing)
        
        # 옵션 업데이트
        if request.options is not None:
            options = [
                QuestionOption(
                    question_id=UUID(question_id),
                    label=opt.label,
                    value=opt.value,
                    order_index=opt.order_index,
                    allow_other=opt.allow_other,
                )
                for opt in request.options
            ]
            updated_question.options = await self.survey_repository.update_question_options(UUID(question_id), options)
        
        return updated_question
    
    async def delete_question(self, question_id: str) -> bool:
        """문항 삭제"""
        return await self.survey_repository.delete_question(UUID(question_id))
    
    async def reorder_questions(self, section_id: str, question_orders: List[dict]) -> bool:
        """문항 순서 변경"""
        return await self.survey_repository.reorder_questions(UUID(section_id), question_orders)
    
    # ==================== Helpers ====================
    
    def _map_validation_rules(self, request) -> Optional[ValidationRules]:
        if not request:
            return None
        return ValidationRules(
            min_length=request.min_length,
            max_length=request.max_length,
            min_value=request.min_value,
            max_value=request.max_value,
            pattern=request.pattern,
        )
    
    def _map_conditional_logic(self, request) -> Optional[ConditionalLogic]:
        if not request:
            return None
        return ConditionalLogic(
            question_id=request.question_id,
            operator=request.operator,
            value=request.value,
            action=request.action,
            target_section_id=request.target_section_id,
        )
    
    def _map_likert_config(self, request) -> Optional[LikertConfig]:
        if not request:
            return None
        return LikertConfig(
            scale_min=request.scale_min,
            scale_max=request.scale_max,
            labels=request.labels,
            rows=request.rows,
        )

