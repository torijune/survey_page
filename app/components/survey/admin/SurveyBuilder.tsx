import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Save,
  Visibility,
  Publish,
  Close as CloseIcon,
  ArrowBack,
  PictureAsPdf,
  UploadFile,
  CheckCircle,
  ContentCopy,
  Launch,
  Settings,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import {
  Survey,
  Section,
  Question,
  getSurvey,
  updateSurvey,
  createSection,
  updateSection,
  deleteSection,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  publishSurvey,
  closeSurvey,
  updateSurveyFromPDF,
  PDFImportResponse,
} from '../../../api/surveys';
import SectionEditor from './SectionEditor';
import MarkdownEditor from './MarkdownEditor';

interface SurveyBuilderProps {
  surveyId: string;
}

export default function SurveyBuilder({ surveyId }: SurveyBuilderProps) {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // PDF 업로드 관련 상태
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState<PDFImportResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // 설문 로드
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const data = await getSurvey(surveyId);
        // 제목이 "새 설문"이면 빈 문자열로 변환
        if (data.title === '새 설문') {
          data.title = '';
        }
        // 각 섹션의 문항 제목도 "새 문항"이면 빈 문자열로 변환
        if (data.sections) {
          data.sections.forEach(section => {
            if (section.questions) {
              section.questions.forEach(question => {
                if (question.title === '새 문항') {
                  question.title = '';
                }
              });
            }
          });
        }
        setSurvey(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId]);
  
  // 설문 정보 변경
  const handleSurveyChange = (field: keyof Survey, value: any) => {
    if (survey) {
      setSurvey({ ...survey, [field]: value });
    }
  };
  
  // 섹션 변경
  const handleSectionChange = (sectionIndex: number, updatedSection: Section) => {
    if (survey) {
      const newSections = [...survey.sections];
      newSections[sectionIndex] = updatedSection;
      setSurvey({ ...survey, sections: newSections });
    }
  };
  
  // 섹션 추가
  const handleAddSection = async () => {
    if (!survey) return;
    
    try {
      const newSection = await createSection({
        survey_id: survey.id!,
        title: '',
        order_index: survey.sections.length,
      });
      setSurvey({
        ...survey,
        sections: [...survey.sections, { ...newSection, questions: [] }],
      });
      showSnackbar('섹션이 추가되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    }
  };
  
  // 섹션 삭제
  const handleDeleteSection = async (sectionIndex: number) => {
    if (!survey) return;
    
    const section = survey.sections[sectionIndex];
    if (!section.id) return;
    
    try {
      await deleteSection(section.id);
      const newSections = survey.sections.filter((_, i) => i !== sectionIndex);
      setSurvey({ ...survey, sections: newSections });
      showSnackbar('섹션이 삭제되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    }
  };
  
  // 문항 추가 (로컬에만 추가, 저장 버튼으로 DB 저장)
  const handleAddQuestion = (sectionIndex: number) => {
    if (!survey) return;
    
    const section = survey.sections[sectionIndex];
    
    const newQuestion: Question = {
      type: 'short_text',
      title: '',
      required: false,
      order_index: section.questions.length,
      is_hidden: false,
      options: [],
    };
    
    const newSections = [...survey.sections];
    newSections[sectionIndex] = {
      ...section,
      questions: [...section.questions, newQuestion],
    };
    setSurvey({ ...survey, sections: newSections });
  };
  
  // 문항 저장 (DB에 저장)
  const handleSaveQuestion = async (sectionIndex: number, questionIndex: number) => {
    if (!survey) return;
    
    const question = survey.sections[sectionIndex].questions[questionIndex];
    const section = survey.sections[sectionIndex];
    
    // 문항 제목 검증
    if (!question.title || question.title.trim() === '') {
      showSnackbar('문항 제목을 입력해주세요.', 'error');
      return;
    }
    
    if (!section.id) {
      showSnackbar('섹션을 먼저 저장해주세요.', 'error');
      return;
    }
    
    try {
      if (question.id) {
        // 기존 문항 업데이트 (제목이 "새 문항"이면 빈 문자열로 저장)
        const titleToSave = question.title === '새 문항' ? '' : question.title;
        const updated = await updateQuestion(question.id, {
          type: question.type,
          title: titleToSave,
          description: question.description,
          required: question.required,
          order_index: question.order_index,
          is_hidden: question.is_hidden,
          validation_rules: question.validation_rules,
          conditional_logic: question.conditional_logic,
          likert_config: question.likert_config,
          options: question.options,
        });
        
        const newSections = [...survey.sections];
        const newQuestions = [...newSections[sectionIndex].questions];
        newQuestions[questionIndex] = { ...updated, options: question.options };
        newSections[sectionIndex] = {
          ...newSections[sectionIndex],
          questions: newQuestions,
        };
        setSurvey({ ...survey, sections: newSections });
        showSnackbar('문항이 저장되었습니다.', 'success');
      } else {
        // 새 문항 생성 (제목이 "새 문항"이면 빈 문자열로 저장)
        const titleToSave = question.title === '새 문항' ? '' : question.title;
        const created = await createQuestion({
          section_id: section.id,
          type: question.type,
          title: titleToSave,
          description: question.description,
          required: question.required,
          order_index: question.order_index,
          is_hidden: question.is_hidden,
          validation_rules: question.validation_rules,
          conditional_logic: question.conditional_logic,
          likert_config: question.likert_config,
          options: question.options,
        });
        
        const newSections = [...survey.sections];
        const newQuestions = [...newSections[sectionIndex].questions];
        newQuestions[questionIndex] = { ...created, options: question.options };
        newSections[sectionIndex] = {
          ...newSections[sectionIndex],
          questions: newQuestions,
        };
        setSurvey({ ...survey, sections: newSections });
        showSnackbar('문항이 저장되었습니다.', 'success');
      }
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    }
  };
  
  // 문항 숨기기 토글 (즉시 저장)
  const handleToggleQuestionHide = async (sectionIndex: number, questionIndex: number) => {
    if (!survey) return;
    
    const question = survey.sections[sectionIndex].questions[questionIndex];
    const section = survey.sections[sectionIndex];
    
    // 로컬 상태 업데이트
    const newSections = [...survey.sections];
    const newQuestions = [...newSections[sectionIndex].questions];
    const newIsHidden = !question.is_hidden;
    newQuestions[questionIndex] = {
      ...question,
      is_hidden: newIsHidden,
    };
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      questions: newQuestions,
    };
    setSurvey({ ...survey, sections: newSections });
    
    // DB에 저장된 문항이면 즉시 저장
    if (question.id && section.id) {
      try {
        await updateQuestion(question.id, {
          type: question.type,
          title: question.title,
          description: question.description,
          required: question.required,
          order_index: question.order_index,
          is_hidden: newIsHidden,
          validation_rules: question.validation_rules,
          conditional_logic: question.conditional_logic,
          likert_config: question.likert_config,
          options: question.options,
        });
        showSnackbar(newIsHidden ? '문항이 숨김 처리되었습니다.' : '문항이 표시되도록 변경되었습니다.', 'success');
      } catch (e: any) {
        // 저장 실패 시 원래 상태로 복구
        newQuestions[questionIndex] = {
          ...question,
          is_hidden: !newIsHidden,
        };
        newSections[sectionIndex] = {
          ...newSections[sectionIndex],
          questions: newQuestions,
        };
        setSurvey({ ...survey, sections: newSections });
        showSnackbar(e.message || '저장에 실패했습니다.', 'error');
      }
    }
  };
  
  // 문항 변경
  const handleQuestionChange = (sectionIndex: number, questionIndex: number, question: Question) => {
    if (survey) {
      const newSections = [...survey.sections];
      const newQuestions = [...newSections[sectionIndex].questions];
      newQuestions[questionIndex] = question;
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        questions: newQuestions,
      };
      setSurvey({ ...survey, sections: newSections });
    }
  };
  
  // 문항 삭제
  const handleDeleteQuestion = async (sectionIndex: number, questionIndex: number) => {
    if (!survey) return;
    
    const question = survey.sections[sectionIndex].questions[questionIndex];
    if (!question.id) return;
    
    try {
      await deleteQuestion(question.id);
      const newSections = [...survey.sections];
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        questions: newSections[sectionIndex].questions.filter((_, i) => i !== questionIndex),
      };
      setSurvey({ ...survey, sections: newSections });
      showSnackbar('문항이 삭제되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    }
  };
  
  // 저장
  const handleSave = async () => {
    if (!survey) return;
    
    // 설문 제목 검증
    if (!survey.title || survey.title.trim() === '') {
      showSnackbar('설문 제목을 입력해주세요.', 'error');
      return;
    }
    
    // 섹션 제목 검증
    for (let i = 0; i < survey.sections.length; i++) {
      const section = survey.sections[i];
      if (!section.title || section.title.trim() === '') {
        showSnackbar(`${i + 1}번째 섹션의 제목을 입력해주세요.`, 'error');
        return;
      }
    }
    
    // 문항 제목 검증
    for (let i = 0; i < survey.sections.length; i++) {
      const section = survey.sections[i];
      for (let j = 0; j < section.questions.length; j++) {
        const question = section.questions[j];
        if (!question.title || question.title.trim() === '') {
          showSnackbar(`${i + 1}번째 섹션의 ${j + 1}번째 문항 제목을 입력해주세요.`, 'error');
          return;
        }
      }
    }
    
    setSaving(true);
    try {
      // 설문 정보 저장 (제목이 "새 설문"이면 빈 문자열로 저장)
      const titleToSave = survey.title === '새 설문' ? '' : survey.title;
      await updateSurvey(survey.id!, {
        title: titleToSave,
        description: survey.description,
        intro_content: survey.intro_content,
        allow_edit: survey.allow_edit,
        duplicate_prevention: survey.duplicate_prevention,
        logo_url: survey.logo_url,
        organization_name: survey.organization_name,
        organization_subtitle: survey.organization_subtitle,
      });
      
      // 각 섹션 저장
      for (const section of survey.sections) {
        if (section.id) {
          await updateSection(section.id, {
            title: section.title,
            description: section.description,
            order_index: section.order_index,
          });
        }
        
        // 각 문항 저장
        for (const question of section.questions) {
          if (question.id) {
            // 제목이 "새 문항"이면 빈 문자열로 저장
            const titleToSave = question.title === '새 문항' ? '' : question.title;
            await updateQuestion(question.id, {
              type: question.type,
              title: titleToSave,
              description: question.description,
              required: question.required,
              order_index: question.order_index,
              is_hidden: question.is_hidden,
              validation_rules: question.validation_rules,
              conditional_logic: question.conditional_logic,
              likert_config: question.likert_config,
              options: question.options,
            });
          }
        }
      }
      
      showSnackbar('저장되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // 배포
  const handlePublish = async () => {
    if (!survey) return;
    
    // 설문 제목 검증
    if (!survey.title || survey.title.trim() === '') {
      showSnackbar('설문 제목을 입력해주세요.', 'error');
      return;
    }
    
    // 섹션 제목 검증
    for (let i = 0; i < survey.sections.length; i++) {
      const section = survey.sections[i];
      if (!section.title || section.title.trim() === '') {
        showSnackbar(`${i + 1}번째 섹션의 제목을 입력해주세요.`, 'error');
        return;
      }
    }
    
    // 문항 제목 검증
    for (let i = 0; i < survey.sections.length; i++) {
      const section = survey.sections[i];
      for (let j = 0; j < section.questions.length; j++) {
        const question = section.questions[j];
        if (!question.title || question.title.trim() === '') {
          showSnackbar(`${i + 1}번째 섹션의 ${j + 1}번째 문항 제목을 입력해주세요.`, 'error');
          return;
        }
      }
    }
    
    try {
      const updated = await publishSurvey(survey.id!);
      setSurvey({ ...survey, status: updated.status, share_id: updated.share_id });
      const message = survey.status === 'closed' ? '설문이 재배포되었습니다.' : '설문이 배포되었습니다.';
      showSnackbar(message, 'success');
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    }
  };
  
  // 마감
  const handleClose = async () => {
    if (!survey) return;
    
    try {
      const updated = await closeSurvey(survey.id!);
      setSurvey({ ...survey, status: updated.status });
      showSnackbar('설문이 마감되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message, 'error');
    }
  };

  const handleCopyLink = () => {
    if (survey?.share_id) {
      const url = `${window.location.origin}/survey/${survey.share_id}`;
      navigator.clipboard.writeText(url);
      showSnackbar('링크가 복사되었습니다.', 'success');
    }
  };
  
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };
  
  // PDF 파일 선택
  const handlePdfFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showSnackbar('PDF 파일만 업로드할 수 있습니다.', 'error');
        return;
      }
      setPdfFile(file);
      setPdfResult(null);
    }
  };
  
  // PDF에서 설문 적용
  const handlePdfUpdate = async () => {
    if (!pdfFile || !survey) return;
    
    if (!confirm('기존 섹션과 문항이 모두 삭제되고 PDF의 내용으로 교체됩니다. 계속하시겠습니까?')) {
      return;
    }
    
    setPdfUploading(true);
    setError(null);
    
    try {
      const result = await updateSurveyFromPDF(survey.id!, pdfFile);
      setPdfResult(result);
      
      // 설문 다시 로드
      const updatedSurvey = await getSurvey(survey.id!);
      setSurvey(updatedSurvey);
      
      showSnackbar('PDF에서 설문이 성공적으로 적용되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message || 'PDF 설문 적용 실패', 'error');
    } finally {
      setPdfUploading(false);
    }
  };
  
  // PDF 다이얼로그 닫기
  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setPdfFile(null);
    setPdfResult(null);
    setIsDragging(false);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };
  
  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      showSnackbar('PDF 파일만 업로드할 수 있습니다.', 'error');
      return;
    }
    
    if (pdfFiles.length > 1) {
      showSnackbar('한 번에 하나의 PDF 파일만 업로드할 수 있습니다.', 'error');
      return;
    }
    
    setPdfFile(pdfFiles[0]);
    setPdfResult(null);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published':
        return { label: '진행 중', color: '#10B981', bg: '#D1FAE5' };
      case 'closed':
        return { label: '마감', color: '#6B7280', bg: '#F3F4F6' };
      default:
        return { label: '초안', color: '#F59E0B', bg: '#FEF3C7' };
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !survey) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error || '설문을 찾을 수 없습니다.'}</Alert>
      </Container>
    );
  }

  const statusConfig = getStatusConfig(survey.status);
  
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          color: 'white',
          py: 3,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="목록으로">
                <IconButton
                  onClick={() => router.push('/admin/surveys')}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>
                    설문 편집
                  </Typography>
                  <Chip
                    size="small"
                    label={statusConfig.label}
                    sx={{
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.25 }}>
                  {survey.title || '제목 없음'}
                </Typography>
              </Box>
            </Box>
            
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdf />}
                onClick={() => setPdfDialogOpen(true)}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                PDF 적용
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Visibility />}
                onClick={() => router.push(`/admin/surveys/${surveyId}/preview`)}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                미리보기
              </Button>
              
              {survey.status === 'draft' && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Publish />}
                  onClick={handlePublish}
                  sx={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    },
                  }}
                >
                  배포
                </Button>
              )}
              
              {survey.status === 'published' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CloseIcon />}
                  onClick={handleClose}
                  sx={{
                    color: '#F87171',
                    borderColor: '#F87171',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#EF4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    },
                  }}
                >
                  마감
                </Button>
              )}
              
              {survey.status === 'closed' && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Publish />}
                  onClick={handlePublish}
                  sx={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    },
                  }}
                >
                  재배포
                </Button>
              )}
              
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 80,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  },
                }}
              >
                저장
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Survey Info Card */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography variant="h6" fontWeight={700} color="grey.800" sx={{ mb: 3 }}>
            기본 정보
          </Typography>
          
          <TextField
            fullWidth
            label="설문 제목"
            placeholder="설문 제목을 입력하세요"
            value={survey.title === '새 설문' ? '' : survey.title}
            onChange={(e) => handleSurveyChange('title', e.target.value)}
            sx={{ mb: 2.5 }}
          />
          
          <TextField
            fullWidth
            label="설문 설명"
            placeholder="설문에 대한 간략한 설명을 입력하세요"
            value={survey.description || ''}
            onChange={(e) => handleSurveyChange('description', e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 3 }}
          />
          
          <MarkdownEditor
            value={survey.intro_content || ''}
            onChange={(value) => handleSurveyChange('intro_content', value)}
            label="설문 시작 페이지 콘텐츠 (Markdown)"
            placeholder="# 설문 제목\n\n## 안내사항\n\n- 참여 기간: ~ 2월 초까지\n- 참여 혜택: 설문 응답자 중 추첨을 통해 소정의 사은품 제공\n\n**중요**: 모든 문항에 응답해주세요."
            rows={12}
          />
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle2" fontWeight={600} color="grey.700" sx={{ mb: 2 }}>
            설문 옵션
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={survey.allow_edit}
                  onChange={(e) => handleSurveyChange('allow_edit', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>응답 수정 허용</Typography>
                  <Typography variant="caption" color="grey.500">제출 후에도 응답을 수정할 수 있습니다</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={survey.duplicate_prevention}
                  onChange={(e) => handleSurveyChange('duplicate_prevention', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>중복 제출 방지</Typography>
                  <Typography variant="caption" color="grey.500">동일 기기에서 중복 응답을 방지합니다</Typography>
                </Box>
              }
            />
          </Stack>
          
          {survey.status === 'published' && survey.share_id && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                borderRadius: 3,
                border: '1px solid',
                borderColor: '#A7F3D0',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" fontWeight={700} color="#059669" sx={{ mb: 0.5 }}>
                    배포 링크
                  </Typography>
                  <Typography variant="body2" color="grey.700" sx={{ wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/survey/${survey.share_id}` : ''}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="링크 복사">
                    <IconButton
                      size="small"
                      onClick={handleCopyLink}
                      sx={{ backgroundColor: 'white', '&:hover': { backgroundColor: '#F0FDF4' } }}
                    >
                      <ContentCopy fontSize="small" sx={{ color: '#059669' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="새 탭에서 열기">
                    <IconButton
                      size="small"
                      onClick={() => window.open(`/survey/${survey.share_id}`, '_blank')}
                      sx={{ backgroundColor: 'white', '&:hover': { backgroundColor: '#F0FDF4' } }}
                    >
                      <Launch fontSize="small" sx={{ color: '#059669' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Box>
          )}
        </Paper>
        
        {/* Sections */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} color="grey.800" sx={{ mb: 3 }}>
            섹션 및 문항 ({survey.sections.length}개 섹션)
          </Typography>
          
          {survey.sections.map((section, sIndex) => (
            <SectionEditor
              key={section.id || sIndex}
              section={section}
              sectionIndex={sIndex}
              onChange={(s) => handleSectionChange(sIndex, s)}
              onDelete={() => handleDeleteSection(sIndex)}
              onAddQuestion={() => handleAddQuestion(sIndex)}
              onDeleteQuestion={(qIndex) => handleDeleteQuestion(sIndex, qIndex)}
              onQuestionChange={(qIndex, q) => handleQuestionChange(sIndex, qIndex, q)}
              onSaveQuestion={(qIndex) => handleSaveQuestion(sIndex, qIndex)}
              onToggleQuestionHide={(qIndex) => handleToggleQuestionHide(sIndex, qIndex)}
            />
          ))}
        </Box>
        
        <Button
          startIcon={<Add />}
          onClick={handleAddSection}
          variant="outlined"
          size="large"
          fullWidth
          sx={{
            borderRadius: 3,
            py: 2.5,
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: 'grey.300',
            color: 'grey.600',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'primary.50',
              borderWidth: 2,
            },
          }}
        >
          섹션 추가
        </Button>
      </Container>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* PDF Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={handleClosePdfDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          PDF에서 설문 적용
        </DialogTitle>
        <DialogContent>
          {!pdfResult ? (
            <>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                기존 섹션과 문항이 모두 삭제되고 PDF의 내용으로 교체됩니다.
              </Alert>
              
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handlePdfFileSelect}
              />
              
              <Box
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => pdfInputRef.current?.click()}
                sx={{
                  p: 5,
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'grey.300',
                  borderRadius: 4,
                  backgroundColor: isDragging ? 'primary.50' : 'grey.50',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    backgroundColor: isDragging ? 'primary.100' : 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {pdfFile ? (
                    <UploadFile sx={{ fontSize: 32, color: 'primary.main' }} />
                  ) : (
                    <PictureAsPdf sx={{ fontSize: 32, color: isDragging ? 'primary.main' : 'grey.500' }} />
                  )}
                </Box>
                {pdfFile ? (
                  <>
                    <Typography variant="body1" fontWeight={600} color="grey.800">
                      {pdfFile.name}
                    </Typography>
                    <Typography variant="caption" color="grey.500">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body1" fontWeight={600} color="grey.700">
                      PDF 파일을 드래그하거나 클릭
                    </Typography>
                    <Typography variant="caption" color="grey.500">
                      설문지 PDF를 업로드하면 자동으로 설문이 생성됩니다
                    </Typography>
                  </>
                )}
              </Box>
              
              {pdfUploading && <LinearProgress sx={{ mt: 3, borderRadius: 1 }} />}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircle sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                PDF 적용 완료!
              </Typography>
              <Typography color="grey.600" sx={{ mb: 2 }}>
                {pdfResult.survey_title || '제목 없음'}
              </Typography>
              <Typography variant="body2" color="grey.500">
                섹션 {pdfResult.sections_count}개, 문항 {pdfResult.questions_count}개
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClosePdfDialog}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {pdfResult ? '닫기' : '취소'}
          </Button>
          {!pdfResult && (
            <Button
              variant="contained"
              onClick={handlePdfUpdate}
              disabled={!pdfFile || pdfUploading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {pdfUploading ? '적용 중...' : '적용하기'}
            </Button>
          )}
          {pdfResult && (
            <Button
              variant="contained"
              onClick={() => {
                handleClosePdfDialog();
                window.location.reload();
              }}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              새로고침
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
