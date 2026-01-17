const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  process.env.NODE_ENV === 'production' 
    ? 'https://na6biybdk3xhs2lk337vtujjd40dbvcv.lambda-url.us-east-1.on.aws'
    : 'http://localhost:8000';

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    surveys: `${API_BASE_URL}/api/v1/surveys`,
  }
};

export default apiConfig;
