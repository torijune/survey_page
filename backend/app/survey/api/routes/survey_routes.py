import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
import io
import os
from datetime import datetime
from uuid import uuid4

from ..models import (
    SurveyCreateRequest, SurveyUpdateRequest, SurveyResponse, SurveyListResponse,
    SectionCreateRequest, SectionUpdateRequest, SectionResponse,
    QuestionCreateRequest, QuestionUpdateRequest, QuestionResponse,
    ResponseCreateRequest, ResponseSubmitRequest, ResponseItemRequest,
    ResponseResponse, ResponseListResponse, ResponseStatisticsResponse,
    PDFImportResponse, PDFImportSectionPreview,
)
from ...application.services import SurveyService, ResponseService, get_pdf_parser_service
from ...infra.repositories import SurveyRepositoryImpl, ResponseRepositoryImpl

logger = logging.getLogger(__name__)

router = APIRouter()

# 서비스 인스턴스 생성
survey_repo = SurveyRepositoryImpl()
response_repo = ResponseRepositoryImpl()
survey_service = SurveyService(survey_repo)
response_service = ResponseService(response_repo, survey_repo)

# Supabase 클라이언트 (이미지 업로드용)
from ...infra.external.supabase_client import survey_supabase_client


# ==================== Survey Endpoints ====================

@router.get("/", response_model=SurveyListResponse)
async def get_surveys(status: Optional[str] = Query(None)):
    """설문 목록 조회"""
    try:
        surveys = await survey_service.get_all_surveys(status)
        return SurveyListResponse(
            surveys=[_map_survey_response(s) for s in surveys],
            total=len(surveys)
        )
    except Exception as e:
        logger.error(f"설문 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=SurveyResponse)
async def create_survey(request: SurveyCreateRequest):
    """설문 생성"""
    try:
        survey = await survey_service.create_survey(request)
        return _map_survey_response(survey)
    except Exception as e:
        logger.error(f"설문 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{survey_id}", response_model=SurveyResponse)
async def get_survey(survey_id: str):
    """설문 조회"""
    try:
        survey = await survey_service.get_survey(survey_id)
        if not survey:
            raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
        return _map_survey_response(survey)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"설문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{survey_id}", response_model=SurveyResponse)
async def update_survey(survey_id: str, request: SurveyUpdateRequest):
    """설문 수정"""
    try:
        survey = await survey_service.update_survey(survey_id, request)
        return _map_survey_response(survey)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"설문 수정 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{survey_id}")
async def delete_survey(survey_id: str):
    """설문 삭제"""
    try:
        await survey_service.delete_survey(survey_id)
        return {"message": "설문이 삭제되었습니다."}
    except Exception as e:
        logger.error(f"설문 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{survey_id}/publish", response_model=SurveyResponse)
async def publish_survey(survey_id: str):
    """설문 배포"""
    try:
        survey = await survey_service.publish_survey(survey_id)
        return _map_survey_response(survey)
    except Exception as e:
        logger.error(f"설문 배포 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{survey_id}/close", response_model=SurveyResponse)
async def close_survey(survey_id: str):
    """설문 마감"""
    try:
        survey = await survey_service.close_survey(survey_id)
        return _map_survey_response(survey)
    except Exception as e:
        logger.error(f"설문 마감 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public/{share_id}", response_model=SurveyResponse)
async def get_public_survey(share_id: str):
    """공개 설문 조회 (응답자용)"""
    try:
        survey = await survey_service.get_survey_by_share_id(share_id)
        if not survey:
            raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
        if not survey.can_accept_responses():
            raise HTTPException(status_code=400, detail="이 설문은 현재 응답을 받지 않습니다.")
        return _map_survey_response(survey)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공개 설문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Section Endpoints ====================

@router.post("/sections", response_model=SectionResponse)
async def create_section(request: SectionCreateRequest):
    """섹션 생성"""
    try:
        section = await survey_service.create_section(request)
        return _map_section_response(section)
    except Exception as e:
        logger.error(f"섹션 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sections/{section_id}", response_model=SectionResponse)
