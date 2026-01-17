# Supabase 테이블 생성 가이드

## 문제
에러 메시지: `Could not find the table 'public.surveys' in the schema cache`

## 해결 방법

### 1. Supabase 대시보드 접속
1. https://supabase.com 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2. SQL 스크립트 실행
1. **New Query** 버튼 클릭
2. `backend/sql/create_survey_tables.sql` 파일의 전체 내용을 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭 (또는 `Cmd/Ctrl + Enter`)

### 3. 테이블 생성 확인
1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `surveys`
   - `sections`
   - `questions`
   - `question_options`
   - `responses`
   - `response_items`

### 4. 백엔드 재시작
SQL 실행 후 백엔드 서버를 재시작하세요:

```bash
# 터미널에서 Ctrl+C로 중지 후
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

## SQL 파일 위치
`backend/sql/create_survey_tables.sql`

## 참고
- 모든 테이블이 순서대로 생성되어야 합니다 (외래키 제약조건 때문)
- 에러가 발생하면 SQL Editor에서 에러 메시지를 확인하세요

