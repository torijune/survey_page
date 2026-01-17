import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Container, CircularProgress, Alert, Typography, Button } from '@mui/material';
import { Home } from '@mui/icons-material';
import { Survey, getPublicSurvey } from '../../api/surveys';
import { SurveyForm, SurveyComplete } from '../../components/survey';

export default function SurveyPage() {
  const router = useRouter();
  const { shareId } = router.query;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  
  useEffect(() => {
    if (shareId && typeof shareId === 'string') {
      loadSurvey(shareId);
    }
  }, [shareId]);
  
  const loadSurvey = async (id: string) => {
    try {
      const data = await getPublicSurvey(id);
      setSurvey(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <>
        <Head>
          <title>설문조사</title>
        </Head>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <Container maxWidth="sm">
            <Alert
              severity="error"
              sx={{ borderRadius: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => router.push('/')}>
                  홈으로
                </Button>
              }
            >
              {error}
            </Alert>
          </Container>
        </Box>
      </>
    );
  }
  
  if (!survey) {
    return null;
  }
  
  if (completed) {
    return (
      <>
        <Head>
          <title>설문 완료 - {survey.title}</title>
        </Head>
        <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
          <SurveyComplete surveyTitle={survey.title} />
        </Box>
      </>
    );
  }
  
  return (
    <>
      <Head>
        <title>{survey.title}</title>
        <meta name="description" content={survey.description || '설문조사에 참여해주세요.'} />
      </Head>
      
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        <SurveyForm survey={survey} onComplete={() => setCompleted(true)} />
      </Box>
    </>
  );
}