async def update_section(section_id: str, request: SectionUpdateRequest):
    """섹션 수정"""
    try:
        section = await survey_service.update_section(section_id, request)
        return _map_section_response(section)
    except Exception as e:
        logger.error(f"섹션 수정 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sections/{section_id}")
async def delete_section(section_id: str):
    """섹션 삭제"""
    try:
        await survey_service.delete_section(section_id)
        return {"message": "섹션이 삭제되었습니다."}
    except Exception as e:
        logger.error(f"섹션 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{survey_id}/sections/reorder")
async def reorder_sections(survey_id: str, section_orders: List[dict]):
    """섹션 순서 변경"""
    try:
        await survey_service.reorder_sections(survey_id, section_orders)
        return {"message": "섹션 순서가 변경되었습니다."}
    except Exception as e:
        logger.error(f"섹션 순서 변경 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Question Endpoints ====================

@router.post("/questions", response_model=QuestionResponse)
async def create_question(request: QuestionCreateRequest):
    """문항 생성"""
    try:
        question = await survey_service.create_question(request)
        return _map_question_response(question)
    except Exception as e:
        logger.error(f"문항 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, request: QuestionUpdateRequest):
    """문항 수정"""
    try:
        question = await survey_service.update_question(question_id, request)
        return _map_question_response(question)
    except Exception as e:
        logger.error(f"문항 수정 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str):
    """문항 삭제"""
    try:
        await survey_service.delete_question(question_id)
        return {"message": "문항이 삭제되었습니다."}
    except Exception as e:
        logger.error(f"문항 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sections/{section_id}/questions/reorder")
async def reorder_questions(section_id: str, question_orders: List[dict]):
    """문항 순서 변경"""
    try:
        await survey_service.reorder_questions(section_id, question_orders)
        return {"message": "문항 순서가 변경되었습니다."}
    except Exception as e:
        logger.error(f"문항 순서 변경 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Response Endpoints ====================

@router.post("/{survey_id}/responses/start", response_model=ResponseResponse)
async def start_response(survey_id: str, request: Request):
    """응답 시작"""
    try:
        create_request = ResponseCreateRequest(
            survey_id=survey_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        response = await response_service.start_response(create_request)
        return _map_response_response(response)
    except Exception as e:
        logger.error(f"응답 시작 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/responses/{response_id}/submit", response_model=ResponseResponse)
async def submit_response(response_id: str, request: ResponseSubmitRequest):
    """응답 제출"""
    try:
        response = await response_service.submit_response(response_id, request)
        return _map_response_response(response)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"응답 제출 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/responses/{response_id}/items")
async def update_response_items(response_id: str, items: List[ResponseItemRequest]):
    """응답 항목 업데이트 (중간 저장)"""
    try:
        response = await response_service.update_response_items(response_id, items)
        return _map_response_response(response)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"응답 항목 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{survey_id}/responses", response_model=ResponseListResponse)
async def get_survey_responses(survey_id: str, include_items: bool = Query(False)):
    """설문의 응답 목록 조회"""
    try:
        responses = await response_service.get_survey_responses(survey_id, include_items)
        return ResponseListResponse(
            responses=[_map_response_response(r) for r in responses],
            total=len(responses)
        )
    except Exception as e:
        logger.error(f"응답 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{survey_id}/responses/statistics", response_model=ResponseStatisticsResponse)
async def get_response_statistics(survey_id: str):
    """응답 통계 조회"""
    try:
        stats = await response_service.get_response_statistics(survey_id)
        return stats
    except Exception as e:
        logger.error(f"응답 통계 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{survey_id}/responses/download")
async def download_responses(survey_id: str, format: str = Query("xlsx")):
    """응답 다운로드 (CSV/XLSX)"""
    try:
        if format == "csv":
            data = await response_service.generate_csv(survey_id)
            return StreamingResponse(
                io.BytesIO(data),
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f"attachment; filename=responses_{survey_id}.csv"
                }
            )
        else:
            data = await response_service.generate_xlsx(survey_id)
            return StreamingResponse(
                io.BytesIO(data),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=responses_{survey_id}.xlsx"
                }
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"응답 다운로드 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Image Upload ====================

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """이미지 업로드"""
    try:
        # 파일 검증
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다.")
        
        # 파일 크기 제한 (10MB)
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="이미지 크기는 10MB 이하여야 합니다.")
        
        # Supabase Storage에 업로드
        client = survey_supabase_client.get_client()
        if not client:
            raise HTTPException(status_code=500, detail="Supabase 클라이언트가 초기화되지 않았습니다.")
        
        # 파일명 생성 (UUID + 원본 확장자)
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        file_name = f"{uuid4()}.{file_ext}"
        file_path = f"survey-images/{file_name}"
        
        # Storage에 업로드
        result = client.storage.from_("survey-images").upload(
            file_path,
            contents,
            file_options={"content-type": file.content_type}
        )
        
        # Public URL 생성
        public_url = client.storage.from_("survey-images").get_public_url(file_path)
        
        return {"url": public_url, "path": file_path}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"이미지 업로드 실패: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")


