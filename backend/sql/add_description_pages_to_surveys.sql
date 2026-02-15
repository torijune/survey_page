-- surveys 테이블에 description_pages 필드 추가 (여러 설명 페이지 지원)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS description_pages JSONB;

-- description_pages는 다음과 같은 형식의 배열입니다:
-- [{"index": "Desc1", "content": "설명 내용 1"}, {"index": "Desc2", "content": "설명 내용 2"}, ...]
