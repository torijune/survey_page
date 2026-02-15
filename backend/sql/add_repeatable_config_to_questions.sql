-- questions 테이블에 repeatable_config 필드 추가 및 type CHECK 제약조건에 'repeatable_inputs' 추가

-- 1. repeatable_config 컬럼 추가
ALTER TABLE questions ADD COLUMN IF NOT EXISTS repeatable_config JSONB;

-- 2. 기존 type CHECK 제약조건 제거 및 재생성 (repeatable_inputs 타입 추가)
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'questions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%type%'
    LOOP
        EXECUTE format('ALTER TABLE questions DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE '제약조건 삭제: %', constraint_record.conname;
    END LOOP;
END $$;

ALTER TABLE questions ADD CONSTRAINT questions_type_check
    CHECK (type IN (
        'single_choice', 'single_scale', 'multiple_choice', 'likert', 'ranking',
        'short_text', 'long_text', 'number', 'date', 'dropdown', 'repeatable_inputs'
    ));
