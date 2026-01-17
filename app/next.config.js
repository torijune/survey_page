/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 정적 사이트 생성 설정 (프로덕션 빌드 시에만)
  ...(isProduction && {
    output: 'export',
    trailingSlash: true,
  }),
  
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 
      (isProduction 
        ? 'https://na6biybdk3xhs2lk337vtujjd40dbvcv.lambda-url.us-east-1.on.aws'
        : 'http://localhost:8000'),
  },

  // 이미지 최적화 (정적 배포용)
  images: {
    unoptimized: true
  },

  // CORS 헤더 설정 (프로덕션 빌드 시에만)
  ...(isProduction && {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ]
    },
  }),
}

module.exports = nextConfig 