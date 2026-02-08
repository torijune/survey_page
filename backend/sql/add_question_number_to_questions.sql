-- questions 테이블에 question_number 필드 추가 (SQ1, SQ2, A1, A2, B1, B2 등)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_number VARCHAR(20);
