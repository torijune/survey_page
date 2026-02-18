import { apiConfig } from '../config/api';

// ==================== Types ====================

export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
}

export interface ConditionalLogic {
  question_id: string;
  operator: string;
  value: any;
  action: string;
  target_section_id?: string;
}

export interface LikertRowItem {
  text: string;
  image_url?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

export interface LikertConfig {
  scale_min: number;
  scale_max: number;
  labels: string[];
  rows: string[] | LikertRowItem[];
}

export interface RankingConfig {
  max_ranks: number;
  rank_labels: string[];
}

/** 반복 입력 문항: 텍스트·입력 필드·유형 선택이 번갈아 나오는 한 줄. + 버튼으로 행 추가 */
export interface RepeatableInputPart {
  type: 'text' | 'input' | 'select';
  value?: string;   // type === 'text' 일 때 표시할 텍스트
  key?: string;     // type === 'input' | 'select' 일 때 필드 키 (각 행의 객체 키)
  placeholder?: string;
  /** type === 'input' 일 때 입력칸 기본 너비 (ch 단위, 약 8 = 8글자). placeholder/입력 길이에 따라 자동 확장. 미리보기 edit에서 드래그로 조절 */
  inputWidth?: number;
  /** type === 'select' 일 때 앞에 붙는 라벨 (예: "유형") */
  label?: string;
  /** type === 'select' 일 때 선택지. 없으면 기본 "토지 / 건축물" */
  options?: { label: string; value: string }[];
}

export interface RepeatableInputsConfig {
  parts: RepeatableInputPart[];
}

export interface QuestionOption {
  id?: string;
  question_id?: string;
  label: string;
  value: string;
  order_index: number;
  allow_other: boolean;
  created_at?: string;
}

export interface Question {
  id?: string;
  section_id?: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  order_index: number;
  is_hidden?: boolean;
  question_number?: string; // 질문 넘버링 (SQ1, SQ2, A1, A2, B1, B2 등)
  validation_rules?: ValidationRules;
  /** 단일 객체(기존) 또는 배열(여러 조건, AND) */
  conditional_logic?: ConditionalLogic | ConditionalLogic[];
  likert_config?: LikertConfig;
  ranking_config?: RankingConfig;
  repeatable_config?: RepeatableInputsConfig;
  options: QuestionOption[];
  created_at?: string;
  updated_at?: string;
}

export interface Section {
  id?: string;
  survey_id?: string;
  title?: string;
  description?: string;
  order_index: number;
  is_conditional: boolean;
  conditional_logic?: Record<string, any>;
  questions: Question[];
  created_at?: string;
  updated_at?: string;
}

export interface DescriptionPage {
  index: string;  // Desc1, Desc2, ...
  content: string;
}

export interface Survey {
  id?: string;
  title: string;
  description?: string;
  intro_content?: string;
  description_pages?: DescriptionPage[];
  status: string;
  share_id?: string;
  allow_edit: boolean;
  duplicate_prevention: boolean;
  logo_url?: string;
  organization_name?: string;
  organization_subtitle?: string;
  logo_width?: number;
  logo_height?: number;
  text_position?: 'left' | 'right' | 'top' | 'bottom';
  /** 설문지 첫 페이지 콘텐츠 (Markdown). 설명 페이지와 별도로 분리 */
  first_page_content?: string;
  /** 설문 종료(완료) 페이지 콘텐츠 (Markdown, 이미지 지원). 비어 있으면 기본 완료 메시지 표시 */
  completion_content?: string;
  sections: Section[];
  response_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResponseItem {
  id?: string;
  response_id?: string;
  question_id: string;
  answer_value?: any;
  answer_text?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SurveyResponse {
  id?: string;
  survey_id?: string;
  user_info_hash?: string;
  ip_address?: string;
  started_at?: string;
  submitted_at?: string;
  is_complete: boolean;
  items: ResponseItem[];
}

export interface ResponseStatistics {
  total_responses: number;
  question_stats: Record<string, {
    response_count: number;
    value_counts: Record<string, number>;
    text_responses: string[];
    average?: number;
  }>;
}

// ==================== API Functions ====================

const API_BASE = apiConfig.baseURL;

// Survey CRUD
export async function getSurveys(status?: string): Promise<Survey[]> {
  const url = new URL(`${API_BASE}/api/v1/surveys`);
  if (status) url.searchParams.append('status', status);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('설문 목록 조회 실패');
  
  const data = await response.json();
  return data.surveys;
}

export async function getSurvey(surveyId: string): Promise<Survey> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}`);
  if (!response.ok) throw new Error('설문 조회 실패');
  
  const data = await response.json();
  console.log('getSurvey 응답 데이터:', data);
  console.log('로고 URL:', data.logo_url);
  console.log('로고 크기:', data.logo_width, data.logo_height);
  console.log('텍스트 위치:', data.text_position);
  return data;
}

export async function getPublicSurvey(shareId: string): Promise<Survey> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/public/${shareId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '설문을 찾을 수 없습니다.');
  }
  
  return response.json();
}

export async function createSurvey(data: {
  title: string;
  description?: string;
  allow_edit?: boolean;
  duplicate_prevention?: boolean;
}): Promise<Survey> {
  const response = await fetch(`${API_BASE}/api/v1/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('설문 생성 실패');
  return response.json();
}

export async function updateSurvey(surveyId: string, data: {
  title?: string;
  description?: string;
  intro_content?: string;
  description_pages?: DescriptionPage[];
  allow_edit?: boolean;
  duplicate_prevention?: boolean;
  logo_url?: string | null;
  organization_name?: string | null;
  organization_subtitle?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
  text_position?: 'left' | 'right' | 'top' | 'bottom' | null;
  first_page_content?: string | null;
  completion_content?: string | null;
}): Promise<Survey> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('설문 수정 실패');
  return response.json();
}

