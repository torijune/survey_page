"""PDF 설문지 파싱 서비스"""
import logging
import io
import json
import re
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException
import PyPDF2

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
            
            logger.info(f"PDF 텍스트 추출 완료: {len(pdf_text)} 글자")
            
            # 2. LLM을 사용한 설문 구조 파싱
            survey_structure = await self._parse_survey_structure(pdf_text)
            
            logger.info(f"설문 구조 파싱 완료: 섹션 {len(survey_structure.get('sections', []))}개")
            
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
        """PDF 파일에서 텍스트 추출"""
        try:
            content = await file.read()
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
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
            
            prompt = self._create_parsing_prompt(pdf_text)
            
            # PDF 파싱은 긴 응답이 필요하므로 max_tokens를 크게 설정
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "당신은 설문조사 문서를 분석하는 전문가입니다. 정확하고 완전한 JSON 형식으로 응답해야 합니다."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 16000,  # 긴 설문을 위해 토큰 제한 증가
                "temperature": 0.0  # 일관성을 위해 낮은 temperature
            }
            
            connector = aiohttp.TCPConnector(ssl=False)
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        llm_response = result["choices"][0]["message"]["content"]
                        
                        # 응답이 잘렸는지 확인
                        if result.get("choices", [{}])[0].get("finish_reason") == "length":
                            logger.warning("LLM 응답이 토큰 제한으로 잘렸습니다. 응답이 불완전할 수 있습니다.")
                        
                        llm_response_text = llm_response
                    else:
                        error_text = await response.text()
                        logger.error(f"OpenAI API 오류: {response.status} - {error_text}")
                        raise Exception(f"OpenAI API 오류: {response.status}")
            
            if not llm_response_text or not llm_response_text.strip():
                raise ValueError("LLM 응답이 비어있습니다.")
            
            logger.info(f"LLM 응답 받음 (길이: {len(llm_response_text)}): {llm_response_text[:500]}")
            
            # JSON 파싱
            survey_structure = self._extract_json_from_response(llm_response_text)
            
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
    
    def _create_parsing_prompt(self, pdf_text: str) -> str:
        """설문 파싱을 위한 프롬프트 생성"""
        return f"""다음은 PDF에서 추출한 설문지 텍스트입니다. 이 텍스트를 분석하여 설문 구조를 JSON 형식으로 추출해주세요.

**중요: 모든 텍스트는 원본 그대로 복사하세요. 절대 재작성하거나 요약하지 마세요.**

설문지 텍스트:
---
{pdf_text[:15000]}
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
                    "title": "문항 제목/질문 내용",
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
- "single_choice": 단일 선택 (라디오 버튼)
- "multiple_choice": 다중 선택 (체크박스)
- "likert": 리커트 척도 (표 형태, 여러 항목을 같은 척도로 평가)
- "short_text": 단답형 (짧은 텍스트 입력)
- "long_text": 장문형 (긴 텍스트 입력)
- "number": 숫자 입력
- "date": 날짜 선택
- "dropdown": 드롭다운 선택

**중요: 원본 텍스트를 그대로 사용하세요!**
- 질문 제목(title), 선택지(label), 설명(description) 등 모든 텍스트는 PDF 원본에 있는 그대로 정확히 복사하세요.
- 의미를 해석하거나 요약하거나 재작성하지 마세요.
- 단어를 바꾸거나 문장을 다르게 표현하지 마세요.
- 원본에 있는 모든 문장, 단어, 구두점, 공백을 그대로 유지하세요.

주의사항:
1. 섹션이 A, B, C 등으로 구분되어 있으면 각각 별도의 섹션으로 분리하세요.
2. 문항 번호(A1, A2, B1 등)는 title에 포함하지 마세요. 번호는 자동으로 부여됩니다.
3. 리커트 척도는 여러 항목을 같은 척도로 평가하는 표 형태의 문항입니다. 이 경우 likert_config에 rows(평가 항목들)와 labels(척도 레이블)를 포함하세요.
4. 선택형 문항(single_choice, multiple_choice, dropdown)은 options 배열을 포함하세요.
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
    
    def _normalize_survey_structure(self, structure: Dict[str, Any]) -> Dict[str, Any]:
        """설문 구조 정규화 및 검증"""
        normalized = {
            "title": structure.get("title", "가져온 설문"),
            "description": structure.get("description", ""),
            "intro_content": structure.get("intro_content", ""),
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
            section_title = section.get("title", "").strip()
            # 제목이 없거나 "섹션 1" 같은 기본 제목만 있고 실제 문항이 없는 경우 제외
            valid_questions = []
            for q in questions:
                q_title = q.get("title", "").strip()
                # 제목이 있는 문항만 포함
                if q_title:
                    valid_questions.append(q)
            
            # 유효한 문항이 없는 섹션은 제외
            if len(valid_questions) == 0:
                continue
            
            normalized_section = {
                "title": section_title if section_title else f"섹션 {section_order + 1}",
                "description": section.get("description", ""),
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
        valid_types = ["single_choice", "multiple_choice", "likert", "short_text", "long_text", "number", "date", "dropdown"]
        if q_type not in valid_types:
            q_type = "short_text"
        
        normalized = {
            "title": question.get("title", ""),
            "description": question.get("description", ""),
            "type": q_type,
            "required": question.get("required", False),
            "order_index": order_index,
            "options": [],
            "likert_config": None,
            "validation_rules": None,
            "conditional_logic": None
        }
        
        # 선택형 문항 옵션 처리
        if q_type in ["single_choice", "multiple_choice", "dropdown"]:
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
                
                # 숫자 제거 (원형 숫자, 일반 숫자, 괄호 숫자 등)
                # ①, ②, ③, ④, ⑤, ⑥, ⑦, ⑧, ⑨, ⑩ 제거
                label = re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩]\s*', '', label)
                # 1., 2., 3. 등 제거
                label = re.sub(r'^\d+\.\s*', '', label)
                # (1), (2), (3) 등 제거
                label = re.sub(r'^\(\d+\)\s*', '', label)
                # 앞뒤 공백 제거
                label = label.strip()
                
                # "기타" 선택지 감지 (다양한 패턴)
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
                
                # "기타" 선택지인 경우 allow_other를 true로 설정
                if is_other:
                    allow_other = True
                    logger.info(f"기타 선택지 발견: '{label}', allow_other 설정")
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
        
        return normalized


def get_pdf_parser_service(api_key: Optional[str] = None) -> PDFParserService:
    """PDF 파서 서비스 인스턴스 반환"""
    return PDFParserService(api_key=api_key)
