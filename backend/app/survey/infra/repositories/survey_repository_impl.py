import logging
import asyncio
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from ...domain.entities import (
    Survey, SurveyStatus, Section, Question, QuestionType,
    QuestionOption, ValidationRules, ConditionalLogic, LikertConfig, RankingConfig
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
                "description_pages": survey.description_pages,
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
                # 섹션 조회
                survey.sections = await self.get_sections_by_survey_id(survey_id)
                
                if not survey.sections:
                    # 응답 수 조회
                    count_result = self.client.table("responses").select("id", count="exact").eq("survey_id", str(survey_id)).eq("is_complete", True).execute()
                    survey.response_count = count_result.count if count_result.count else 0
                    return survey
                
                # 모든 섹션 ID 수집
                section_ids = [str(s.id) for s in survey.sections if s.id]
                
                # 배치로 모든 질문 조회 (한 번의 쿼리)
                all_questions_result = self.client.table("questions")\
                    .select("*")\
                    .in_("section_id", section_ids)\
                    .order("section_id, order_index")\
                    .execute()
                
                # 질문을 섹션별로 그룹화
                questions_by_section = {}
                for q_data in all_questions_result.data:
                    section_id = q_data["section_id"]
                    if section_id not in questions_by_section:
                        questions_by_section[section_id] = []
                    questions_by_section[section_id].append(self._map_to_question(q_data))
                
                # 섹션에 질문 할당
                all_question_ids = []
                for section in survey.sections:
                    section.questions = questions_by_section.get(str(section.id), [])
                    all_question_ids.extend([str(q.id) for q in section.questions if q.id])
                
                # 배치로 모든 옵션 조회 (한 번의 쿼리)
                if all_question_ids:
                    all_options_result = self.client.table("question_options")\
                        .select("*")\
                        .in_("question_id", all_question_ids)\
                        .order("question_id, order_index")\
                        .execute()
                    
                    # 옵션을 질문별로 그룹화
                    options_by_question = {}
                    for opt_data in all_options_result.data:
                        question_id = opt_data["question_id"]
                        if question_id not in options_by_question:
                            options_by_question[question_id] = []
                        options_by_question[question_id].append(self._map_to_option(opt_data))
                    
                    # 질문에 옵션 할당
                    for section in survey.sections:
                        for question in section.questions:
                            if question.id:
                                question.options = options_by_question.get(str(question.id), [])
            
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
                # 섹션 조회
                survey.sections = await self.get_sections_by_survey_id(survey.id)
                
                if not survey.sections:
                    return survey
                
                # 모든 섹션 ID 수집
                section_ids = [str(s.id) for s in survey.sections if s.id]
                
                # 배치로 모든 질문 조회 (한 번의 쿼리)
                all_questions_result = self.client.table("questions")\
                    .select("*")\
                    .in_("section_id", section_ids)\
                    .order("section_id, order_index")\
                    .execute()
                
                # 질문을 섹션별로 그룹화
                questions_by_section = {}
                for q_data in all_questions_result.data:
                    section_id = q_data["section_id"]
                    if section_id not in questions_by_section:
                        questions_by_section[section_id] = []
                    questions_by_section[section_id].append(self._map_to_question(q_data))
                
                # 섹션에 질문 할당
                all_question_ids = []
                for section in survey.sections:
                    section.questions = questions_by_section.get(str(section.id), [])
                    all_question_ids.extend([str(q.id) for q in section.questions if q.id])
                
                # 배치로 모든 옵션 조회 (한 번의 쿼리)
                if all_question_ids:
                    all_options_result = self.client.table("question_options")\
                        .select("*")\
                        .in_("question_id", all_question_ids)\
                        .order("question_id, order_index")\
                        .execute()
                    
                    # 옵션을 질문별로 그룹화
                    options_by_question = {}
                    for opt_data in all_options_result.data:
                        question_id = opt_data["question_id"]
                        if question_id not in options_by_question:
                            options_by_question[question_id] = []
                        options_by_question[question_id].append(self._map_to_option(opt_data))
                    
                    # 질문에 옵션 할당
                    for section in survey.sections:
                        for question in section.questions:
                            if question.id:
                                question.options = options_by_question.get(str(question.id), [])
            
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
            
            # 각 설문의 응답 수를 병렬로 조회
            if surveys:
                survey_ids = [str(s.id) for s in surveys if s.id]
                
                # 배치로 모든 응답 수 조회 (한 번의 쿼리)
                # Supabase는 count를 배치로 할 수 없으므로 병렬 처리
                async def get_count(survey_id: str):
                    count_result = self.client.table("responses").select("id", count="exact").eq("survey_id", survey_id).eq("is_complete", True).execute()
                    return survey_id, count_result.count if count_result.count else 0
                
                count_tasks = [get_count(sid) for sid in survey_ids]
                count_results = await asyncio.gather(*count_tasks)
                
                # 결과를 딕셔너리로 변환
                count_dict = {sid: count for sid, count in count_results}
                
                # 각 설문에 응답 수 할당
                for survey in surveys:
                    if survey.id:
                        survey.response_count = count_dict.get(str(survey.id), 0)
            
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
                "description_pages": survey.description_pages,
                "allow_edit": survey.allow_edit,
                "duplicate_prevention": survey.duplicate_prevention,
                "logo_url": survey.logo_url,
                "organization_name": survey.organization_name,
                "organization_subtitle": survey.organization_subtitle,
                "logo_width": survey.logo_width,
                "logo_height": survey.logo_height,
                "text_position": survey.text_position,
                "first_page_content": survey.first_page_content,
                "completion_content": survey.completion_content,
            }
            logger.info(f"설문 업데이트 데이터: {data}")
            logger.info(f"로고 URL: {data.get('logo_url')}, 크기: {data.get('logo_width')}x{data.get('logo_height')}, 위치: {data.get('text_position')}")
            
            result = self.client.table("surveys").update(data).eq("id", str(survey.id)).execute()
            
            logger.info(f"업데이트 결과: {result.data}")
            if result.data:
                updated_survey = self._map_to_survey(result.data[0])
                logger.info(f"매핑된 설문 로고 URL: {updated_survey.logo_url}")
                return updated_survey
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
    
    async def create_sections_batch(self, sections: List[Section]) -> List[Section]:
        """여러 섹션을 한 번에 생성 (배치 최적화)"""
        self._ensure_client()
        try:
            if not sections:
                return []
            
            data = [
                {
                    "survey_id": str(section.survey_id),
                    "title": section.title,
                    "description": section.description,
                    "order_index": section.order_index,
                    "is_conditional": section.is_conditional,
                    "conditional_logic": section.conditional_logic,
                }
                for section in sections
            ]
            
            result = self.client.table("sections").insert(data).execute()
            return [self._map_to_section(row) for row in result.data]
        except Exception as e:
            logger.error(f"섹션 배치 생성 실패: {e}")
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
    
    async def delete_sections_batch(self, section_ids: List[UUID]) -> bool:
        """여러 섹션을 병렬로 삭제 (배치 최적화)"""
        self._ensure_client()
        try:
            if not section_ids:
                return True
            
            async def delete_one(section_id: UUID):
                self.client.table("sections").delete().eq("id", str(section_id)).execute()
            
            tasks = [delete_one(sid) for sid in section_ids]
            await asyncio.gather(*tasks)
            return True
        except Exception as e:
            logger.error(f"섹션 배치 삭제 실패: {e}")
            raise
    
    async def reorder_sections(self, survey_id: UUID, section_orders: List[dict]) -> bool:
        self._ensure_client()
        try:
            # 병렬 처리로 최적화
            async def update_order(order: dict):
                self.client.table("sections").update({"order_index": order["order_index"]}).eq("id", order["id"]).execute()
            
            tasks = [update_order(order) for order in section_orders]
            await asyncio.gather(*tasks)
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
                "question_number": question.question_number,
                "validation_rules": question.validation_rules.to_dict() if question.validation_rules else None,
                "conditional_logic": [c.to_dict() for c in question.conditional_logic] if question.conditional_logic else None,
                "likert_config": question.likert_config.to_dict() if question.likert_config else None,
                "ranking_config": question.ranking_config.to_dict() if question.ranking_config else None,
                "repeatable_config": question.repeatable_config,
            }
            
            result = self.client.table("questions").insert(data).execute()
            
            if result.data:
                return self._map_to_question(result.data[0])
            raise Exception("문항 생성 실패")
        except Exception as e:
            logger.error(f"문항 생성 실패: {e}")
            raise
    
    async def create_questions_batch(self, questions: List[Question]) -> List[Question]:
        """여러 질문을 한 번에 생성 (배치 최적화)"""
        self._ensure_client()
        try:
            if not questions:
                return []
            
            data = [
                {
                    "section_id": str(question.section_id),
                    "type": question.type.value,
                    "title": question.title,
                    "description": question.description,
                    "required": question.required,
                    "order_index": question.order_index,
                    "is_hidden": question.is_hidden,
                    "question_number": question.question_number,
                    "validation_rules": question.validation_rules.to_dict() if question.validation_rules else None,
                    "conditional_logic": [c.to_dict() for c in question.conditional_logic] if question.conditional_logic else None,
                    "likert_config": question.likert_config.to_dict() if question.likert_config else None,
                    "ranking_config": question.ranking_config.to_dict() if question.ranking_config else None,
                    "repeatable_config": question.repeatable_config,
                }
                for question in questions
            ]
            
            result = self.client.table("questions").insert(data).execute()
            return [self._map_to_question(row) for row in result.data]
        except Exception as e:
            logger.error(f"문항 배치 생성 실패: {e}")
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
                "question_number": question.question_number,
                "validation_rules": question.validation_rules.to_dict() if question.validation_rules else None,
                "conditional_logic": [c.to_dict() for c in question.conditional_logic] if question.conditional_logic else None,
                "likert_config": question.likert_config.to_dict() if question.likert_config else None,
                "ranking_config": question.ranking_config.to_dict() if question.ranking_config else None,
                "repeatable_config": question.repeatable_config,
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
            # 병렬 처리로 최적화
            async def update_order(order: dict):
                self.client.table("questions").update({"order_index": order["order_index"]}).eq("id", order["id"]).execute()
            
            tasks = [update_order(order) for order in question_orders]
            await asyncio.gather(*tasks)
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
            description_pages=data.get("description_pages"),
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
            first_page_content=data.get("first_page_content"),
            completion_content=data.get("completion_content"),
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
            question_number=data.get("question_number"),
            validation_rules=ValidationRules.from_dict(data.get("validation_rules")),
            conditional_logic=ConditionalLogic.from_dict_or_list(data.get("conditional_logic")),
            likert_config=LikertConfig.from_dict(data.get("likert_config")),
            ranking_config=RankingConfig.from_dict(data.get("ranking_config")),
            repeatable_config=data.get("repeatable_config"),
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

