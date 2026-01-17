-- surveys 테이블에 intro_content 필드 추가 (설문 시작 페이지 콘텐츠)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS intro_content TEXT;
