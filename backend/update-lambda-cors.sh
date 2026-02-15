#!/bin/bash

# Lambda Function URL의 CORS 설정 업데이트
LAMBDA_FUNCTION="survey-lambda"
AWS_REGION="us-east-1"

echo "🌐 Lambda Function URL CORS 설정 업데이트 중..."

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

if [ $? -eq 0 ]; then
    echo "✅ CORS 설정 업데이트 완료!"
    FUNCTION_URL=$(aws lambda get-function-url-config \
        --function-name $LAMBDA_FUNCTION \
        --region $AWS_REGION \
        --query 'FunctionUrl' \
        --output text)
    echo "📍 Function URL: $FUNCTION_URL"
else
    echo "❌ CORS 설정 업데이트 실패"
    exit 1
fi
