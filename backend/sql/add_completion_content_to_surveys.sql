-- 설문 종료(완료) 페이지 커스텀 콘텐츠 (Markdown, 이미지 지원)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS completion_content TEXT;
