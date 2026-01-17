from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from ..entities import Survey, Section, Question, QuestionOption


class SurveyRepository(ABC):
    """설문 리포지토리 인터페이스"""
    
    # Survey CRUD
    @abstractmethod
    async def create_survey(self, survey: Survey) -> Survey:
        """설문 생성"""
        pass
    
    @abstractmethod
    async def get_survey_by_id(self, survey_id: UUID, include_details: bool = True) -> Optional[Survey]:
        """ID로 설문 조회 (섹션, 문항 포함 여부 선택)"""
        pass
    
    @abstractmethod
    async def get_survey_by_share_id(self, share_id: str, include_details: bool = True) -> Optional[Survey]:
        """공유 ID로 설문 조회"""
        pass
    
    @abstractmethod
    async def get_all_surveys(self, status: Optional[str] = None) -> List[Survey]:
        """모든 설문 목록 조회"""
        pass
    
    @abstractmethod
    async def update_survey(self, survey: Survey) -> Survey:
        """설문 수정"""
        pass
    
    @abstractmethod
    async def delete_survey(self, survey_id: UUID) -> bool:
        """설문 삭제"""
        pass
    
    @abstractmethod
    async def update_survey_status(self, survey_id: UUID, status: str) -> Survey:
        """설문 상태 변경 (배포/마감)"""
        pass
    
    # Section CRUD
    @abstractmethod
    async def create_section(self, section: Section) -> Section:
        """섹션 생성"""
        pass
    
    @abstractmethod
    async def get_sections_by_survey_id(self, survey_id: UUID) -> List[Section]:
        """설문의 모든 섹션 조회"""
        pass
    
    @abstractmethod
    async def update_section(self, section: Section) -> Section:
        """섹션 수정"""
        pass
    
    @abstractmethod
    async def delete_section(self, section_id: UUID) -> bool:
        """섹션 삭제"""
        pass
    
    @abstractmethod
    async def reorder_sections(self, survey_id: UUID, section_orders: List[dict]) -> bool:
        """섹션 순서 변경"""
        pass
    
    # Question CRUD
    @abstractmethod
    async def create_question(self, question: Question) -> Question:
        """문항 생성"""
        pass
    
    @abstractmethod
    async def get_questions_by_section_id(self, section_id: UUID) -> List[Question]:
        """섹션의 모든 문항 조회"""
        pass
    
    @abstractmethod
    async def update_question(self, question: Question) -> Question:
        """문항 수정"""
        pass
    
    @abstractmethod
    async def delete_question(self, question_id: UUID) -> bool:
        """문항 삭제"""
        pass
    
    @abstractmethod
    async def reorder_questions(self, section_id: UUID, question_orders: List[dict]) -> bool:
        """문항 순서 변경"""
        pass
    
    # QuestionOption CRUD
    @abstractmethod
    async def create_question_options(self, options: List[QuestionOption]) -> List[QuestionOption]:
        """문항 옵션 일괄 생성"""
        pass
    
    @abstractmethod
    async def get_options_by_question_id(self, question_id: UUID) -> List[QuestionOption]:
        """문항의 모든 옵션 조회"""
        pass
    
    @abstractmethod
    async def update_question_options(self, question_id: UUID, options: List[QuestionOption]) -> List[QuestionOption]:
        """문항 옵션 일괄 업데이트 (기존 삭제 후 재생성)"""
        pass
    
    @abstractmethod
    async def delete_question_options(self, question_id: UUID) -> bool:
        """문항의 모든 옵션 삭제"""
        pass

