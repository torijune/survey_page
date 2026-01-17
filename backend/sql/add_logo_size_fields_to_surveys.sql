-- surveys 테이블에 로고 크기 및 텍스트 위치 필드 추가
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS logo_width INTEGER;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS logo_height INTEGER;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS text_position TEXT;
