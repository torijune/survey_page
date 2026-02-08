import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box } from '@mui/material';
import { SurveyBuilder } from '../../../../components/survey';

export default function SurveyEditPage() {
  const router = useRouter();
  const { id } = router.query;
  
  if (!id || typeof id !== 'string') {
    return null;
  }
  
  return (
    <>
      <Head>
        <title>설문 편집 - 설문조사 시스템</title>
      </Head>
      
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        <SurveyBuilder surveyId={id} />
      </Box>
    </>
  );
}