export async function deleteSurvey(surveyId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) throw new Error('설문 삭제 실패');
}

export async function publishSurvey(surveyId: string): Promise<Survey> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/publish`, {
    method: 'POST',
  });
  
  if (!response.ok) throw new Error('설문 배포 실패');
  return response.json();
}

export async function closeSurvey(surveyId: string): Promise<Survey> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/close`, {
    method: 'POST',
  });
  
  if (!response.ok) throw new Error('설문 마감 실패');
  return response.json();
}

// Section CRUD
export async function createSection(data: {
  survey_id: string;
  title?: string;
  description?: string;
  order_index?: number;
}): Promise<Section> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('섹션 생성 실패');
  return response.json();
}

export async function updateSection(sectionId: string, data: {
  title?: string;
  description?: string;
  order_index?: number;
}): Promise<Section> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/sections/${sectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('섹션 수정 실패');
  return response.json();
}

export async function deleteSection(sectionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/sections/${sectionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) throw new Error('섹션 삭제 실패');
}

export async function reorderSections(surveyId: string, orders: { id: string; order_index: number }[]): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/sections/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orders),
  });
  
  if (!response.ok) throw new Error('섹션 순서 변경 실패');
}

// Question CRUD
export async function createQuestion(data: {
  section_id: string;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  order_index?: number;
  is_hidden?: boolean;
  question_number?: string;
  validation_rules?: ValidationRules;
  conditional_logic?: ConditionalLogic | ConditionalLogic[];
  likert_config?: LikertConfig;
  ranking_config?: RankingConfig;
  repeatable_config?: RepeatableInputsConfig;
  options?: QuestionOption[];
}): Promise<Question> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('문항 생성 실패');
  return response.json();
}

