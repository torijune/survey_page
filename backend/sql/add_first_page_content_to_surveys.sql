-- 설문지 첫 페이지 커스텀 콘텐츠 (Markdown, 이미지 지원). 마무리 페이지(completion_content)와 별도로 분리
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS first_page_content TEXT;
