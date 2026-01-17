import React from 'react';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { CheckCircle, Home } from '@mui/icons-material';
import { useRouter } from 'next/router';

interface SurveyCompleteProps {
  surveyTitle: string;
}

export default function SurveyComplete({ surveyTitle }: SurveyCompleteProps) {
  const router = useRouter();
  
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 4,
          border: '1px solid #E5E7EB',
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#D1FAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <CheckCircle sx={{ fontSize: 48, color: '#10B981' }} />
        </Box>
        
        <Typography variant="h4" fontWeight={700} gutterBottom>
          설문이 완료되었습니다!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          &ldquo;{surveyTitle}&rdquo; 설문에 참여해주셔서 감사합니다.
          <br />
          소중한 응답이 정상적으로 제출되었습니다.
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<Home />}
          onClick={() => router.push('/')}
          sx={{ borderRadius: 2, px: 4 }}
        >
          홈으로 돌아가기
        </Button>
      </Paper>
    </Container>
  );
}

