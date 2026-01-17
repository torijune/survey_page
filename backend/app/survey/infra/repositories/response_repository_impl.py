import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from collections import defaultdict

from ...domain.entities import Response, ResponseItem
from ...domain.repositories import ResponseRepository
from ..external.supabase_client import survey_supabase_client

logger = logging.getLogger(__name__)


class ResponseRepositoryImpl(ResponseRepository):
    """Supabase 기반 응답 리포지토리 구현"""
    
    def __init__(self):
        self.client = survey_supabase_client.get_client()
    
    def _ensure_client(self):
        if not self.client:
            raise Exception("Supabase 클라이언트가 초기화되지 않았습니다.")
    
    # ==================== Response CRUD ====================
    
    async def create_response(self, response: Response) -> Response:
        self._ensure_client()
        try:
            data = {
                "survey_id": str(response.survey_id),
                "user_info_encrypted": response.user_info_encrypted,
                "user_info_hash": response.user_info_hash,
                "ip_address": response.ip_address,
                "user_agent": response.user_agent,
                "is_complete": response.is_complete,
            }
            
            result = self.client.table("responses").insert(data).execute()
            
            if result.data:
                return self._map_to_response(result.data[0])
            raise Exception("응답 생성 실패")
        except Exception as e:
            logger.error(f"응답 생성 실패: {e}")
            raise
    
    async def get_response_by_id(self, response_id: UUID, include_items: bool = True) -> Optional[Response]:
        self._ensure_client()
        try:
            result = self.client.table("responses").select("*").eq("id", str(response_id)).execute()
            
            if not result.data:
                return None
            
            response = self._map_to_response(result.data[0])
            
            if include_items:
                response.items = await self.get_items_by_response_id(response_id)
            
            return response
        except Exception as e:
            logger.error(f"응답 조회 실패: {e}")
            raise
    
    async def get_responses_by_survey_id(
        self, 
        survey_id: UUID, 
        include_items: bool = False,
        only_complete: bool = True
    ) -> List[Response]:
        self._ensure_client()
        try:
            query = self.client.table("responses").select("*").eq("survey_id", str(survey_id)).order("submitted_at", desc=True)
            
            if only_complete:
                query = query.eq("is_complete", True)
            
            result = query.execute()
            
            responses = [self._map_to_response(row) for row in result.data]
            
            if include_items:
                for response in responses:
                    response.items = await self.get_items_by_response_id(response.id)
            
            return responses
        except Exception as e:
            logger.error(f"응답 목록 조회 실패: {e}")
            raise
    
    async def update_response(self, response: Response) -> Response:
        self._ensure_client()
        try:
            data = {
                "user_info_encrypted": response.user_info_encrypted,
                "user_info_hash": response.user_info_hash,
                "submitted_at": response.submitted_at.isoformat() if response.submitted_at else None,
                "is_complete": response.is_complete,
            }
            
            result = self.client.table("responses").update(data).eq("id", str(response.id)).execute()
            
            if result.data:
                return self._map_to_response(result.data[0])
            raise Exception("응답 수정 실패")
        except Exception as e:
            logger.error(f"응답 수정 실패: {e}")
            raise
    
    async def delete_response(self, response_id: UUID) -> bool:
        self._ensure_client()
        try:
            self.client.table("responses").delete().eq("id", str(response_id)).execute()
            return True
        except Exception as e:
            logger.error(f"응답 삭제 실패: {e}")
            raise
    
    async def check_duplicate_response(self, survey_id: UUID, user_info_hash: str) -> bool:
        self._ensure_client()
        try:
            result = self.client.table("responses").select("id").eq("survey_id", str(survey_id)).eq("user_info_hash", user_info_hash).eq("is_complete", True).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"중복 응답 체크 실패: {e}")
            raise
    
    async def get_response_count(self, survey_id: UUID, only_complete: bool = True) -> int:
        self._ensure_client()
        try:
            query = self.client.table("responses").select("id", count="exact").eq("survey_id", str(survey_id))
            
            if only_complete:
                query = query.eq("is_complete", True)
            
            result = query.execute()
            return result.count if result.count else 0
        except Exception as e:
            logger.error(f"응답 수 조회 실패: {e}")
            raise
    
    # ==================== ResponseItem CRUD ====================
    
    async def create_response_items(self, items: List[ResponseItem]) -> List[ResponseItem]:
        self._ensure_client()
        try:
            data = [
                {
                    "response_id": str(item.response_id),
                    "question_id": str(item.question_id),
                    "answer_value": item.answer_value,
                    "answer_text": item.answer_text,
                }
                for item in items
            ]
            
            result = self.client.table("response_items").insert(data).execute()
            return [self._map_to_response_item(row) for row in result.data]
        except Exception as e:
            logger.error(f"응답 항목 생성 실패: {e}")
            raise
    
    async def get_items_by_response_id(self, response_id: UUID) -> List[ResponseItem]:
        self._ensure_client()
        try:
            result = self.client.table("response_items").select("*").eq("response_id", str(response_id)).execute()
            return [self._map_to_response_item(row) for row in result.data]
        except Exception as e:
            logger.error(f"응답 항목 조회 실패: {e}")
            raise
    
    async def update_response_items(self, response_id: UUID, items: List[ResponseItem]) -> List[ResponseItem]:
        self._ensure_client()
        try:
            # 기존 항목 삭제 후 재생성 (upsert)
            await self.delete_response_items(response_id)
            
            if items:
                for item in items:
                    item.response_id = response_id
                return await self.create_response_items(items)
            return []
        except Exception as e:
            logger.error(f"응답 항목 업데이트 실패: {e}")
            raise
    
    async def delete_response_items(self, response_id: UUID) -> bool:
        self._ensure_client()
        try:
            self.client.table("response_items").delete().eq("response_id", str(response_id)).execute()
            return True
        except Exception as e:
            logger.error(f"응답 항목 삭제 실패: {e}")
            raise
    
    # ==================== Statistics ====================
    
    async def get_response_statistics(self, survey_id: UUID) -> Dict[str, Any]:
        self._ensure_client()
        try:
            # 완료된 응답만 조회
            responses = await self.get_responses_by_survey_id(survey_id, include_items=True, only_complete=True)
            
            if not responses:
                return {
                    "total_responses": 0,
                    "question_stats": {}
                }
            
            # 문항별 통계 계산
            question_stats = defaultdict(lambda: {
                "response_count": 0,
                "value_counts": defaultdict(int),
                "text_responses": [],
                "numeric_values": [],
            })
            
            for response in responses:
                for item in response.items:
                    q_id = str(item.question_id)
                    question_stats[q_id]["response_count"] += 1
                    
                    if item.answer_value is not None:
                        if isinstance(item.answer_value, list):
                            for val in item.answer_value:
                                question_stats[q_id]["value_counts"][str(val)] += 1
                        elif isinstance(item.answer_value, dict):
                            # 리커트 응답
                            for row_key, val in item.answer_value.items():
                                question_stats[q_id]["value_counts"][f"{row_key}:{val}"] += 1
                                if isinstance(val, (int, float)):
                                    question_stats[q_id]["numeric_values"].append(val)
                        elif isinstance(item.answer_value, (int, float)):
                            question_stats[q_id]["numeric_values"].append(item.answer_value)
                            question_stats[q_id]["value_counts"][str(item.answer_value)] += 1
                        else:
                            question_stats[q_id]["value_counts"][str(item.answer_value)] += 1
                    
                    if item.answer_text:
                        question_stats[q_id]["text_responses"].append(item.answer_text)
            
            # 평균 계산
            for q_id, stats in question_stats.items():
                if stats["numeric_values"]:
                    stats["average"] = sum(stats["numeric_values"]) / len(stats["numeric_values"])
                stats["value_counts"] = dict(stats["value_counts"])
            
            return {
                "total_responses": len(responses),
                "question_stats": dict(question_stats)
            }
        except Exception as e:
            logger.error(f"응답 통계 조회 실패: {e}")
            raise
    
    async def get_all_responses_with_items(self, survey_id: UUID) -> List[Response]:
        """설문의 모든 응답과 항목 조회 (다운로드용)"""
        return await self.get_responses_by_survey_id(survey_id, include_items=True, only_complete=True)
    
    # ==================== Mappers ====================
    
    def _map_to_response(self, data: dict) -> Response:
        return Response(
            id=UUID(data["id"]),
            survey_id=UUID(data["survey_id"]),
            user_info_encrypted=data.get("user_info_encrypted"),
            user_info_hash=data.get("user_info_hash"),
            ip_address=data.get("ip_address"),
            user_agent=data.get("user_agent"),
            started_at=datetime.fromisoformat(data["started_at"].replace("Z", "+00:00")) if data.get("started_at") else None,
            submitted_at=datetime.fromisoformat(data["submitted_at"].replace("Z", "+00:00")) if data.get("submitted_at") else None,
            is_complete=data.get("is_complete", False),
        )
    
    def _map_to_response_item(self, data: dict) -> ResponseItem:
        return ResponseItem(
            id=UUID(data["id"]),
            response_id=UUID(data["response_id"]),
            question_id=UUID(data["question_id"]),
            answer_value=data.get("answer_value"),
            answer_text=data.get("answer_text"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if data.get("created_at") else None,
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")) if data.get("updated_at") else None,
        )

