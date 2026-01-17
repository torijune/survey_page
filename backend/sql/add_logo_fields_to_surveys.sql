-- surveys 테이블에 로고 관련 필드 추가
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS organization_subtitle TEXT;
