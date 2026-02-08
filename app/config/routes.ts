// 관리자 페이지 경로 설정
// 사용자가 유추할 수 없도록 랜덤한 경로 사용
// 필요시 환경 변수 NEXT_PUBLIC_ADMIN_PATH로 변경 가능
export const ADMIN_BASE_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || '/m7k9p2';

export const adminRoutes = {
  surveys: `${ADMIN_BASE_PATH}/surveys`,
  surveyEdit: (id: string) => `${ADMIN_BASE_PATH}/surveys/${id}/edit`,
  surveyPreview: (id: string) => `${ADMIN_BASE_PATH}/surveys/${id}/preview`,
  surveyFlow: (id: string) => `${ADMIN_BASE_PATH}/surveys/${id}/flow`,
  surveyResponses: (id: string) => `${ADMIN_BASE_PATH}/surveys/${id}/responses`,
};
