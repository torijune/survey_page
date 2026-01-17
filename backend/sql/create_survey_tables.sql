-- 설문조사 웹앱 Supabase 스키마
-- 실행 순서: surveys -> sections -> questions -> question_options -> responses -> response_items

-- 1. surveys 테이블: 설문 기본 정보
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    share_id VARCHAR(50) UNIQUE DEFAULT gen_random_uuid()::text,
    allow_edit BOOLEAN DEFAULT true,
    duplicate_prevention BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. sections 테이블: 섹션(페이지) 정보
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    title VARCHAR(500),
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_conditional BOOLEAN DEFAULT false,
    conditional_logic JSONB, -- {"question_id": "...", "operator": "equals", "value": "..."}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. questions 테이블: 문항 정보
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'single_choice', 'multiple_choice', 'likert', 
        'short_text', 'long_text', 'number', 'date', 'dropdown'
    )),
    title TEXT NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    validation_rules JSONB, -- {"min_length": 0, "max_length": 500, "min_value": 0, "max_value": 100, "pattern": "email"}
    conditional_logic JSONB, -- {"question_id": "...", "operator": "equals", "value": "...", "action": "show"}
    likert_config JSONB, -- {"scale_min": 1, "scale_max": 5, "labels": ["매우 불만족", ..., "매우 만족"], "rows": ["항목1", "항목2"]}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. question_options 테이블: 문항 옵션 (단일/다중선택, 드롭다운용)
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label VARCHAR(500) NOT NULL,
    value VARCHAR(500) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    allow_other BOOLEAN DEFAULT false, -- 기타(직접입력) 허용
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. responses 테이블: 응답 정보
CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    user_info_encrypted TEXT, -- 암호화된 사용자 정보 (중복 제출 방지용)
    user_info_hash VARCHAR(64), -- SHA-256 해시 (빠른 중복 체크용)
    ip_address VARCHAR(45),
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    is_complete BOOLEAN DEFAULT false
);

-- 6. response_items 테이블: 응답 상세
CREATE TABLE IF NOT EXISTS response_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_value JSONB, -- 단일값, 배열, 또는 리커트 응답 객체
    answer_text TEXT, -- 기타(직접입력) 또는 텍스트 응답
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sections_survey_id ON sections(survey_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON sections(survey_id, order_index);
CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(section_id, order_index);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_order ON question_options(question_id, order_index);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_hash ON responses(survey_id, user_info_hash);
CREATE INDEX IF NOT EXISTS idx_response_items_response_id ON response_items(response_id);
CREATE INDEX IF NOT EXISTS idx_response_items_question_id ON response_items(question_id);
CREATE INDEX IF NOT EXISTS idx_surveys_share_id ON surveys(share_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_surveys_updated_at ON surveys;
CREATE TRIGGER update_surveys_updated_at
    BEFORE UPDATE ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sections_updated_at ON sections;
CREATE TRIGGER update_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_response_items_updated_at ON response_items;
CREATE TRIGGER update_response_items_updated_at
    BEFORE UPDATE ON response_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책 - 필요시 활성화
-- ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE response_items ENABLE ROW LEVEL SECURITY;

