#!/bin/bash

# 백엔드 개발 서버 실행 스크립트

# 현재 스크립트의 디렉토리로 이동
cd "$(dirname "$0")"

# 가상환경 활성화 (있는 경우)
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
fi

# 환경 변수 설정 (있는 경우)
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 포트 설정 (기본값: 8000)
PORT=${PORT:-8000}

echo "🚀 백엔드 서버 시작 중..."
echo "📍 포트: $PORT"
echo "🌐 URL: http://localhost:$PORT"
echo ""

# uvicorn 실행 (개발 모드: reload 활성화)
uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload
