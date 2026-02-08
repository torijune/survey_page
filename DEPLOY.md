# 배포 가이드

## 📋 배포 전 확인사항

1. **AWS CLI 설정 확인**
   ```bash
   aws sts get-caller-identity
   ```
   - AWS 계정 정보가 정상적으로 출력되어야 합니다.

2. **Docker 실행 확인**
   ```bash
   docker info
   ```
   - Docker Desktop이 실행 중이어야 합니다.

---

## 🚀 백엔드 배포 (Lambda)

### 배포 스크립트 실행

```bash
cd backend
chmod +x deploy-lambda.sh
./deploy-lambda.sh
```

### 배포 과정

1. **ECR 로그인** - Docker 이미지를 업로드하기 위한 인증
2. **ECR 리포지토리 확인/생성** - `survey-backend` 리포지토리
3. **Docker 이미지 빌드** - `Dockerfile.lambda` 기반으로 빌드
4. **ECR에 이미지 푸시** - 빌드된 이미지를 ECR에 업로드
5. **Lambda 함수 업데이트** - 새 이미지로 Lambda 함수 코드 업데이트
6. **Function URL 확인** - 배포된 Lambda URL 출력

### 예상 소요 시간
- **5~10분** (Docker 빌드 + ECR 푸시 + Lambda 업데이트)

### 배포 후 확인

```bash
# Lambda Function URL 확인
aws lambda get-function-url-config \
  --function-name survey-lambda \
  --region us-east-1 \
  --query 'FunctionUrl' \
  --output text
```

---

## 🌐 프론트엔드 배포 (S3 + CloudFront)

### 배포 스크립트 실행

```bash
cd app
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

### 배포 과정

1. **S3 버킷 확인/생성** - `survey-frontend-339712972404`
2. **Next.js 빌드** - `npm run build` (정적 사이트 생성)
3. **S3에 파일 업로드** - `out/` 디렉토리 내용을 S3에 동기화
4. **CloudFront Function 업데이트** - 동적 URL 리라이팅 함수
5. **CloudFront 배포 확인/생성** - CDN 배포
6. **CloudFront 캐시 무효화** - 변경사항 즉시 반영

### 예상 소요 시간
- **빌드**: 2~3분
- **S3 업로드**: 1~2분
- **CloudFront 전파**: 10~15분 (캐시 무효화 후)

### 배포 후 확인

```bash
# CloudFront URL 확인
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='Survey Frontend Distribution'].{Id:Id,DomainName:DomainName}" \
  --output table
```

---

## 🔄 전체 배포 프로세스 (백엔드 + 프론트엔드)

### 1. 백엔드 배포

```bash
cd /Users/jang-wonjun/Desktop/Dev/NLP/Survey_Page/backend
./deploy-lambda.sh
```

**배포 완료 후 Lambda URL 확인:**
```
📍 Lambda Function URL: https://xxxxx.lambda-url.us-east-1.on.aws
```

### 2. 프론트엔드 환경변수 업데이트 (Lambda URL 변경 시)

Lambda URL이 변경되었다면, 프론트엔드 설정 파일을 업데이트해야 합니다:

**`app/config/api.ts`** 수정:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  process.env.NODE_ENV === 'production' 
    ? 'https://새로운-Lambda-URL'  // ← 여기 업데이트
    : 'http://localhost:8000';
```

**`app/next.config.js`** 수정:
```javascript
env: {
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 
    (isProduction 
      ? 'https://새로운-Lambda-URL'  // ← 여기 업데이트
      : 'http://localhost:8000'),
},
```

### 3. 프론트엔드 배포

```bash
cd /Users/jang-wonjun/Desktop/Dev/NLP/Survey_Page/app
./deploy-frontend.sh
```

**배포 완료 후 CloudFront URL 확인:**
```
🌐 CloudFront URL: https://d3bvik4mz6zh8n.cloudfront.net
```

---

## ⚡ 빠른 배포 (변경사항만 반영)

### 백엔드만 변경한 경우

```bash
cd backend
./deploy-lambda.sh
```

### 프론트엔드만 변경한 경우

```bash
cd app
./deploy-frontend.sh
```

### 둘 다 변경한 경우

```bash
# 1. 백엔드 배포
cd backend && ./deploy-lambda.sh

# 2. 프론트엔드 배포 (Lambda URL 변경 시 config 업데이트 필요)
cd ../app && ./deploy-frontend.sh
```

---

## 🐛 배포 문제 해결

### 백엔드 배포 실패

1. **Docker 실행 확인**
   ```bash
   docker info
   ```

2. **ECR 로그인 재시도**
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Docker 이미지 수동 빌드 테스트**
   ```bash
   cd backend
   docker buildx build --platform linux/amd64 -f Dockerfile.lambda -t survey-backend --load .
   ```

### 프론트엔드 배포 실패

1. **Next.js 빌드 확인**
   ```bash
   cd app
   npm run build
   ```

2. **S3 버킷 권한 확인**
   ```bash
   aws s3 ls s3://survey-frontend-339712972404
   ```

3. **CloudFront 캐시 수동 무효화**
   ```bash
   DISTRIBUTION_ID="E1M3JI8YGFVQOJ"  # 실제 Distribution ID
   aws cloudfront create-invalidation \
     --distribution-id $DISTRIBUTION_ID \
     --paths "/*"
   ```

---

## 📝 배포 체크리스트

- [ ] 백엔드 코드 변경사항 커밋
- [ ] 프론트엔드 코드 변경사항 커밋
- [ ] AWS CLI 인증 확인
- [ ] Docker 실행 확인
- [ ] 백엔드 배포 실행
- [ ] Lambda URL 확인 및 프론트엔드 config 업데이트 (필요 시)
- [ ] 프론트엔드 배포 실행
- [ ] CloudFront URL 접속 테스트
- [ ] 설문 응답 페이지 테스트

---

## 🔗 배포된 URL

### 백엔드
- **Lambda Function URL**: `https://42jhk2psmpim3ualp2bczehyu40qgikm.lambda-url.us-east-1.on.aws`
- **API 엔드포인트**: `/api/v1/surveys`

### 프론트엔드
- **CloudFront URL**: `https://d3bvik4mz6zh8n.cloudfront.net`
- **S3 Website URL**: `http://survey-frontend-339712972404.s3-website-us-east-1.amazonaws.com`

---

## 💡 팁

1. **빠른 반영**: 프론트엔드만 변경했다면 `deploy-frontend.sh`만 실행하면 됩니다.
2. **캐시 문제**: CloudFront 캐시 때문에 변경사항이 바로 안 보일 수 있습니다. 캐시 무효화 후 10~15분 기다려주세요.
3. **로컬 테스트**: 배포 전에 로컬에서 `npm run dev`로 테스트하는 것을 권장합니다.
