#!/bin/bash

# AWS S3 + CloudFront 프론트엔드 배포 스크립트
set -e

# 설정
BUCKET_NAME="survey-frontend-339712972404"
REGION="us-east-1"
CLOUDFRONT_COMMENT="Survey Frontend Distribution"
CF_FUNCTION_NAME="survey-url-rewrite"

echo "🚀 설문조사 시스템 프론트엔드 S3 배포 시작..."

# 1. S3 버킷 생성 (존재하지 않으면)
echo "📦 S3 버킷 확인/생성 중..."
if ! aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null; then
    echo "📦 S3 버킷 생성 중: $BUCKET_NAME"
    aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION
    
    # 퍼블릭 액세스 차단 해제 (정적 웹사이트 호스팅용)
    aws s3api delete-public-access-block --bucket $BUCKET_NAME
    
    # 웹사이트 설정
    aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document 404.html
    
    # 버킷 정책 설정 (퍼블릭 읽기 허용)
    cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
    aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
    rm bucket-policy.json
else
    echo "✅ S3 버킷이 이미 존재합니다: $BUCKET_NAME"
fi

# 2. Next.js 빌드
echo "🏗️ Next.js 빌드 중..."
npm run build

# 3. S3에 업로드 (out 디렉토리 사용)
echo "📤 S3에 파일 업로드 중..."
if [ -d "out" ]; then
    aws s3 sync out s3://$BUCKET_NAME --delete
elif [ -d ".next" ]; then
    aws s3 sync .next/static s3://$BUCKET_NAME/_next/static --delete
    aws s3 cp .next/standalone s3://$BUCKET_NAME --recursive --exclude "node_modules/*"
fi

# public 디렉토리도 업로드
if [ -d "public" ]; then
    aws s3 sync public s3://$BUCKET_NAME --delete
fi

# 4. CloudFront Function 생성/업데이트 (동적 URL 리라이팅)
echo "⚡ CloudFront Function 확인 중..."

# Function 코드 작성
cat > /tmp/cf-function.js << 'FUNCEOF'
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 정적 파일 요청은 그대로 전달 (_next/, favicon 등)
  if (uri.startsWith('/_next/') || uri.indexOf('.') !== -1) {
    return request;
  }

  // trailing slash 보장
  if (uri !== '/' && !uri.endsWith('/')) {
    uri = uri + '/';
  }

  // 동적 라우트 리라이팅
  // /survey/{shareId}/ -> /survey/[shareId]/index.html
  if (uri.match(/^\/survey\/[^\/]+\/$/)) {
    request.uri = '/survey/[shareId]/index.html';
    return request;
  }

  // /m7k9p2/surveys/{id}/edit/ -> /m7k9p2/surveys/[id]/edit/index.html
  if (uri.match(/^\/m7k9p2\/surveys\/[^\/]+\/edit\/$/)) {
    request.uri = '/m7k9p2/surveys/[id]/edit/index.html';
    return request;
  }

  // /m7k9p2/surveys/{id}/preview/ -> /m7k9p2/surveys/[id]/preview/index.html
  if (uri.match(/^\/m7k9p2\/surveys\/[^\/]+\/preview\/$/)) {
    request.uri = '/m7k9p2/surveys/[id]/preview/index.html';
    return request;
  }

  // /m7k9p2/surveys/{id}/flow/ -> /m7k9p2/surveys/[id]/flow/index.html
  if (uri.match(/^\/m7k9p2\/surveys\/[^\/]+\/flow\/$/)) {
    request.uri = '/m7k9p2/surveys/[id]/flow/index.html';
    return request;
  }

  // /m7k9p2/surveys/{id}/responses/ -> /m7k9p2/surveys/[id]/responses/index.html
  if (uri.match(/^\/m7k9p2\/surveys\/[^\/]+\/responses\/$/)) {
    request.uri = '/m7k9p2/surveys/[id]/responses/index.html';
    return request;
  }

  // 나머지: index.html 붙이기
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  return request;
}
FUNCEOF

if aws cloudfront describe-function --name $CF_FUNCTION_NAME 2>/dev/null; then
    echo "⚡ 기존 CloudFront Function 업데이트 중..."
    FUNC_ETAG=$(aws cloudfront describe-function --name $CF_FUNCTION_NAME --query 'ETag' --output text)
    aws cloudfront update-function \
        --name $CF_FUNCTION_NAME \
        --function-config '{"Comment":"Survey dynamic URL rewriting","Runtime":"cloudfront-js-2.0"}' \
        --function-code fileb:///tmp/cf-function.js \
        --if-match $FUNC_ETAG > /dev/null
    FUNC_ETAG=$(aws cloudfront describe-function --name $CF_FUNCTION_NAME --query 'ETag' --output text)
    aws cloudfront publish-function --name $CF_FUNCTION_NAME --if-match $FUNC_ETAG > /dev/null
    echo "✅ CloudFront Function 업데이트 완료"
else
    echo "⚡ CloudFront Function 생성 중..."
    aws cloudfront create-function \
        --name $CF_FUNCTION_NAME \
        --function-config '{"Comment":"Survey dynamic URL rewriting","Runtime":"cloudfront-js-2.0"}' \
        --function-code fileb:///tmp/cf-function.js > /dev/null
    FUNC_ETAG=$(aws cloudfront describe-function --name $CF_FUNCTION_NAME --query 'ETag' --output text)
    aws cloudfront publish-function --name $CF_FUNCTION_NAME --if-match $FUNC_ETAG > /dev/null
    echo "✅ CloudFront Function 생성 완료"
fi
rm -f /tmp/cf-function.js

# Function ARN 가져오기
FUNC_ARN=$(aws cloudfront describe-function --name $CF_FUNCTION_NAME --stage LIVE --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
echo "Function ARN: $FUNC_ARN"

# 5. CloudFront 배포 확인/생성
echo "🌐 CloudFront 배포 확인 중..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$CLOUDFRONT_COMMENT'].Id" --output text 2>/dev/null || echo "")

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
    echo "🌐 CloudFront 배포 생성 중..."
    
    # CloudFront 배포 설정 (Function association 포함)
    cat > cloudfront-config.json << EOF
{
    "CallerReference": "survey-$(date +%s)",
    "Comment": "$CLOUDFRONT_COMMENT",
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "Compress": true,
        "FunctionAssociations": {
            "Quantity": 1,
            "Items": [
                {
                    "FunctionARN": "$FUNC_ARN",
                    "EventType": "viewer-request"
                }
            ]
        }
    },
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3-website-$REGION.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/404/index.html",
                "ResponseCode": "404",
                "ErrorCachingMinTTL": 10
            }
        ]
    }
}
EOF
    
    DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --query 'Distribution.Id' --output text)
    rm cloudfront-config.json
    
    echo "✅ CloudFront 배포 생성됨: $DISTRIBUTION_ID"
else
    echo "✅ CloudFront 배포가 이미 존재합니다: $DISTRIBUTION_ID"
fi

# 6. CloudFront 무효화 (캐시 갱신)
if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    echo "🔄 CloudFront 캐시 무효화 중..."
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" > /dev/null
fi

# 7. URL 정보 출력
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    CLOUDFRONT_URL=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.DomainName' --output text)
fi

echo ""
echo "🎉 배포 완료!"
echo "📍 S3 Website URL: $WEBSITE_URL"
if [ ! -z "$CLOUDFRONT_URL" ]; then
    echo "🌐 CloudFront URL: https://$CLOUDFRONT_URL"
fi
echo ""
echo "⚠️  CloudFront 배포는 전파에 10-15분 정도 소요될 수 있습니다."
echo ""
