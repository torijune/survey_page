    -- questions 테이블의 type CHECK 제약조건에 'single_scale' 추가
    -- 기존 제약조건을 삭제하고 새로운 제약조건을 추가

    -- 1. 기존 type CHECK 제약조건 모두 찾아서 삭제
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

    -- 2. 새로운 CHECK 제약조건 생성 (single_scale 포함)
    ALTER TABLE questions ADD CONSTRAINT questions_type_check 
        CHECK (type IN (
            'single_choice', 
            'single_scale', 
            'multiple_choice', 
            'likert', 
            'ranking',
            'short_text', 
            'long_text', 
            'number', 
            'date', 
            'dropdown'
        ));