# ==================== PDF Import ====================

@router.post("/import-from-pdf", response_model=PDFImportResponse)
async def import_survey_from_pdf(file: UploadFile = File(...)):
    """PDF 설문지에서 설문 가져오기"""
    try:
        # 파일 검증
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
        
        logger.info(f"PDF 설문 가져오기 시작: {file.filename}")
        
        # PDF 파서 서비스 생성
        pdf_parser = get_pdf_parser_service()
        
        # PDF 파싱
        survey_structure = await pdf_parser.parse_survey_from_pdf(file)
        
        # 설문 생성
        survey_request = SurveyCreateRequest(
            title=survey_structure.get("title", "가져온 설문"),
            description=survey_structure.get("description", ""),
            intro_content=survey_structure.get("intro_content", ""),
        )
        survey = await survey_service.create_survey(survey_request)
        
        total_questions = 0
        sections_preview = []
        
        # 섹션 및 문항 생성
        section_order = 0
        for section_data in survey_structure.get("sections", []):
            questions = section_data.get("questions", [])
            
            # 문항이 없는 빈 섹션은 건너뛰기
            if not questions or len(questions) == 0:
                continue
            
            # 제목이 있는 유효한 문항만 필터링
            valid_questions = []
            for question_data in questions:
                q_title = question_data.get("title", "").strip()
                # 제목이 있고 빈 문자열이 아닌 문항만 포함
                if q_title:
                    valid_questions.append(question_data)
            
            # 유효한 문항이 없는 섹션은 건너뛰기
            if len(valid_questions) == 0:
                continue
            
            # 섹션 생성
            section_request = SectionCreateRequest(
                survey_id=str(survey.id),
                title=section_data.get("title", ""),
                description=section_data.get("description", ""),
                order_index=section_order,
            )
            section = await survey_service.create_section(section_request)
            
            question_count = 0
            
            # 문항 생성
            for q_idx, question_data in enumerate(valid_questions):
                question_request = QuestionCreateRequest(
                    section_id=str(section.id),
                    type=question_data.get("type", "short_text"),
                    title=question_data.get("title", ""),
                    description=question_data.get("description", ""),
                    required=question_data.get("required", False),
                    order_index=q_idx,
                    options=[
                        {
                            "label": opt.get("label", ""),
                            "value": opt.get("value", ""),
                            "order_index": opt.get("order_index", 0),
                            "allow_other": opt.get("allow_other", False),
                        }
                        for opt in question_data.get("options", [])
                    ] if question_data.get("options") else None,
                    likert_config=question_data.get("likert_config"),
                )
                await survey_service.create_question(question_request)
                question_count += 1
                total_questions += 1
            
            # 문항이 생성된 섹션만 미리보기에 추가
            if question_count > 0:
                sections_preview.append(PDFImportSectionPreview(
                    title=section_data.get("title", f"섹션 {section_order + 1}"),
                    question_count=question_count,
                ))
                section_order += 1
        
        logger.info(f"PDF 설문 가져오기 완료: 설문 ID {survey.id}, 섹션 {len(sections_preview)}개, 문항 {total_questions}개")
        
        return PDFImportResponse(
            success=True,
            survey_id=str(survey.id),
            survey_title=survey.title,
            message=f"PDF에서 설문을 성공적으로 가져왔습니다. 섹션 {len(sections_preview)}개, 문항 {total_questions}개가 생성되었습니다.",
            sections_count=len(sections_preview),
            questions_count=total_questions,
            sections_preview=sections_preview,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF 설문 가져오기 실패: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 설문 가져오기 실패: {str(e)}")


@router.put("/{survey_id}/import-from-pdf", response_model=PDFImportResponse)
async def update_survey_from_pdf(survey_id: str, file: UploadFile = File(...)):
    """기존 설문에 PDF 설문지 적용 (기존 섹션/문항 삭제 후 재생성)"""
    try:
        # 파일 검증
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
        
        logger.info(f"기존 설문에 PDF 적용 시작: 설문 ID {survey_id}, 파일 {file.filename}")
        
        # 기존 설문 확인
        existing_survey = await survey_service.get_survey(survey_id, include_details=True)
        if not existing_survey:
            raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
        
        # PDF 파서 서비스 생성
        pdf_parser = get_pdf_parser_service()
        
        # PDF 파싱
        survey_structure = await pdf_parser.parse_survey_from_pdf(file)
        
        # 기존 섹션 모두 삭제 (CASCADE로 문항도 자동 삭제됨)
        from uuid import UUID
        existing_sections = await survey_service.survey_repository.get_sections_by_survey_id(UUID(survey_id))
        for section in existing_sections:
            await survey_service.delete_section(str(section.id))
        
        logger.info(f"기존 섹션 {len(existing_sections)}개 삭제 완료")
        
        # 설문 정보 업데이트 (제목, 설명, intro_content)
        await survey_service.update_survey(survey_id, SurveyUpdateRequest(
            title=survey_structure.get("title", existing_survey.title),
            description=survey_structure.get("description", existing_survey.description),
            intro_content=survey_structure.get("intro_content", existing_survey.intro_content),
        ))
        
        total_questions = 0
        sections_preview = []
        
        # 섹션 및 문항 생성
        section_order = 0
        for section_data in survey_structure.get("sections", []):
            questions = section_data.get("questions", [])
            
            # 문항이 없는 빈 섹션은 건너뛰기
            if not questions or len(questions) == 0:
                continue
            
            # 제목이 있는 유효한 문항만 필터링
            valid_questions = []
            for question_data in questions:
                q_title = question_data.get("title", "").strip()
                # 제목이 있고 빈 문자열이 아닌 문항만 포함
                if q_title:
                    valid_questions.append(question_data)
            
            # 유효한 문항이 없는 섹션은 건너뛰기
            if len(valid_questions) == 0:
                continue
            
            # 섹션 생성
            section_request = SectionCreateRequest(
                survey_id=survey_id,
                title=section_data.get("title", ""),
                description=section_data.get("description", ""),
                order_index=section_order,
            )
            section = await survey_service.create_section(section_request)
            
            question_count = 0
            
            # 문항 생성
            for q_idx, question_data in enumerate(valid_questions):
                question_request = QuestionCreateRequest(
                    section_id=str(section.id),
                    type=question_data.get("type", "short_text"),
                    title=question_data.get("title", ""),
                    description=question_data.get("description", ""),
                    required=question_data.get("required", False),
                    order_index=q_idx,
                    options=[
                        {
                            "label": opt.get("label", ""),
                            "value": opt.get("value", ""),
                            "order_index": opt.get("order_index", 0),
                            "allow_other": opt.get("allow_other", False),
                        }
                        for opt in question_data.get("options", [])
                    ] if question_data.get("options") else None,
                    likert_config=question_data.get("likert_config"),
                )
                await survey_service.create_question(question_request)
                question_count += 1
                total_questions += 1
            
            # 문항이 생성된 섹션만 미리보기에 추가
            if question_count > 0:
                sections_preview.append(PDFImportSectionPreview(
                    title=section_data.get("title", f"섹션 {section_order + 1}"),
                    question_count=question_count,
                ))
                section_order += 1
        
        # 업데이트된 설문 정보 가져오기
        updated_survey = await survey_service.get_survey(survey_id, include_details=False)
        
        logger.info(f"기존 설문에 PDF 적용 완료: 설문 ID {survey_id}, 섹션 {len(sections_preview)}개, 문항 {total_questions}개")
        
        return PDFImportResponse(
            success=True,
            survey_id=survey_id,
            survey_title=updated_survey.title if updated_survey else existing_survey.title,
            message=f"PDF에서 설문을 성공적으로 적용했습니다. 섹션 {len(sections_preview)}개, 문항 {total_questions}개가 생성되었습니다.",
            sections_count=len(sections_preview),
            questions_count=total_questions,
            sections_preview=sections_preview,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기존 설문에 PDF 적용 실패: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 설문 적용 실패: {str(e)}")


# ==================== Response Mappers ====================

def _map_survey_response(survey) -> SurveyResponse:
    return SurveyResponse(
        id=str(survey.id),
        title=survey.title,
        description=survey.description,
        intro_content=survey.intro_content,
        status=survey.status.value,
        share_id=survey.share_id,
        allow_edit=survey.allow_edit,
        duplicate_prevention=survey.duplicate_prevention,
        logo_url=survey.logo_url,
        organization_name=survey.organization_name,
        organization_subtitle=survey.organization_subtitle,
        sections=[_map_section_response(s) for s in survey.sections],
        response_count=survey.response_count,
        created_at=survey.created_at,
        updated_at=survey.updated_at,
    )


def _map_section_response(section) -> SectionResponse:
    return SectionResponse(
        id=str(section.id),
        survey_id=str(section.survey_id),
        title=section.title,
        description=section.description,
        order_index=section.order_index,
        is_conditional=section.is_conditional,
        conditional_logic=section.conditional_logic,
        questions=[_map_question_response(q) for q in section.questions],
        created_at=section.created_at,
        updated_at=section.updated_at,
    )


def _map_question_response(question) -> QuestionResponse:
    return QuestionResponse(
        id=str(question.id),
        section_id=str(question.section_id),
        type=question.type.value,
        title=question.title,
        description=question.description,
        required=question.required,
        order_index=question.order_index,
        is_hidden=question.is_hidden,
        validation_rules=question.validation_rules.to_dict() if question.validation_rules else None,
        conditional_logic=question.conditional_logic.to_dict() if question.conditional_logic else None,
        likert_config=question.likert_config.to_dict() if question.likert_config else None,
        options=[
            {
                "id": str(opt.id),
                "question_id": str(opt.question_id),
                "label": opt.label,
                "value": opt.value,
                "order_index": opt.order_index,
                "allow_other": opt.allow_other,
                "created_at": opt.created_at,
            }
            for opt in question.options
        ],
        created_at=question.created_at,
        updated_at=question.updated_at,
    )


def _map_response_response(response) -> ResponseResponse:
    return ResponseResponse(
        id=str(response.id),
        survey_id=str(response.survey_id),
        user_info_hash=response.user_info_hash,
        ip_address=response.ip_address,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        is_complete=response.is_complete,
        items=[
            {
                "id": str(item.id),
                "response_id": str(item.response_id),
                "question_id": str(item.question_id),
                "answer_value": item.answer_value,
                "answer_text": item.answer_text,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in response.items
        ],
    )


# ==================== Image Upload ====================

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """이미지 업로드"""
    try:
        # 파일 유형 검증
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 가능)")
        
        # 파일 크기 검증 (5MB 제한)
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 5MB 이하만 가능합니다.")
        
        # 파일명 생성
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"survey-images/{uuid4()}.{ext}"
        
        # Supabase Storage에 업로드
        supabase = survey_supabase_client.get_client()
        result = supabase.storage.from_("survey-assets").upload(
            filename,
            contents,
            file_options={"content-type": file.content_type}
        )
        
        # 공개 URL 생성
        public_url = supabase.storage.from_("survey-assets").get_public_url(filename)
        
        return {"url": public_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"이미지 업로드 실패: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")

