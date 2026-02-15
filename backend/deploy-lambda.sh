#!/bin/bash

# AWS 설정
AWS_REGION="us-east-1"
ECR_REPO="survey-backend"
LAMBDA_FUNCTION="survey-lambda"

echo "🚀 설문조사 시스템 백엔드 Lambda 배포 시작..."

# AWS 계정 ID 가져오기
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ AWS 인증이 설정되지 않았습니다. 'aws configure'를 실행해주세요."
    exit 1
fi

echo "✅ AWS 계정: $AWS_ACCOUNT_ID"
echo "📍 리전: $AWS_REGION"

# 1. ECR 로그인
echo "🔐 ECR 로그인 중..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
if [ $? -ne 0 ]; then
    echo "❌ ECR 로그인 실패"
    exit 1
fi

# 2. ECR 리포지토리 생성 (존재하지 않으면)
echo "📦 ECR 리포지토리 확인/생성 중..."
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION 2>/dev/null || echo "✅ ECR 리포지토리가 이미 존재합니다."

# 3. Docker 이미지 빌드 (x86_64 아키텍처 강제 지정)
echo "🐳 Docker 이미지 빌드 중..."
docker buildx use multiarch-builder 2>/dev/null || docker buildx use default
docker buildx build --no-cache --platform linux/amd64 -f Dockerfile.lambda -t $ECR_REPO --load .
if [ $? -ne 0 ]; then
    echo "❌ Docker 빌드 실패"
    exit 1
fi

# 4. 이미지 태그
echo "🏷️ 이미지 태그 지정 중..."
docker tag $ECR_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest

# 5. ECR에 푸시
echo "📤 ECR에 이미지 푸시 중..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
if [ $? -ne 0 ]; then
    echo "❌ ECR 푸시 실패"
    exit 1
fi

# 6. Lambda 함수 확인 및 생성/업데이트
echo "⚡ Lambda 함수 확인 중..."
if aws lambda get-function --function-name $LAMBDA_FUNCTION --region $AWS_REGION > /dev/null 2>&1; then
    echo "🔄 Lambda 함수 업데이트 중..."
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION \
        --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest \
        --region $AWS_REGION
    
    echo "⏳ Lambda 함수 업데이트 완료 대기 중..."
    aws lambda wait function-updated \
        --function-name $LAMBDA_FUNCTION \
        --region $AWS_REGION
    echo "✅ Lambda 함수 업데이트 완료"
else
    echo "🆕 Lambda 함수 생성 중..."
    
    # IAM 역할 생성 (존재하지 않으면)
    ROLE_NAME="survey-lambda-role"
    ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"
    
    if ! aws iam get-role --role-name $ROLE_NAME > /dev/null 2>&1; then
        echo "👤 IAM 역할 생성 중..."
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }'
        
        # 기본 실행 정책 연결
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        echo "⏳ IAM 역할 생성 대기 중..."
        sleep 10
    fi
    
    # Lambda 함수 생성
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION \
        --package-type Image \
        --code ImageUri=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest \
        --role $ROLE_ARN \
        --timeout 900 \
        --memory-size 2048 \
        --region $AWS_REGION
    
    echo "⏳ Lambda 함수 생성 완료 대기 중..."
    aws lambda wait function-active \
        --function-name $LAMBDA_FUNCTION \
        --region $AWS_REGION
    echo "✅ Lambda 함수 생성 완료"
fi

# 7. Function URL 설정 및 CORS 설정
echo "🌐 Function URL 설정 중..."

# Function URL이 이미 존재하는지 확인
EXISTING_URL=$(aws lambda get-function-url-config \
    --function-name $LAMBDA_FUNCTION \
    --region $AWS_REGION \
    --query 'FunctionUrl' \
    --output text 2>/dev/null)

if [ -z "$EXISTING_URL" ]; then
    # Function URL 생성 (CORS 포함)
    echo "🆕 Function URL 생성 중..."
    FUNCTION_URL=$(aws lambda create-function-url-config \
        --function-name $LAMBDA_FUNCTION \
        --auth-type NONE \
        --cors '{
            "AllowCredentials": false,
            "AllowHeaders": ["*"],
            "AllowMethods": ["*"],
            "AllowOrigins": ["*"],
            "ExposeHeaders": [],
            "MaxAge": 300
        }' \
        --region $AWS_REGION \
        --query 'FunctionUrl' \
        --output text)
else
    # 기존 Function URL의 CORS 업데이트
    echo "📝 기존 Function URL의 CORS 설정 업데이트 중..."
    FUNCTION_URL=$EXISTING_URL
    aws lambda update-function-url-config \
        --function-name $LAMBDA_FUNCTION \
        --cors '{
            "AllowCredentials": false,
            "AllowHeaders": ["*"],
            "AllowMethods": ["*"],
            "AllowOrigins": ["*"],
            "ExposeHeaders": [],
            "MaxAge": 300
        }' \
        --region $AWS_REGION
fi

echo ""
echo "🎉 배포 완료!"
echo "📍 Lambda Function URL: $FUNCTION_URL"
echo ""
echo "테스트: curl $FUNCTION_URL"
echo "" 