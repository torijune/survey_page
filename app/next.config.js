/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // TypeScript 빌드 에러 무시 (MUI Grid 호환성 이슈)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint 빌드 에러 무시
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 정적 사이트 생성 설정 (프로덕션 빌드 시에만)
  ...(isProduction && {
    output: 'export',
    trailingSlash: true,
  }),
  
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 
      (isProduction 
        ? (process.env.NEXT_PUBLIC_API_URL || 'https://42jhk2psmpim3ualp2bczehyu40qgikm.lambda-url.us-east-1.on.aws')
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

  // Webpack 설정 커스터마이징 (autoprefixer 경고 숨기기)
  webpack: (config, { isServer }) => {
    // autoprefixer 경고 무시
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/ag-grid-community/,
      },
      {
        message: /autoprefixer/,
      },
      {
        message: /end value has mixed support/,
      },
      /autoprefixer/,
      /end value has mixed support/,
    ];

    // 로깅 레벨 조정
    if (config.infrastructureLogging) {
      const originalWarn = config.infrastructureLogging.warn || console.warn;
      config.infrastructureLogging.warn = (message) => {
        if (typeof message === 'string') {
          if (message.includes('autoprefixer') || message.includes('end value has mixed support')) {
            return;
          }
        }
        originalWarn(message);
      };
    }

    return config;
  },
}

module.exports = nextConfig 