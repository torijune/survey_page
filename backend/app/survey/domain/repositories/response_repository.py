from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from uuid import UUID

from ..entities import Response, ResponseItem


class ResponseRepository(ABC):
    """응답 리포지토리 인터페이스"""
    
    # Response CRUD
    @abstractmethod
    async def create_response(self, response: Response) -> Response:
        """응답 생성 (설문 시작)"""
        pass
    
    @abstractmethod
    async def get_response_by_id(self, response_id: UUID, include_items: bool = True) -> Optional[Response]:
        """ID로 응답 조회"""
        pass
    
    @abstractmethod
    async def get_responses_by_survey_id(
        self, 
        survey_id: UUID, 
        include_items: bool = False,
        only_complete: bool = True
    ) -> List[Response]:
        """설문의 모든 응답 조회"""
        pass
    
    @abstractmethod
    async def update_response(self, response: Response) -> Response:
        """응답 수정 (제출 완료 등)"""
        pass
    
    @abstractmethod
    async def delete_response(self, response_id: UUID) -> bool:
        """응답 삭제"""
        pass
    
    @abstractmethod
    async def check_duplicate_response(self, survey_id: UUID, user_info_hash: str) -> bool:
        """중복 응답 체크"""
        pass
    
    @abstractmethod
    async def get_response_count(self, survey_id: UUID, only_complete: bool = True) -> int:
        """설문의 응답 수 조회"""
        pass
    
    # ResponseItem CRUD
    @abstractmethod
    async def create_response_items(self, items: List[ResponseItem]) -> List[ResponseItem]:
        """응답 항목 일괄 생성"""
        pass
    
    @abstractmethod
    async def get_items_by_response_id(self, response_id: UUID) -> List[ResponseItem]:
        """응답의 모든 항목 조회"""
        pass
    
    @abstractmethod
    async def update_response_items(self, response_id: UUID, items: List[ResponseItem]) -> List[ResponseItem]:
        """응답 항목 업데이트 (upsert)"""
        pass
    
    @abstractmethod
    async def delete_response_items(self, response_id: UUID) -> bool:
        """응답의 모든 항목 삭제"""
        pass
    
    # Statistics
    @abstractmethod
    async def get_response_statistics(self, survey_id: UUID) -> Dict[str, Any]:
        """설문 응답 통계 조회"""
        pass
    
    @abstractmethod
    async def get_all_responses_with_items(self, survey_id: UUID) -> List[Response]:
        """설문의 모든 응답과 항목 조회 (다운로드용)"""
        pass

