"""PDF 설문지 파싱 서비스"""
import logging
import io
import json
import re
import hashlib
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    import PyPDF2
    HAS_PDFPLUMBER = False

from app.shared.infra.external.openai_client import get_openai_client

logger = logging.getLogger(__name__)


class PDFParserService:
    """PDF 설문지 파싱 서비스"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    async def parse_survey_from_pdf(self, file: UploadFile) -> Dict[str, Any]:
        """PDF 파일에서 설문 구조 파싱"""
        try:
            # 1. PDF 텍스트 추출
            pdf_text = await self._extract_text_from_pdf(file)
            
            if not pdf_text.strip():
                raise HTTPException(
                    status_code=400,
                    detail="PDF 파일에서 텍스트를 추출할 수 없습니다. 텍스트가 포함된 PDF 파일인지 확인해주세요."
                )
            
            # 2. LLM을 사용한 설문 구조 파싱
            survey_structure = await self._parse_survey_structure(pdf_text)
            
            # 파싱 결과 상세 로깅
            sections = survey_structure.get('sections', [])
            total_questions = sum(len(s.get('questions', [])) for s in sections)
            logger.info(f"설문 구조 파싱 완료: 섹션 {len(sections)}개, 총 문항 {total_questions}개")
            
            # 각 섹션별 문항 수 로깅
            for idx, section in enumerate(sections):
                section_title = section.get('title', f'섹션 {idx + 1}')
                questions = section.get('questions', [])
                logger.info(f"  - {section_title}: {len(questions)}개 문항")
                # 각 문항의 넘버링과 제목 간략히 로깅
                for q_idx, q in enumerate(questions[:5]):  # 처음 5개만
                    q_num = q.get('question_number', '')
                    q_title = q.get('title', '')[:50]  # 처음 50자만
                    logger.info(f"    {q_num}. {q_title}...")
                if len(questions) > 5:
                    logger.info(f"    ... 외 {len(questions) - 5}개 문항")
            
            return survey_structure
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"PDF 설문 파싱 실패: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"PDF 설문 파싱 중 오류가 발생했습니다: {str(e)}"
            )
    
    async def _extract_text_from_pdf(self, file: UploadFile) -> str:
        """PDF 파일에서 텍스트 추출 (pdfplumber 우선 사용, 없으면 PyPDF2 사용)"""
        try:
            content = await file.read()
            
            # pdfplumber가 있으면 사용 (한글 처리에 더 좋음)
            if HAS_PDFPLUMBER:
                text = ""
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    total_pages = len(pdf.pages)
                    logger.info(f"PDF 총 페이지 수: {total_pages}페이지 (pdfplumber 사용)")
                    
                    for page_num, page in enumerate(pdf.pages, 1):
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                            logger.debug(f"페이지 {page_num}/{total_pages} 텍스트 추출 완료 ({len(page_text)} 글자)")
                
                logger.info(f"PDF 텍스트 추출 완료: 총 {total_pages}페이지, {len(text)} 글자 (pdfplumber)")
            else:
                # PyPDF2 사용 (fallback)
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                total_pages = len(pdf_reader.pages)
                logger.info(f"PDF 총 페이지 수: {total_pages}페이지 (PyPDF2 사용)")
                
                text = ""
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                        logger.debug(f"페이지 {page_num}/{total_pages} 텍스트 추출 완료 ({len(page_text)} 글자)")
                
                logger.info(f"PDF 텍스트 추출 완료: 총 {total_pages}페이지, {len(text)} 글자 (PyPDF2)")
            
            # null 문자(\u0000) 제거 - PostgreSQL/Supabase에서 지원하지 않음
            text = text.replace('\x00', '').replace('\u0000', '')
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"PDF 텍스트 추출 실패: {e}")
            raise HTTPException(
                status_code=400,
                detail="PDF 파일 처리 중 오류가 발생했습니다."
            )
    
    async def _parse_survey_structure(self, pdf_text: str) -> Dict[str, Any]:
        """LLM을 사용하여 설문 구조 파싱"""
        try:
            import aiohttp
            import os
            from dotenv import load_dotenv

            load_dotenv()

            api_key = self.api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API Key가 설정되지 않았습니다.")

            logger.info(f"PDF 텍스트 길이: {len(pdf_text)} 글자")

            # GPT-5 입력 토큰을 최대한 활용하되, 한 번의 요청으로 컨텍스트 한계를 넘으면 실패하므로
            # 안전하게 "추정 토큰 예산" 기준으로 chunking 하여 전체 페이지를 빠짐없이 처리한다.
            # (환경변수로 조정 가능, 출력 토큰=completion tokens 기준)
            max_input_tokens = int(os.getenv("GPT5_MAX_INPUT_TOKENS", "120000"))
            max_output_tokens = int(os.getenv("GPT5_MAX_OUTPUT_TOKENS", "16384"))

            est_tokens = self._estimate_tokens(pdf_text)
            logger.info(f"PDF 텍스트 추정 토큰 수: ~{est_tokens} tokens (budget={max_input_tokens})")

            chunks = self._split_text_by_token_budget(pdf_text, max_input_tokens)
            logger.info(f"PDF 텍스트 chunking 결과: {len(chunks)}개")

            # chunk 별로 프롬프트 생성 (part i/n 안내를 추가해 누락을 최소화)
            prompts: List[str] = []
            total_parts = len(chunks)
            for i, chunk in enumerate(chunks, 1):
                part_header = (
                    f"\n\n[PART {i}/{total_parts}]\n"
                    f"- 이 파트에 포함된 질문/선택지만 JSON에 포함하세요.\n"
                    f"- 다른 파트에 있는 질문은 절대 포함하지 마세요.\n"
                    f"- 원본 텍스트를 절대 요약/재작성하지 마세요.\n"
                )
                prompts.append(self._create_parsing_prompt(chunk) + part_header)

            logger.info(f"프롬프트 개수: {len(prompts)}개")
            if prompts:
                logger.info(f"프롬프트(1번) 길이: {len(prompts[0])} 글자")

            # PDF 파싱은 긴 응답이 필요하므로 max_tokens를 크게 설정
            # 동일한 PDF 텍스트에 대해 input caching 사용 (비용 절감)
            # PDF 텍스트의 해시를 계산해서 캐시 ID로 사용
            pdf_text_hash = hashlib.sha256(pdf_text.encode('utf-8')).hexdigest()[:16]
            cache_id = f"survey-{pdf_text_hash}"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "OpenAI-Beta": f"cache=ephemeral-{cache_id}"  # Input caching 활성화
            }
            
            logger.info(f"Input caching 활성화: cache_id={cache_id}")

            data = {
                "model": "gpt-5",
                "messages": [
                    {"role": "system", "content": "당신은 설문조사 문서를 분석하는 전문가입니다. 정확하고 완전한 JSON 형식으로 응답해야 합니다. 주어진 PART의 모든 질문을 빠짐없이 포함해야 합니다."},
                    # user 메시지는 아래에서 part 별로 설정
                ]
            }

            connector = aiohttp.TCPConnector(ssl=False)
            partial_structures: List[Dict[str, Any]] = []

            async with aiohttp.ClientSession(connector=connector) as session:
                for part_idx, prompt in enumerate(prompts, 1):
                    logger.info(f"LLM 파싱 요청 시작: PART {part_idx}/{len(prompts)}")

                    part_data = dict(data)
                    part_data["messages"] = [
                        {"role": "system", "content": "당신은 설문조사 문서를 분석하는 전문가입니다. 정확하고 완전한 JSON 형식으로 응답해야 합니다. 주어진 PART의 모든 질문을 빠짐없이 포함해야 합니다."},
                        {"role": "user", "content": prompt}
                    ]

                    async with session.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json=part_data
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            logger.error(f"OpenAI API 오류(PART {part_idx}): {response.status} - {error_text}")
                            raise Exception(f"OpenAI API 오류: {response.status}")

                        result = await response.json()
                        llm_response = result["choices"][0]["message"]["content"]

                        finish_reason = result.get("choices", [{}])[0].get("finish_reason")
                        if finish_reason == "length":
                            logger.error(f"⚠️ LLM 응답이 토큰 제한으로 잘렸습니다! PART {part_idx} 응답이 불완전할 수 있습니다. GPT5_MAX_OUTPUT_TOKENS를 늘려보세요.")
                        elif finish_reason == "stop":
                            logger.info(f"✅ LLM 응답이 정상적으로 완료되었습니다. (PART {part_idx})")
                        else:
                            logger.warning(f"LLM 응답 완료 이유(PART {part_idx}): {finish_reason}")

                        if not llm_response or not llm_response.strip():
                            raise ValueError(f"LLM 응답이 비어있습니다. (PART {part_idx})")

                        logger.info(f"LLM 응답 받음(PART {part_idx}) (길이: {len(llm_response)} 글자)")

                        # JSON 추출 및 파싱
                        part_structure = self._extract_json_from_response(llm_response)
                        partial_structures.append(part_structure)

            # part 결과 병합
            survey_structure = self._merge_partial_structures(partial_structures)

            # 파싱된 구조의 섹션 수 확인
            sections_count = len(survey_structure.get('sections', []))
            total_questions_parsed = sum(len(s.get('questions', [])) for s in survey_structure.get('sections', []))
            logger.info(f"JSON 파싱 완료: 섹션 {sections_count}개, 총 문항 {total_questions_parsed}개")

            # 구조 검증 및 정규화
            normalized_structure = self._normalize_survey_structure(survey_structure)

            return normalized_structure

        except ValueError as e:
            logger.error(f"설문 구조 파싱 실패 (값 오류): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"설문 구조 파싱 실패: {str(e)}"
            )
        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 실패: {e}")
            raise HTTPException(
                status_code=500,
                detail="설문 구조를 파싱하는데 실패했습니다. 다른 형식의 PDF를 시도해주세요."
            )
        except Exception as e:
            logger.error(f"설문 구조 파싱 실패: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"설문 구조 파싱 중 오류가 발생했습니다: {str(e)}"
            )

    def _estimate_tokens(self, text: str) -> int:
        """아주 거친 토큰 수 추정치(안전하게 크게 잡기).
        - 영어/숫자/공백 위주: ~4 chars/token
        - 한글/중국어 등 CJK 포함: ~2 chars/token
        정확한 토크나이저가 없으므로 보수적으로 추정해 초과를 방지한다.
        """
        if not text:
            return 0
        # CJK(한글/한자/가나) 포함 여부
        has_cjk = bool(re.search(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]", text))
        chars = len(text)
        return int(chars / (2.0 if has_cjk else 4.0)) + 1

    def _split_text_by_token_budget(self, text: str, max_tokens: int) -> List[str]:
        """텍스트를 max_tokens(추정치) 이하로 안전 분할.
        문단/줄바꿈 단위로 최대한 자연스럽게 잘라 LLM 파싱 안정성을 높인다.
        """
        if not text:
            return [""]

        # 빠른 경로
        if self._estimate_tokens(text) <= max_tokens:
            return [text]

        # 줄 단위로 쪼개서 누적
        lines = text.splitlines(keepends=True)
        chunks: List[str] = []
        buf: List[str] = []
        buf_tokens = 0

        for line in lines:
            line_tokens = self._estimate_tokens(line)

            # 한 줄이 예산을 초과하는 경우: 강제 분할(문자 단위)
            if line_tokens > max_tokens:
                # 먼저 버퍼를 비우고
                if buf:
                    chunks.append("".join(buf))
                    buf = []
                    buf_tokens = 0

                # 큰 줄을 안전하게 잘라 담기
                start = 0
                # CJK 여부에 따라 대략 chars/token 비율 역으로 계산
                has_cjk = bool(re.search(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]", line))
                chars_per_token = 2 if has_cjk else 4
                step = max(1000, int(max_tokens * chars_per_token * 0.9))
                while start < len(line):
                    part = line[start:start + step]
                    chunks.append(part)
                    start += step
                continue

            # 버퍼에 추가해도 예산 내면 누적
            if buf_tokens + line_tokens <= max_tokens:
                buf.append(line)
                buf_tokens += line_tokens
            else:
                # 버퍼를 청크로 확정하고 새로 시작
                if buf:
                    chunks.append("".join(buf))
                buf = [line]
                buf_tokens = line_tokens

        if buf:
            chunks.append("".join(buf))

        return [c.strip() for c in chunks if c.strip()]

    def _merge_partial_structures(self, partials: List[Dict[str, Any]]) -> Dict[str, Any]:
        """여러 chunk 파싱 결과를 하나의 설문 구조로 병합한다."""
        merged: Dict[str, Any] = {
            "title": "",
            "description": "",
            "intro_content": "",
            "sections": []
        }

        # 섹션 타이틀 기준으로 병합
        section_map: Dict[str, Dict[str, Any]] = {}

        for idx, p in enumerate(partials):
            if not p:
                continue
            if idx == 0:
                merged["title"] = self._clean_text(p.get("title", "") or "") or merged["title"]
                merged["description"] = self._clean_text(p.get("description", "") or "")
                merged["intro_content"] = self._clean_text(p.get("intro_content", "") or "")
            else:
                # title/description은 첫 chunk 우선
                merged["title"] = merged["title"] or self._clean_text(p.get("title", "") or "")
                merged["description"] = merged["description"] or self._clean_text(p.get("description", "") or "")

            for s in p.get("sections", []) or []:
                st = self._clean_text(s.get("title") or "").strip() or "(untitled)"
                if st not in section_map:
                    section_map[st] = {
                        "title": self._clean_text(s.get("title", "") or "").strip() or st,
                        "description": self._clean_text(s.get("description", "") or ""),
                        "questions": []
                    }
                # 질문 추가 (중복 최소화: question_number+title 기반)
                existing = section_map[st]["questions"]
                existing_keys = set(
                    ( (q.get("question_number") or "").strip(), (q.get("title") or "").strip() )
                    for q in existing
                )
                for q in (s.get("questions") or []):
                    key = ((q.get("question_number") or "").strip(), (q.get("title") or "").strip())
                    if key in existing_keys:
                        continue
                    existing.append(q)
                    existing_keys.add(key)

        merged["sections"] = list(section_map.values())
        return merged
    
    def _create_parsing_prompt(self, pdf_text: str) -> str:
        """설문 파싱을 위한 프롬프트 생성"""
        return f"""
        다음은 PDF에서 추출한 설문지 텍스트입니다. 이 텍스트를 분석하여 설문 구조를 JSON 형식으로 추출해주세요.

        **매우 중요: 모든 페이지의 모든 질문을 빠짐없이 포함해야 합니다.**
        - PDF가 여러 페이지(예: 18페이지)로 구성되어 있어도 모든 질문을 추출해야 합니다.
        - 섹션 A, B, C, D 등 모든 섹션의 모든 질문을 포함해야 합니다.
        - 질문이 많아도 중간에 멈추지 말고 끝까지 모두 추출해야 합니다.

        **중요: 모든 텍스트는 원본 그대로 복사하세요. 절대 재작성하거나 요약하지 마세요.**

        설문지 텍스트:
        ---
        {pdf_text}
        ---

        다음 JSON 형식으로 설문 구조를 추출해주세요:

        **설문 필드 설명 (중요):**
        - "title": 설문 제목 (예: "서울신용보증재단 홈페이지 만족도 설문조사")
        - "description": 설문의 간단한 설명/요약
        - **대부분 비어있습니다. 빈 문자열 ""로 설정하세요.**
        - 설문 제목 아래에 표시되는 짧은 한 줄 설명이 있는 경우에만 사용하세요.
        - "intro_content": 설문 시작 페이지에 표시되는 상세한 안내 문구
        - **이 필드에 설문 시작 전 안내 문구를 모두 포함하세요.**
        - "안녕하세요. 서울신용보증재단..." 같은 인사말과 설문 목적 설명
        - 참여 기간, 참여 혜택, 당첨자 발표, 참여 방법 등 모든 안내 내용
        - 개인정보 처리 방침 안내
        - **이 모든 내용을 원본 그대로 포함하세요 (요약하지 마세요)**
        - 줄바꿈, 공백, 구두점 등 모든 형식을 그대로 유지하세요.

        {{
            "title": "설문 제목",
            "description": "",
            "intro_content": "설문 시작 페이지 내용 (소개 문구, 참여 안내 등 - 원본 그대로)",
            "sections": [
                {{
                    "title": "섹션 제목 (예: A. 홈페이지 방문 현황)",
                    "description": "섹션 설명 (있는 경우)",
                    "questions": [
                        {{
                            "question_number": "질문 넘버링 (예: SQ1, SQ2, A1, A2, B1, B2 등, 있는 경우만)",
                            "title": "문항 제목/질문 내용 (넘버링 제외, 예: SQ1. 질문내용 -> 질문내용만)",
                            "description": "문항 설명 (있는 경우)",
                            "type": "문항 유형",
                            "required": true/false,
                            "options": [
                                {{"label": "선택지 전체 텍스트 (설명, 예시 등 모든 내용 포함)", "value": "1"}},
                                {{"label": "다른 선택지 전체 텍스트 (괄호 안 설명도 모두 포함)", "value": "2"}}
                            ],
                            "likert_config": {{
                                "scale_min": 1,
                                "scale_max": 5,
                                "labels": ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
                                "rows": ["평가 항목1", "평가 항목2"]
                            }}
                        }}
                    ]
                }}
            ]
        }}

        문항 유형(type)은 다음 중 하나를 사용하세요:
        - "single_choice": 단일 선택 (라디오 버튼, 일반적인 선택형 문항)
        - "single_scale": 단일 척도 (척도 형태의 단일 선택, 예: "매우 필요", "다소 필요", "보통", "별로 불필요", "전혀 불필요" 등)
        - "multiple_choice": 다중 선택 (체크박스)
        - "likert": 리커트 척도 (표 형태, 여러 항목을 같은 척도로 평가)
        - "ranking": 순위 선택 (1순위, 2순위 등으로 여러 선택지를 순서대로 선택)
        - "short_text": 단답형 (짧은 텍스트 입력)
        - "long_text": 장문형 (긴 텍스트 입력)
        - "number": 숫자 입력
        - "date": 날짜 선택
        - "dropdown": 드롭다운 선택
        
        **단일 척도(single_scale) 판단 기준:**
        - 선택지가 척도 형태인 경우 (예: "매우 필요", "다소 필요", "보통", "별로 불필요", "전혀 불필요")
        - 또는 (예: "매우 만족", "만족", "보통", "불만족", "매우 불만족")
        - 또는 (예: "전혀 그렇지 않다", "그렇지 않다", "보통", "그렇다", "매우 그렇다")
        - 이런 척도 형태의 선택지가 3개 이상이고, 단일 선택인 경우 "single_scale" 타입을 사용하세요.
        - 일반적인 선택형 문항(예: "예", "아니오", "모르겠다" 등)은 "single_choice"를 사용하세요.

        **중요: 원본 텍스트를 그대로 사용하세요!**
        - 질문 제목(title), 선택지(label), 설명(description) 등 모든 텍스트는 PDF 원본에 있는 그대로 정확히 복사하세요.
        - 의미를 해석하거나 요약하거나 재작성하지 마세요.
        - 단어를 바꾸거나 문장을 다르게 표현하지 마세요.
        - 원본에 있는 모든 문장, 단어, 구두점, 공백을 그대로 유지하세요.
        
        **띄어쓰기 정리 (중요):**
        - PDF 텍스트 추출 과정에서 한글 단어 사이에 불필요한 공백이 삽입될 수 있습니다 (예: "전 문 기 술 직").
        - 이런 경우, 실제 단어로 인식되는 형태로 띄어쓰기를 정리하세요 (예: "전문기술직").
        - 하지만 실제로 띄어쓰기가 필요한 경우는 유지하세요 (예: "서울 신용보증재단" -> "서울 신용보증재단" 유지).
        - 일반적으로 한 단어로 인식되는 명사는 공백 없이, 두 단어 이상으로 구성된 경우는 공백을 유지하세요.
        - 예: "전문기술직", "일반사무직", "경영관리직" (공백 제거)
        - 예: "서울 신용보증재단", "사업 안내 페이지" (공백 유지)

        주의사항:
        1. 섹션이 A, B, C 등으로 구분되어 있으면 각각 별도의 섹션으로 분리하세요.
        2. **질문 넘버링 추출 (중요):**
           - 질문 제목 앞에 SQ1, SQ2, SQ3, A1, A2, B1, B2 등 넘버링이 있으면 이를 `question_number` 필드에 추출하세요.
           - 예: "SQ1. 귀하께서 현재 거주..." -> question_number: "SQ1", title: "귀하께서 현재 거주..."
           - 예: "A1. 귀하께서 서울신용보증재단..." -> question_number: "A1", title: "귀하께서 서울신용보증재단..."
           - 넘버링이 없으면 question_number는 null 또는 빈 문자열로 설정하세요.
           - title에는 넘버링을 제외한 질문 내용만 포함하세요.
        3. 리커트 척도는 여러 항목을 같은 척도로 평가하는 표 형태의 문항입니다. 이 경우 likert_config에 rows(평가 항목들)와 labels(척도 레이블)를 포함하세요.
        4. 순위 선택(ranking)은 "1순위", "2순위" 등으로 여러 선택지를 순서대로 선택하는 문항입니다. 
           - 예: "순서대로 2개까지 말씀해 주세요. (1순위 : ) (2순위 : )" 같은 질문은 ranking 타입으로 설정하세요.
           - ranking 타입인 경우 ranking_config에 max_ranks(최대 순위 개수)와 rank_labels(순위 레이블 배열)를 포함하세요.
           - 예: {{"max_ranks": 2, "rank_labels": ["1순위", "2순위"]}}
           - options 배열에는 선택 가능한 모든 선택지를 포함하세요.
        5. 선택형 문항(single_choice, multiple_choice, dropdown, ranking)은 options 배열을 포함하세요.
        5. **선택지(label)는 원본 PDF에 있는 전체 텍스트를 정확히 그대로 복사하세요.**
        - 절대 요약하거나 재작성하지 마세요.
        - 괄호 안의 설명, 예시, 추가 정보 등 모든 내용을 빠짐없이 포함하세요.
        - 예: "사업 안내 페이지"가 아니라 "사업 안내 페이지 (재단스토리, 주요업무, 소통참여, 알림광장, 정보공개, 열린경영 등)" 전체를 정확히 복사
        - 예: "디지털 종합지원센터"가 아니라 "디지털 종합지원센터 (종합상담 신청, 보증지원, 재기지원, 신용정보 등)" 전체를 정확히 복사
        6. 필수 여부는 문맥상 필수로 보이면 true, 아니면 false로 설정하세요.
        7. **"기타" 선택지 처리 (중요):**
        - PDF에 "기타", "기타(", "기타 (직접 입력)", "기타(직접입력)", "기타 ( )" 등 "기타"로 시작하는 선택지가 있으면:
        - "기타" 선택지를 options에 포함하되, 해당 선택지에 `allow_other: true`를 설정하세요.
        - "기타" 선택지의 label은 원본 그대로 사용하세요 (예: "기타", "기타 ( )", "기타 (직접 입력)" 등).
        - 예: 선택지가 ["선택지1", "선택지2", "기타"]이면, options는 [{{"label": "선택지1", "allow_other": false}}, {{"label": "선택지2", "allow_other": false}}, {{"label": "기타", "allow_other": true}}]가 되어야 합니다.
        - "기타" 선택지가 여러 개 있으면 모든 "기타" 선택지에 allow_other: true를 설정하세요.
        8. **반드시 유효한 JSON만 출력하세요. 다른 설명, 주석, 마크다운 코드 블록 표시는 포함하지 마세요.**
        - JSON 객체는 {{ 로 시작하고 }} 로 끝나야 합니다.
        - JSON 형식이 올바른지 확인하세요.
        - 출력은 순수 JSON만 포함해야 합니다.

        다음과 같은 형식으로 출력하세요 (마크다운 코드 블록 없이):
        {{
            "title": "...",
            "sections": [...]
        }}"""

    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """LLM 응답에서 JSON 추출"""
        if not response or not response.strip():
            raise ValueError("LLM 응답이 비어있습니다.")
        
        original_response = response
        response = response.strip()
        
        # ```json ... ``` 형식 처리
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end > start:
                response = response[start:end].strip()
        elif "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end > start:
                response = response[start:end].strip()
        
        # JSON 객체 시작/끝 찾기
        if not response.startswith("{"):
            # { 로 시작하지 않으면 찾기
            start_idx = response.find("{")
            if start_idx >= 0:
                response = response[start_idx:]
            else:
                logger.error(f"JSON 객체를 찾을 수 없습니다. 응답 시작 부분: {response[:200]}")
                raise ValueError("JSON 객체를 찾을 수 없습니다.")
        
        # 중첩된 괄호 처리
        depth = 0
        end_idx = len(response)
        for i, char in enumerate(response):
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    end_idx = i + 1
                    break
        
        if depth != 0:
            logger.warning(f"JSON 괄호가 맞지 않습니다. depth={depth}, 응답 일부: {response[:500]}")
            # 불완전한 JSON 자동 복구 시도
            if depth > 0:
                # 닫히지 않은 괄호가 있으면 자동으로 닫기
                json_str = response[:end_idx].strip() + "}" * depth
                logger.warning(f"불완전한 JSON 감지: {depth}개의 닫는 괄호 추가 시도")
            else:
                # 열리지 않은 괄호가 있으면 그대로 시도
                json_str = response[:end_idx].strip()
        else:
            json_str = response[:end_idx].strip()
        
        # JSON 파싱 시도
        try:
            parsed = json.loads(json_str)
            logger.debug(f"JSON 파싱 성공: {len(str(parsed))} 문자")
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 실패: {e}")
            logger.error(f"파싱 시도한 JSON 문자열 (처음 1000자): {json_str[:1000]}")
            logger.error(f"파싱 시도한 JSON 문자열 (마지막 500자): {json_str[-500:] if len(json_str) > 500 else json_str}")
            logger.error(f"원본 응답 (처음 2000자): {original_response[:2000]}")
            
            # JSON 수정 시도 (일부 일반적인 문제 해결)
            # 1. 따옴표 문제 해결 시도
            json_str_fixed = json_str.replace("'", '"')  # 작은따옴표를 큰따옴표로
            try:
                parsed = json.loads(json_str_fixed)
                logger.warning("작은따옴표를 큰따옴표로 변경하여 파싱 성공")
                return parsed
            except:
                pass
            
            # 2. 불완전한 문자열 자동 닫기 시도
            # 마지막에 닫히지 않은 문자열이 있는 경우
            if "Unterminated string" in str(e):
                # 마지막 따옴표 찾기
                last_quote_idx = json_str.rfind('"')
                if last_quote_idx > 0:
                    # 마지막 따옴표 이후의 내용을 제거하고 닫기
                    json_str_fixed = json_str[:last_quote_idx+1]
                    # 닫히지 않은 구조 닫기
                    open_braces = json_str_fixed.count('{') - json_str_fixed.count('}')
                    open_brackets = json_str_fixed.count('[') - json_str_fixed.count(']')
                    if open_braces > 0:
                        json_str_fixed += "}" * open_braces
                    if open_brackets > 0:
                        json_str_fixed += "]" * open_brackets
                    try:
                        parsed = json.loads(json_str_fixed)
                        logger.warning("불완전한 문자열을 자동으로 닫아서 파싱 성공")
                        return parsed
                    except:
                        pass
            
            raise ValueError(f"JSON 파싱 실패: {str(e)}. LLM 응답이 유효한 JSON 형식이 아닙니다.")
    
    def _clean_text(self, text: str) -> str:
        """텍스트에서 null 문자 및 기타 문제가 되는 문자 제거"""
        if not text:
            return ""
        # null 문자 제거 (PostgreSQL/Supabase에서 지원하지 않음)
        cleaned = text.replace('\x00', '').replace('\u0000', '')
        return cleaned
    
    def _normalize_survey_structure(self, structure: Dict[str, Any]) -> Dict[str, Any]:
        """설문 구조 정규화 및 검증"""
        normalized = {
            "title": self._clean_text(structure.get("title", "가져온 설문") or ""),
            "description": self._clean_text(structure.get("description", "") or ""),
            "intro_content": self._clean_text(structure.get("intro_content", "") or ""),
            "sections": []
        }
        
        sections = structure.get("sections", [])
        
        section_order = 0
        for section_idx, section in enumerate(sections):
            questions = section.get("questions", [])
            
            # 문항이 없는 빈 섹션은 제외
            if not questions or len(questions) == 0:
                continue
            
            # 제목이 있고 문항이 있는 섹션만 포함
            section_title = self._clean_text(section.get("title", "") or "").strip()
            section_description = self._clean_text(section.get("description", "") or "")
            # 제목이 없거나 "섹션 1" 같은 기본 제목만 있고 실제 문항이 없는 경우 제외
            valid_questions = []
            for q in questions:
                q_title = self._clean_text(q.get("title", "") or "").strip()
                # 제목이 있는 문항만 포함
                if q_title:
                    valid_questions.append(q)
            
            # 유효한 문항이 없는 섹션은 제외
            if len(valid_questions) == 0:
                continue
            
            normalized_section = {
                "title": section_title if section_title else f"섹션 {section_order + 1}",
                "description": section_description,
                "order_index": section_order,
                "questions": []
            }
            
            for q_idx, question in enumerate(valid_questions):
                normalized_question = self._normalize_question(question, q_idx)
                normalized_section["questions"].append(normalized_question)
            
            normalized["sections"].append(normalized_section)
            section_order += 1
        
        return normalized
    
    def _normalize_question(self, question: Dict[str, Any], order_index: int) -> Dict[str, Any]:
        """문항 정규화"""
        q_type = question.get("type", "short_text")
        
        # 유효한 타입인지 확인
        valid_types = ["single_choice", "single_scale", "multiple_choice", "likert", "ranking", "short_text", "long_text", "number", "date", "dropdown"]
        if q_type not in valid_types:
            q_type = "short_text"
        
        # 질문 넘버링 추출
        question_number = self._clean_text(question.get("question_number", "") or "").strip() if question.get("question_number") else None
        if not question_number:
            question_number = None
        
        normalized = {
            "title": self._clean_text(question.get("title", "") or ""),
            "description": self._clean_text(question.get("description", "") or ""),
            "type": q_type,
            "required": question.get("required", False),
            "order_index": order_index,
            "question_number": question_number,
            "options": [],
            "likert_config": None,
            "ranking_config": None,
            "validation_rules": None,
            "conditional_logic": None
        }
        
        # 선택형 문항 옵션 처리
        if q_type in ["single_choice", "single_scale", "multiple_choice", "dropdown", "ranking"]:
            options = question.get("options", [])
            normalized["options"] = []
            
            # 모든 선택지를 처리
            processed_options = []
            for opt_idx, opt in enumerate(options):
                # 선택지 label 추출
                label = ""
                if isinstance(opt, dict):
                    label = opt.get("label", str(opt_idx + 1))
                    allow_other = opt.get("allow_other", False)
                else:
                    label = str(opt)
                    allow_other = False
                
                # null 문자 제거
                label = self._clean_text(label or "")
                
                # 숫자 제거 (원형 숫자, 일반 숫자, 괄호 숫자 등)
                # ①, ②, ③, ④, ⑤, ⑥, ⑦, ⑧, ⑨, ⑩ 제거
                label = re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩]\s*', '', label)
                # 1., 2., 3. 등 제거
                label = re.sub(r'^\d+\.\s*', '', label)
                # (1), (2), (3) 등 제거
                label = re.sub(r'^\(\d+\)\s*', '', label)
                # 앞뒤 공백 제거
                label = label.strip()
                
                # "기타" 선택지 감지 및 정규화 (다양한 패턴)
                is_other = False
                if label:
                    label_lower = label.lower()
                    # "기타"로 시작하는지 확인 (다양한 패턴)
                    if (label_lower.startswith("기타") or 
                        label_lower.startswith("other") or
                        label_lower == "기타" or
                        label_lower.startswith("기타(") or
                        label_lower.startswith("기타 (")):
                        is_other = True
                        # "기타" 선택지는 "기타"로 정규화 (괄호와 공백 제거)
                        # "기타 ( )", "기타 (직접 입력)", "기타(직접입력)" 등 -> "기타"
                        label = "기타"
                        logger.info(f"기타 선택지 발견 및 정규화: 원본 '{label_lower}' -> '기타'")
                
                # "기타" 선택지인 경우 allow_other를 true로 설정
                if is_other:
                    allow_other = True
                # LLM이 이미 allow_other를 설정한 경우는 유지
                elif allow_other:
                    logger.info(f"LLM이 설정한 allow_other 유지: '{label}'")
                
                # 모든 선택지 추가 (기타 포함)
                processed_options.append({
                    "label": label if label else str(opt_idx + 1),
                    "value": opt.get("value", str(opt_idx + 1)) if isinstance(opt, dict) else str(opt_idx + 1),
                    "order_index": len(processed_options),
                    "allow_other": allow_other
                })
            
            normalized["options"] = processed_options
        
        # 리커트 척도 설정 처리
        if q_type == "likert":
            likert_config = question.get("likert_config", {})
            normalized["likert_config"] = {
                "scale_min": likert_config.get("scale_min", 1),
                "scale_max": likert_config.get("scale_max", 5),
                "labels": likert_config.get("labels", ["매우 불만족", "불만족", "보통", "만족", "매우 만족"]),
                "rows": likert_config.get("rows", [])
            }
        
        # 순위 선택 설정 처리
        if q_type == "ranking":
            ranking_config = question.get("ranking_config", {})
            max_ranks = ranking_config.get("max_ranks", 2)
            rank_labels = ranking_config.get("rank_labels", [f"{i+1}순위" for i in range(max_ranks)])
            normalized["ranking_config"] = {
                "max_ranks": max_ranks,
                "rank_labels": rank_labels
            }
        
        return normalized


def get_pdf_parser_service(api_key: Optional[str] = None) -> PDFParserService:
    """PDF 파서 서비스 인스턴스 반환"""
    return PDFParserService(api_key=api_key)
