import React, { useMemo } from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkPreserveNewlines } from '../../lib/remarkPreserveNewlines';

const markdownPlugins = [remarkGfm, remarkBreaks, remarkPreserveNewlines()];

const IMAGE_SIZE_STEP = 0.1;
const MIN_MULTIPLIER = 0.5;
const MAX_MULTIPLIER = 2.0;

function getContentImageSizeMultiplier(override?: number): number {
  if (override != null) return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, override));
  if (typeof window === 'undefined') return 1;
  const saved = localStorage.getItem('survey-image-size-level');
  const level = saved ? parseInt(saved, 10) : 0;
  const multiplier = 1 + level * IMAGE_SIZE_STEP;
  return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, multiplier));
}

interface SurveyCompleteProps {
  surveyTitle: string;
  /** 커스텀 완료 페이지 콘텐츠 (Markdown). 비어 있으면 기본 메시지 표시. {{survey_title}} 로 설문 제목 삽입 */
  completionContent?: string | null;
  /** 콘텐츠 이미지 크기 배율. 미지정 시 로컬 스토리지 값 사용 (로고 제외) */
  contentImageSizeMultiplier?: number;
}

export default function SurveyComplete({ surveyTitle, completionContent, contentImageSizeMultiplier: multiplierProp }: SurveyCompleteProps) {
  const contentImageSizeMultiplier = useMemo(
    () => getContentImageSizeMultiplier(multiplierProp),
    [multiplierProp]
  );

  const hasCustomContent = completionContent != null && completionContent.trim() !== '';
  const resolvedContent = hasCustomContent
    ? completionContent.replace(/\{\{survey_title\}\}/g, surveyTitle || '')
    : '';

  if (hasCustomContent && resolvedContent.trim() !== '') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            border: '1px solid #E5E7EB',
            '& .markdown-body': {
              '& p': { marginBottom: 2 },
              '& h1, & h2, & h3': { marginTop: 3, marginBottom: 2 },
              '& ul, & ol': { paddingLeft: 3 },
            },
          }}
        >
          <Box className="markdown-body" sx={{ fontSize: '1rem', lineHeight: 1.7, color: '#374151' }}>
            <ReactMarkdown
              remarkPlugins={markdownPlugins}
              components={{
                img: ({ node, ...imgProps }) => (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      my: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-block',
                        maxWidth: `${100 * contentImageSizeMultiplier}%`,
                      }}
                    >
                      <Box
                        component="img"
                        {...imgProps}
                        sx={{ maxWidth: '100%', height: 'auto', borderRadius: 2, display: 'block' }}
                      />
                    </Box>
                  </Box>
                ),
              }}
            >
              {resolvedContent}
            </ReactMarkdown>
          </Box>
        </Paper>
      </Container>
    );
  }

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
        
        <Typography variant="body1" color="text.secondary">
          &ldquo;{surveyTitle}&rdquo; 설문에 참여해주셔서 감사합니다.
          <br />
          소중한 응답이 정상적으로 제출되었습니다.
        </Typography>
      </Paper>
    </Container>
  );
}

