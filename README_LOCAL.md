# 로컬 개발 환경 실행 가이드

## 사전 준비

1. **Python 3.9-3.12** 설치 (3.14는 일부 패키지와 호환성 문제가 있을 수 있음)
2. **Node.js 18+** 설치
3. **Supabase 환경변수 설정** (`backend/.env`)

## 1. 백엔드 실행

```bash
# backend 폴더로 이동
cd backend

# 가상환경 생성 (처음 한 번만)
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate  # macOS/Linux
# 또는
# venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt

# 환경변수 확인 (.env 파일이 있는지 확인)
# SUPABASE_URL=...
# SUPABASE_KEY=...

# 서버 실행 (방법 1: 스크립트 사용 - 추천)
./dev.sh

# 또는 프로젝트 루트에서
cd backend && ./dev.sh

# 서버 실행 (방법 2: 직접 명령어)
uvicorn app.main:app --reload --port 8000
```

**성공 시:**
- `http://localhost:8000` 에서 API 확인 가능
- `http://localhost:8000/docs` 에서 Swagger UI 확인 가능
- `http://localhost:8000/health` 에서 헬스체크 가능

**참고:**
- `./dev.sh`: 개발 모드 (코드 변경 시 자동 재시작)
- `./run.sh`: 프로덕션 모드 (자동 재시작 없음)
- 포트 변경: `PORT=8001 ./dev.sh` 또는 환경변수로 설정

## 2. 프론트엔드 실행 (새 터미널)

```bash
# app 폴더로 이동
cd app

# 의존성 설치 (처음 한 번만)
npm install

# 개발 서버 실행
npm run dev
```

**성공 시:**
- `http://localhost:3000` 에서 웹사이트 확인 가능

## 3. 확인 방법

1. **홈페이지**: `http://localhost:3000`
   - "관리자 대시보드" 버튼 클릭

2. **설문 목록**: `http://localhost:3000/admin/surveys`
   - "새 설문 만들기" 버튼으로 설문 생성

3. **API 문서**: `http://localhost:8000/docs`
   - 모든 API 엔드포인트 확인 가능

## 문제 해결

### Python 버전 문제
```bash
# Python 버전 확인
python3 --version

# Python 3.9-3.12 사용 권장
# pyenv로 버전 관리 가능
```

### 포트 충돌
- 백엔드: `--port 8001` 등으로 변경
- 프론트엔드: `next.config.js`에서 `NEXT_PUBLIC_BACKEND_URL` 수정

### Supabase 연결 실패
- `backend/.env` 파일 확인
- Supabase 대시보드에서 프로젝트 상태 확인

