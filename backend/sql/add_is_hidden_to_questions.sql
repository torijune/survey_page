-- questions 테이블에 is_hidden 필드 추가
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