export async function updateQuestion(questionId: string, data: {
  type?: string;
  title?: string;
  description?: string;
  required?: boolean;
  order_index?: number;
  is_hidden?: boolean;
  question_number?: string;
  validation_rules?: ValidationRules;
  conditional_logic?: ConditionalLogic | ConditionalLogic[] | null;
  likert_config?: LikertConfig;
  ranking_config?: RankingConfig | null;
  repeatable_config?: RepeatableInputsConfig | null;
  options?: QuestionOption[];
}): Promise<Question> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/questions/${questionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('문항 수정 실패');
  return response.json();
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/questions/${questionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) throw new Error('문항 삭제 실패');
}

export async function reorderQuestions(sectionId: string, orders: { id: string; order_index: number }[]): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/sections/${sectionId}/questions/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orders),
  });
  
  if (!response.ok) throw new Error('문항 순서 변경 실패');
}

// Response Operations
export async function startResponse(surveyId: string): Promise<SurveyResponse> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/responses/start`, {
    method: 'POST',
  });
  
  if (!response.ok) throw new Error('응답 시작 실패');
  return response.json();
}

export async function submitResponse(responseId: string, data: {
  items: ResponseItem[];
  user_info?: string;
}): Promise<SurveyResponse> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/responses/${responseId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '응답 제출 실패');
  }
  return response.json();
}

export async function updateResponseItems(responseId: string, items: ResponseItem[]): Promise<SurveyResponse> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/responses/${responseId}/items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  
  if (!response.ok) throw new Error('응답 저장 실패');
  return response.json();
}

export async function getSurveyResponses(surveyId: string, includeItems: boolean = false): Promise<SurveyResponse[]> {
  const url = new URL(`${API_BASE}/api/v1/surveys/${surveyId}/responses`);
  url.searchParams.append('include_items', String(includeItems));
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('응답 목록 조회 실패');
  
  const data = await response.json();
  return data.responses;
}

export async function getResponseStatistics(surveyId: string): Promise<ResponseStatistics> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/responses/statistics`);
  if (!response.ok) throw new Error('응답 통계 조회 실패');
  
  return response.json();
}

export async function downloadResponses(surveyId: string, format: 'csv' | 'xlsx' = 'xlsx'): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/responses/download?format=${format}`);
  if (!response.ok) throw new Error('응답 다운로드 실패');
  
  return response.blob();
}

export async function deleteResponse(responseId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/surveys/responses/${responseId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '응답 삭제 실패');
  }
}


// ==================== PDF Import ====================

export interface PDFImportSectionPreview {
  title: string;
  question_count: number;
}

export interface PDFImportResponse {
  success: boolean;
  survey_id: string;
  survey_title: string;
  message: string;
  sections_count: number;
  questions_count: number;
  sections_preview: PDFImportSectionPreview[];
}

export async function importSurveyFromPDF(file: File): Promise<PDFImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/api/v1/surveys/import-from-pdf`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'PDF 설문 가져오기 실패' }));
    throw new Error(error.detail || 'PDF 설문 가져오기 실패');
  }
  
  return response.json();
}

export async function updateSurveyFromPDF(surveyId: string, file: File): Promise<PDFImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/api/v1/surveys/${surveyId}/import-from-pdf`, {
    method: 'PUT',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'PDF 설문 적용 실패' }));
    throw new Error(error.detail || 'PDF 설문 적용 실패');
  }
  
  return response.json();
}


// ==================== Image Upload ====================

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  console.log('이미지 업로드 시작:', file.name, file.size, file.type);
  console.log('API_BASE:', API_BASE);
  
  const response = await fetch(`${API_BASE}/api/v1/surveys/upload-image`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '이미지 업로드 실패' }));
    console.error('이미지 업로드 실패 응답:', error);
    throw new Error(error.detail || '이미지 업로드 실패');
  }
  
  const data = await response.json();
  console.log('이미지 업로드 성공 응답:', data);
  if (!data.url) {
    console.error('응답에 URL이 없음:', data);
    throw new Error('업로드 응답에 URL이 포함되어 있지 않습니다.');
  }
  return data.url;
}
