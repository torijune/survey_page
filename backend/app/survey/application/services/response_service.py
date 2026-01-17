import logging
import hashlib
import json
import io
import csv
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from ...domain.entities import Response, ResponseItem, Survey
from ...domain.repositories import ResponseRepository, SurveyRepository
from ...api.models import ResponseCreateRequest, ResponseSubmitRequest, ResponseItemRequest

logger = logging.getLogger(__name__)


class ResponseService:
    """응답 서비스"""
    
    def __init__(
        self, 
        response_repository: ResponseRepository,
        survey_repository: SurveyRepository
    ):
        self.response_repository = response_repository
        self.survey_repository = survey_repository
    
    async def start_response(self, request: ResponseCreateRequest) -> Response:
        """응답 시작 (빈 응답 생성)"""
        response = Response(
            survey_id=UUID(request.survey_id),
            ip_address=request.ip_address,
            user_agent=request.user_agent,
        )
        return await self.response_repository.create_response(response)
    
    async def submit_response(
        self, 
        response_id: str, 
        request: ResponseSubmitRequest
    ) -> Response:
        """응답 제출"""
        # 응답 조회
        response = await self.response_repository.get_response_by_id(UUID(response_id), include_items=False)
        if not response:
            raise ValueError("응답을 찾을 수 없습니다.")
        
        # 설문 조회
        survey = await self.survey_repository.get_survey_by_id(response.survey_id, include_details=True)
        if not survey:
            raise ValueError("설문을 찾을 수 없습니다.")
        
        # 설문이 응답을 받을 수 있는지 확인
        if not survey.can_accept_responses():
            raise ValueError("이 설문은 현재 응답을 받지 않습니다.")
        
        # 중복 제출 체크
        if survey.duplicate_prevention and request.user_info:
            user_info_hash = self._hash_user_info(request.user_info)
            is_duplicate = await self.response_repository.check_duplicate_response(
                survey.id, user_info_hash
            )
            if is_duplicate:
                raise ValueError("이미 응답을 제출하셨습니다.")
            
            response.user_info_hash = user_info_hash
            response.user_info_encrypted = self._encrypt_user_info(request.user_info)
        
        # 응답 검증
        self._validate_response(survey, request.items)
        
        # 응답 항목 저장
        items = [
            ResponseItem(
                response_id=response.id,
                question_id=UUID(item.question_id),
                answer_value=item.answer_value,
                answer_text=item.answer_text,
            )
            for item in request.items
        ]
        await self.response_repository.update_response_items(response.id, items)
        
        # 응답 완료 처리
        response.submitted_at = datetime.utcnow()
        response.is_complete = True
        
        return await self.response_repository.update_response(response)
    
    async def update_response_items(
        self, 
        response_id: str, 
        items: List[ResponseItemRequest]
    ) -> Response:
        """응답 항목 업데이트 (중간 저장)"""
        response = await self.response_repository.get_response_by_id(UUID(response_id), include_items=False)
        if not response:
            raise ValueError("응답을 찾을 수 없습니다.")
        
        response_items = [
            ResponseItem(
                response_id=response.id,
                question_id=UUID(item.question_id),
                answer_value=item.answer_value,
                answer_text=item.answer_text,
            )
            for item in items
        ]
        await self.response_repository.update_response_items(response.id, response_items)
        
        return await self.response_repository.get_response_by_id(response.id, include_items=True)
    
    async def get_response(self, response_id: str) -> Optional[Response]:
        """응답 조회"""
        return await self.response_repository.get_response_by_id(UUID(response_id), include_items=True)
    
    async def get_survey_responses(
        self, 
        survey_id: str, 
        include_items: bool = False
    ) -> List[Response]:
        """설문의 응답 목록 조회"""
        return await self.response_repository.get_responses_by_survey_id(
            UUID(survey_id), 
            include_items=include_items,
            only_complete=True
        )
    
    async def get_response_statistics(self, survey_id: str) -> Dict[str, Any]:
        """응답 통계 조회"""
        return await self.response_repository.get_response_statistics(UUID(survey_id))
    
    def _get_section_letter(self, section_index: int) -> str:
        """섹션 번호를 A, B, C... 형식으로 변환"""
        return chr(65 + section_index)  # A=65, B=66, C=67...
    
    def _get_question_number(self, survey, question) -> str:
        """문항 번호를 A1, A2, B1... 형식으로 변환"""
        # 섹션 인덱스 찾기
        section_index = -1
        for i, section in enumerate(survey.sections):
            if section.id == question.section_id:
                section_index = i
                break
        
        if section_index == -1:
            return ""
        
        section_letter = self._get_section_letter(section_index)
        
        # 해당 섹션 내에서 문항 인덱스 찾기 (숨겨진 문항 제외)
        section_questions = [q for q in survey.sections[section_index].questions if not getattr(q, 'is_hidden', False)]
        question_index = -1
        for i, q in enumerate(section_questions):
            if q.id == question.id:
                question_index = i
                break
        
        if question_index == -1:
            return ""
        
        return f"{section_letter}{question_index + 1}"
    
    async def generate_csv(self, survey_id: str) -> bytes:
        """CSV 파일 생성"""
        survey = await self.survey_repository.get_survey_by_id(UUID(survey_id), include_details=True)
        if not survey:
            raise ValueError("설문을 찾을 수 없습니다.")
        
        responses = await self.response_repository.get_all_responses_with_items(UUID(survey_id))
        
        # 문항 목록 생성 (숨겨진 문항 제외)
        questions = []
        for section in survey.sections:
            for question in section.questions:
                if not getattr(question, 'is_hidden', False):
                    questions.append(question)
        
        # CSV 생성
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 헤더
        headers = ["응답 ID", "제출 시간"]
        for q in questions:
            question_number = self._get_question_number(survey, q)
            header_title = f"{question_number}. {q.title}" if question_number else q.title
            headers.append(header_title)
        writer.writerow(headers)
        
        # 데이터
        for response in responses:
            row = [str(response.id), response.submitted_at.isoformat() if response.submitted_at else ""]
            
            item_map = {str(item.question_id): item for item in response.items}
            
            for q in questions:
                item = item_map.get(str(q.id))
                if item:
                    if item.answer_text:
                        row.append(item.answer_text)
                    elif item.answer_value is not None:
                        if isinstance(item.answer_value, list):
                            row.append(", ".join(str(v) for v in item.answer_value))
                        elif isinstance(item.answer_value, dict):
                            row.append(json.dumps(item.answer_value, ensure_ascii=False))
                        else:
                            row.append(str(item.answer_value))
                    else:
                        row.append("")
                else:
                    row.append("")
            
            writer.writerow(row)
        
        # UTF-8 BOM 추가
        return ("\ufeff" + output.getvalue()).encode("utf-8")
    
    async def generate_xlsx(self, survey_id: str) -> bytes:
        """XLSX 파일 생성"""
        try:
            import openpyxl
            from openpyxl.utils import get_column_letter
        except ImportError:
            raise ValueError("openpyxl 패키지가 설치되지 않았습니다.")
        
        survey = await self.survey_repository.get_survey_by_id(UUID(survey_id), include_details=True)
        if not survey:
            raise ValueError("설문을 찾을 수 없습니다.")
        
        responses = await self.response_repository.get_all_responses_with_items(UUID(survey_id))
        statistics = await self.response_repository.get_response_statistics(UUID(survey_id))
        
        # 문항 목록 생성 (숨겨진 문항 제외)
        questions = []
        for section in survey.sections:
            for question in section.questions:
                if not getattr(question, 'is_hidden', False):
                    questions.append(question)
        
        wb = openpyxl.Workbook()
        
        # Sheet 1: Raw Data
        ws1 = wb.active
        ws1.title = "응답 데이터"
        
        # 헤더
        headers = ["응답 ID", "제출 시간"]
        for q in questions:
            question_number = self._get_question_number(survey, q)
            header_title = f"{question_number}. {q.title}" if question_number else q.title
            headers.append(header_title)
        ws1.append(headers)
        
        # 데이터
        for response in responses:
            row = [str(response.id), response.submitted_at.isoformat() if response.submitted_at else ""]
            
            item_map = {str(item.question_id): item for item in response.items}
            
            for q in questions:
                item = item_map.get(str(q.id))
                if item:
                    if item.answer_text:
                        row.append(item.answer_text)
                    elif item.answer_value is not None:
                        if isinstance(item.answer_value, list):
                            row.append(", ".join(str(v) for v in item.answer_value))
                        elif isinstance(item.answer_value, dict):
                            row.append(json.dumps(item.answer_value, ensure_ascii=False))
                        else:
                            row.append(str(item.answer_value))
                    else:
                        row.append("")
                else:
                    row.append("")
            
            ws1.append(row)
        
        # Sheet 2: Summary
        ws2 = wb.create_sheet("요약 통계")
        ws2.append(["총 응답 수", statistics["total_responses"]])
        ws2.append([])
        
        for q in questions:
            q_stats = statistics["question_stats"].get(str(q.id), {})
            question_number = self._get_question_number(survey, q)
            question_title = f"{question_number}. {q.title}" if question_number else q.title
            ws2.append([f"문항: {question_title}"])
            ws2.append(["응답 수", q_stats.get("response_count", 0)])
            
            if q_stats.get("average") is not None:
                ws2.append(["평균", round(q_stats["average"], 2)])
            
            value_counts = q_stats.get("value_counts", {})
            if value_counts:
                ws2.append(["값", "빈도"])
                for val, count in value_counts.items():
                    ws2.append([val, count])
            
            ws2.append([])
        
        # 바이트로 변환
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output.getvalue()
    
    def _validate_response(self, survey: Survey, items: List[ResponseItemRequest]) -> None:
        """응답 검증"""
        item_map = {item.question_id: item for item in items}
        
        for section in survey.sections:
            for question in section.questions:
                item = item_map.get(str(question.id))
                
                # 필수 항목 체크
                if question.required:
                    if not item or (item.answer_value is None and not item.answer_text):
                        raise ValueError(f"필수 항목입니다: {question.title}")
                
                # 검증 규칙 체크
                if item and question.validation_rules:
                    rules = question.validation_rules
                    
                    if item.answer_text:
                        text_len = len(item.answer_text)
                        if rules.min_length and text_len < rules.min_length:
                            raise ValueError(f"최소 {rules.min_length}자 이상 입력해주세요: {question.title}")
                        if rules.max_length and text_len > rules.max_length:
                            raise ValueError(f"최대 {rules.max_length}자까지 입력 가능합니다: {question.title}")
                        
                        if rules.pattern == "email":
                            import re
                            if not re.match(r"[^@]+@[^@]+\.[^@]+", item.answer_text):
                                raise ValueError(f"올바른 이메일 형식이 아닙니다: {question.title}")
                    
                    if item.answer_value is not None and isinstance(item.answer_value, (int, float)):
                        if rules.min_value is not None and item.answer_value < rules.min_value:
                            raise ValueError(f"최소값은 {rules.min_value}입니다: {question.title}")
                        if rules.max_value is not None and item.answer_value > rules.max_value:
                            raise ValueError(f"최대값은 {rules.max_value}입니다: {question.title}")
    
    def _hash_user_info(self, user_info: str) -> str:
        """사용자 정보 해시 생성"""
        return hashlib.sha256(user_info.encode()).hexdigest()
    
    def _encrypt_user_info(self, user_info: str) -> str:
        """사용자 정보 암호화 (간단한 구현)"""
        # TODO: 실제 암호화 구현 (cryptography 라이브러리 사용)
        import base64
        return base64.b64encode(user_info.encode()).decode()

