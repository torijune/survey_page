import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { ArrowBack, Edit, Visibility } from '@mui/icons-material';
import {
  Survey,
  getSurvey,
  updateSurvey,
  updateSection,
  createSection,
  deleteSection,
  updateQuestion,
  createQuestion,
  deleteQuestion,
} from '../../../../api/surveys';
import { SurveyForm } from '../../../../components/survey';
import EditablePreview from '../../../../components/survey/admin/EditablePreview';

type ViewMode = 'edit' | 'preview';

export default function SurveyPreviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  
  useEffect(() => {
    if (id && typeof id === 'string') {
      loadSurvey(id);
    }
  }, [id]);
  
  const loadSurvey = async (surveyId: string) => {
    try {
      const data = await getSurvey(surveyId);
      setSurvey(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 저장 함수
  const handleSave = async () => {
    if (!survey) return;
    
    // 설문 정보 저장
    await updateSurvey(survey.id!, {
      title: survey.title,
      description: survey.description,
      intro_content: survey.intro_content,
      allow_edit: survey.allow_edit,
      duplicate_prevention: survey.duplicate_prevention,
    });
    
    // 각 섹션 저장
    for (let sIndex = 0; sIndex < survey.sections.length; sIndex++) {
      const section = survey.sections[sIndex];
      
      if (section.id) {
        // 기존 섹션 업데이트
        await updateSection(section.id, {
          title: section.title,
          description: section.description,
          order_index: sIndex,
        });
      } else {
        // 새 섹션 생성
        const created = await createSection({
          survey_id: survey.id!,
          title: section.title,
          description: section.description,
          order_index: sIndex,
        });
        // 섹션 ID 업데이트
        const newSections = [...survey.sections];
        newSections[sIndex] = { ...section, id: created.id };
        setSurvey({ ...survey, sections: newSections });
        section.id = created.id;
      }
      
      // 각 문항 저장
      for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
        const question = section.questions[qIndex];
        
        if (question.id) {
          // 기존 문항 업데이트
          await updateQuestion(question.id, {
            type: question.type,
            title: question.title,
            description: question.description,
            required: question.required,
            order_index: qIndex,
            is_hidden: question.is_hidden,
            validation_rules: question.validation_rules,
            conditional_logic: question.conditional_logic,
            likert_config: question.likert_config,
            options: question.options,
          });
        } else if (section.id) {
          // 새 문항 생성
          const created = await createQuestion({
            section_id: section.id,
            type: question.type,
            title: question.title,
            description: question.description,
            required: question.required,
            order_index: qIndex,
            is_hidden: question.is_hidden,
            validation_rules: question.validation_rules,
            conditional_logic: question.conditional_logic,
            likert_config: question.likert_config,
            options: question.options,
          });
          // 문항 ID 업데이트
          const newSections = [...survey.sections];
          const newQuestions = [...newSections[sIndex].questions];
          newQuestions[qIndex] = { ...question, id: created.id };
          newSections[sIndex] = { ...newSections[sIndex], questions: newQuestions };
          setSurvey({ ...survey, sections: newSections });
        }
      }
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !survey) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || '설문을 찾을 수 없습니다.'}</Alert>
      </Container>
    );
  }
  
  return (
    <>
      <Head>
        <title>{viewMode === 'edit' ? '편집' : '미리보기'}: {survey.title} - 설문조사 시스템</title>
      </Head>
      
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        {/* 상단 배너 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: viewMode === 'edit' ? '#EFF6FF' : '#FEF3C7',
            borderBottom: viewMode === 'edit' ? '1px solid #3B82F6' : '1px solid #FCD34D',
          }}
        >
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => router.push(`/admin/surveys/${id}/edit`)}
                  sx={{ color: viewMode === 'edit' ? '#1D4ED8' : '#92400E' }}
                >
                  편집 페이지로
                </Button>
                
                <Typography fontWeight={600} color={viewMode === 'edit' ? '#1D4ED8' : '#92400E'}>
                  {viewMode === 'edit' ? '✏️ 편집 모드' : '🔍 미리보기 모드'}
                </Typography>
              </Box>
              
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="edit" sx={{ px: 2 }}>
                  <Tooltip title="편집 모드">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Edit fontSize="small" />
                      편집
                    </Box>
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="preview" sx={{ px: 2 }}>
                  <Tooltip title="미리보기 모드">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Visibility fontSize="small" />
                      미리보기
                    </Box>
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Container>
        </Paper>
        
        {/* 컨텐츠 영역 */}
        {viewMode === 'edit' ? (
          <EditablePreview
            survey={survey}
            onSurveyChange={setSurvey}
            onSave={handleSave}
          />
        ) : (
          <SurveyForm
            survey={survey}
            onComplete={() => {
              alert('미리보기 모드에서는 응답이 제출되지 않습니다.');
              router.push(`/admin/surveys/${id}/edit`);
            }}
          />
        )}
      </Box>
    </>
  );
}
