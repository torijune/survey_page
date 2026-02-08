-- questions 테이블에 ranking_config 필드 추가 및 type CHECK 제약조건에 'ranking' 추가

-- 1. ranking_config 컬럼 추가
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ranking_config JSONB;

-- 2. 기존 type CHECK 제약조건 제거 및 재생성 (ranking 타입 추가)
-- questions 테이블의 모든 type 관련 CHECK 제약조건 찾아서 삭제
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- questions 테이블의 type CHECK 제약조건 모두 찾기
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'questions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%type%'
    LOOP
        -- 각 제약조건 삭제
        EXECUTE format('ALTER TABLE questions DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE '제약조건 삭제: %', constraint_record.conname;
    END LOOP;
END $$;

-- 새로운 CHECK 제약조건 생성 (ranking 포함)
ALTER TABLE questions ADD CONSTRAINT questions_type_check 
    CHECK (type IN (
        'single_choice', 'multiple_choice', 'likert', 
        'short_text', 'long_text', 'number', 'date', 'dropdown', 'ranking'
    ));
