import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from ...domain.entities import (
    Survey, SurveyStatus, Section, Question, QuestionType,
    QuestionOption, ValidationRules, ConditionalLogic, LikertConfig
)
from ...domain.repositories import SurveyRepository
from ..external.supabase_client import survey_supabase_client

logger = logging.getLogger(__name__)


class SurveyRepositoryImpl(SurveyRepository):
    """Supabase 기반 설문 리포지토리 구현"""
    
    def __init__(self):
        self.client = survey_supabase_client.get_client()
    
    def _ensure_client(self):
        if not self.client:
            raise Exception("Supabase 클라이언트가 초기화되지 않았습니다.")
    
    # ==================== Survey CRUD ====================
    
    async def create_survey(self, survey: Survey) -> Survey:
        self._ensure_client()
        try:
            data = {
                "title": survey.title,
                "description": survey.description,
                "intro_content": survey.intro_content,
                "status": survey.status.value,
                "allow_edit": survey.allow_edit,
                "duplicate_prevention": survey.duplicate_prevention,
                "logo_url": survey.logo_url,
                "organization_name": survey.organization_name,
                "organization_subtitle": survey.organization_subtitle,
                "logo_width": survey.logo_width,
                "logo_height": survey.logo_height,
                "text_position": survey.text_position,
            }
            
            result = self.client.table("surveys").insert(data).execute()
            
            if result.data:
                return self._map_to_survey(result.data[0])
            raise Exception("설문 생성 실패")
        except Exception as e:
            logger.error(f"설문 생성 실패: {e}")
            raise
    
    async def get_survey_by_id(self, survey_id: UUID, include_details: bool = True) -> Optional[Survey]:
        self._ensure_client()
        try:
            result = self.client.table("surveys").select("*").eq("id", str(survey_id)).execute()
            
            if not result.data:
                return None
            
            survey = self._map_to_survey(result.data[0])
            
            if include_details:
                survey.sections = await self.get_sections_by_survey_id(survey_id)
                for section in survey.sections:
                    section.questions = await self.get_questions_by_section_id(section.id)
                    for question in section.questions:
                        question.options = await self.get_options_by_question_id(question.id)
            
            # 응답 수 조회
            count_result = self.client.table("responses").select("id", count="exact").eq("survey_id", str(survey_id)).eq("is_complete", True).execute()
            survey.response_count = count_result.count if count_result.count else 0
            
            return survey
        except Exception as e:
            logger.error(f"설문 조회 실패: {e}")
            raise
    
    async def get_survey_by_share_id(self, share_id: str, include_details: bool = True) -> Optional[Survey]:
        self._ensure_client()
        try:
            result = self.client.table("surveys").select("*").eq("share_id", share_id).execute()
            
            if not result.data:
                return None
            
            survey = self._map_to_survey(result.data[0])
            
            if include_details:
                survey.sections = await self.get_sections_by_survey_id(survey.id)
                for section in survey.sections:
                    section.questions = await self.get_questions_by_section_id(section.id)
                    for question in section.questions:
                        question.options = await self.get_options_by_question_id(question.id)
            
            return survey
        except Exception as e:
            logger.error(f"설문 조회 실패 (share_id): {e}")
            raise
    
    async def get_all_surveys(self, status: Optional[str] = None) -> List[Survey]:
        self._ensure_client()
        try:
            query = self.client.table("surveys").select("*").order("created_at", desc=True)
            
            if status:
                query = query.eq("status", status)
            
            result = query.execute()
            
            surveys = [self._map_to_survey(row) for row in result.data]
            
            # 각 설문의 응답 수 조회
            for survey in surveys:
                count_result = self.client.table("responses").select("id", count="exact").eq("survey_id", str(survey.id)).eq("is_complete", True).execute()
                survey.response_count = count_result.count if count_result.count else 0
            
            return surveys
        except Exception as e:
            logger.error(f"설문 목록 조회 실패: {e}")
            raise
    
    async def update_survey(self, survey: Survey) -> Survey:
        self._ensure_client()
        try:
            data = {
                "title": survey.title,
                "description": survey.description,
                "intro_content": survey.intro_content,
                "allow_edit": survey.allow_edit,
                "duplicate_prevention": survey.duplicate_prevention,
                "logo_url": survey.logo_url,
                "organization_name": survey.organization_name,
                "organization_subtitle": survey.organization_subtitle,
                "logo_width": survey.logo_width,
                "logo_height": survey.logo_height,
                "text_position": survey.text_position,
            }
            
            result = self.client.table("surveys").update(data).eq("id", str(survey.id)).execute()
            
            if result.data:
                return self._map_to_survey(result.data[0])
            raise Exception("설문 수정 실패")
        except Exception as e:
            logger.error(f"설문 수정 실패: {e}")
            raise
    
    async def delete_survey(self, survey_id: UUID) -> bool:
        self._ensure_client()
        try:
            self.client.table("surveys").delete().eq("id", str(survey_id)).execute()
            return True
        except Exception as e:
            logger.error(f"설문 삭제 실패: {e}")
            raise
    
    async def update_survey_status(self, survey_id: UUID, status: str) -> Survey:
        self._ensure_client()
        try:
            result = self.client.table("surveys").update({"status": status}).eq("id", str(survey_id)).execute()
            
            if result.data:
                return self._map_to_survey(result.data[0])
            raise Exception("설문 상태 변경 실패")
        except Exception as e:
            logger.error(f"설문 상태 변경 실패: {e}")
            raise
    
    # ==================== Section CRUD ====================
    
    async def create_section(self, section: Section) -> Section:
        self._ensure_client()
        try:
            data = {
                "survey_id": str(section.survey_id),
                "title": section.title,
                "description": section.description,
                "order_index": section.order_index,
                "is_conditional": section.is_conditional,
                "conditional_logic": section.conditional_logic,
            }
            
            result = self.client.table("sections").insert(data).execute()
            
            if result.data:
                return self._map_to_section(result.data[0])
            raise Exception("섹션 생성 실패")
        except Exception as e:
            logger.error(f"섹션 생성 실패: {e}")
            raise
    
    async def get_sections_by_survey_id(self, survey_id: UUID) -> List[Section]:
        self._ensure_client()
        try:
            result = self.client.table("sections").select("*").eq("survey_id", str(survey_id)).order("order_index").execute()
            return [self._map_to_section(row) for row in result.data]
        except Exception as e:
            logger.error(f"섹션 목록 조회 실패: {e}")
            raise
    
    async def update_section(self, section: Section) -> Section:
        self._ensure_client()
        try:
            data = {
                "title": section.title,
                "description": section.description,
                "order_index": section.order_index,
                "is_conditional": section.is_conditional,
                "conditional_logic": section.conditional_logic,
            }
            
            result = self.client.table("sections").update(data).eq("id", str(section.id)).execute()
            
            if result.data:
                return self._map_to_section(result.data[0])
            raise Exception("섹션 수정 실패")
        except Exception as e:
            logger.error(f"섹션 수정 실패: {e}")
            raise
    
    async def delete_section(self, section_id: UUID) -> bool:
        self._ensure_client()
        try:
            self.client.table("sections").delete().eq("id", str(section_id)).execute()
            return True
        except Exception as e:
            logger.error(f"섹션 삭제 실패: {e}")
            raise
    
    async def reorder_sections(self, survey_id: UUID, section_orders: List[dict]) -> bool:
        self._ensure_client()
        try:
            for order in section_orders:
                self.client.table("sections").update({"order_index": order["order_index"]}).eq("id", order["id"]).execute()
            return True
        except Exception as e:
            logger.error(f"섹션 순서 변경 실패: {e}")
            raise
    
    # ==================== Question CRUD ====================
    
    async def create_question(self, question: Question) -> Question:
        self._ensure_client()
        try:
            data = {
                "section_id": str(question.section_id),
                "type": question.type.value,
                "title": question.title,
                "description": question.description,
                "required": question.required,
                "order_index": question.order_index,
                "is_hidden": question.is_hidden,
                "validation_rules": question.validation_rules.to_dict() if question.validation_rules else None,
                "conditional_logic": question.conditional_logic.to_dict() if question.conditional_logic else None,
                "likert_config": question.likert_config.to_dict() if question.likert_config else None,
            }
            
            result = self.client.table("questions").insert(data).execute()
            
            if result.data:
                return self._map_to_question(result.data[0])
            raise Exception("문항 생성 실패")
        except Exception as e:
            logger.error(f"문항 생성 실패: {e}")
            raise
    
    async def get_questions_by_section_id(self, section_id: UUID) -> List[Question]:
        self._ensure_client()
        try:
            result = self.client.table("questions").select("*").eq("section_id", str(section_id)).order("order_index").execute()
            return [self._map_to_question(row) for row in result.data]
        except Exception as e:
            logger.error(f"문항 목록 조회 실패: {e}")
            raise
    
    async def update_question(self, question: Question) -> Question:
        self._ensure_client()
        try:
            data = {
                "type": question.type.value,
                "title": question.title,
                "description": question.description,
                "required": question.required,
                "order_index": question.order_index,
                "is_hidden": question.is_hidden,
                "validation_rules": question.validation_rules.to_dict() if question.validation_rules else None,
                "conditional_logic": question.conditional_logic.to_dict() if question.conditional_logic else None,
                "likert_config": question.likert_config.to_dict() if question.likert_config else None,
            }
            
            result = self.client.table("questions").update(data).eq("id", str(question.id)).execute()
            
            if result.data:
                return self._map_to_question(result.data[0])
            raise Exception("문항 수정 실패")
        except Exception as e:
            logger.error(f"문항 수정 실패: {e}")
            raise
    
    async def delete_question(self, question_id: UUID) -> bool:
        self._ensure_client()
        try:
            self.client.table("questions").delete().eq("id", str(question_id)).execute()
            return True
        except Exception as e:
            logger.error(f"문항 삭제 실패: {e}")
            raise
    
    async def reorder_questions(self, section_id: UUID, question_orders: List[dict]) -> bool:
        self._ensure_client()
        try:
            for order in question_orders:
                self.client.table("questions").update({"order_index": order["order_index"]}).eq("id", order["id"]).execute()
            return True
        except Exception as e:
            logger.error(f"문항 순서 변경 실패: {e}")
            raise
    
    # ==================== QuestionOption CRUD ====================
    
    async def create_question_options(self, options: List[QuestionOption]) -> List[QuestionOption]:
        self._ensure_client()
        try:
            data = [
                {
                    "question_id": str(opt.question_id),
                    "label": opt.label,
                    "value": opt.value,
                    "order_index": opt.order_index,
                    "allow_other": opt.allow_other,
                }
                for opt in options
            ]
            
            result = self.client.table("question_options").insert(data).execute()
            return [self._map_to_option(row) for row in result.data]
        except Exception as e:
            logger.error(f"문항 옵션 생성 실패: {e}")
            raise
    
    async def get_options_by_question_id(self, question_id: UUID) -> List[QuestionOption]:
        self._ensure_client()
        try:
            result = self.client.table("question_options").select("*").eq("question_id", str(question_id)).order("order_index").execute()
            return [self._map_to_option(row) for row in result.data]
        except Exception as e:
            logger.error(f"문항 옵션 조회 실패: {e}")
            raise
    
    async def update_question_options(self, question_id: UUID, options: List[QuestionOption]) -> List[QuestionOption]:
        self._ensure_client()
        try:
            # 기존 옵션 삭제
            await self.delete_question_options(question_id)
            
            # 새 옵션 생성
            if options:
                for opt in options:
                    opt.question_id = question_id
                return await self.create_question_options(options)
            return []
        except Exception as e:
            logger.error(f"문항 옵션 업데이트 실패: {e}")
            raise
    
    async def delete_question_options(self, question_id: UUID) -> bool:
        self._ensure_client()
        try:
            self.client.table("question_options").delete().eq("question_id", str(question_id)).execute()
            return True
        except Exception as e:
            logger.error(f"문항 옵션 삭제 실패: {e}")
            raise
    
    # ==================== Mappers ====================
    
    def _map_to_survey(self, data: dict) -> Survey:
        return Survey(
            id=UUID(data["id"]),
            title=data["title"],
            description=data.get("description"),
            intro_content=data.get("intro_content"),
            status=SurveyStatus(data["status"]),
            share_id=data.get("share_id"),
            allow_edit=data.get("allow_edit", True),
            duplicate_prevention=data.get("duplicate_prevention", False),
            logo_url=data.get("logo_url"),
            organization_name=data.get("organization_name"),
            organization_subtitle=data.get("organization_subtitle"),
            logo_width=data.get("logo_width"),
            logo_height=data.get("logo_height"),
            text_position=data.get("text_position"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if data.get("created_at") else None,
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")) if data.get("updated_at") else None,
        )
    
    def _map_to_section(self, data: dict) -> Section:
        return Section(
            id=UUID(data["id"]),
            survey_id=UUID(data["survey_id"]),
            title=data.get("title"),
            description=data.get("description"),
            order_index=data.get("order_index", 0),
            is_conditional=data.get("is_conditional", False),
            conditional_logic=data.get("conditional_logic"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if data.get("created_at") else None,
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")) if data.get("updated_at") else None,
        )
    
    def _map_to_question(self, data: dict) -> Question:
        return Question(
            id=UUID(data["id"]),
            section_id=UUID(data["section_id"]),
            type=QuestionType(data["type"]),
            title=data["title"],
            description=data.get("description"),
            required=data.get("required", False),
            order_index=data.get("order_index", 0),
            is_hidden=data.get("is_hidden", False),
            validation_rules=ValidationRules.from_dict(data.get("validation_rules")),
            conditional_logic=ConditionalLogic.from_dict(data.get("conditional_logic")),
            likert_config=LikertConfig.from_dict(data.get("likert_config")),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if data.get("created_at") else None,
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")) if data.get("updated_at") else None,
        )
    
    def _map_to_option(self, data: dict) -> QuestionOption:
        return QuestionOption(
            id=UUID(data["id"]),
            question_id=UUID(data["question_id"]),
            label=data["label"],
            value=data["value"],
            order_index=data.get("order_index", 0),
            allow_other=data.get("allow_other", False),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if data.get("created_at") else None,
        )

