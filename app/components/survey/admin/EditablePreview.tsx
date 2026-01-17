import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  FormHelperText,
} from '@mui/material';
import {
  Save,
  Add,
  Delete,
  DragIndicator,
  Visibility,
  VisibilityOff,
  ContentCopy,
  ArrowUpward,
  ArrowDownward,
  AddPhotoAlternate,
  Edit,
  Close,
  Settings,
} from '@mui/icons-material';
import {
  Survey,
  Section,
  Question,
  QuestionOption,
  updateSurvey,
  updateSection,
  createSection,
  deleteSection,
  updateQuestion,
  createQuestion,
  deleteQuestion,
  uploadImage,
} from '../../../api/surveys';
import EditableText from './EditableText';
import EditableLikert from './EditableLikert';
import MarkdownEditor from './MarkdownEditor';
import {
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  TextQuestion,
  NumberQuestion,
  DateQuestion,
  DropdownQuestion,
  LikertQuestion,
} from '../questions';

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: 'small' | 'medium' | 'large';
}

interface EditablePreviewProps {
  survey: Survey;
  onSurveyChange: (survey: Survey) => void;
  onSave: () => Promise<void>;
}

export default function EditablePreview({
  survey,
  onSurveyChange,
  onSave,
}: EditablePreviewProps) {
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOverLogo, setDragOverLogo] = useState(false);
  const [logoSettingsOpen, setLogoSettingsOpen] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // 모든 질문을 평탄화
  const allQuestions = useMemo(() => {
    const questions: { question: Question; sectionIndex: number; questionIndex: number }[] = [];
    survey.sections.forEach((section, sIndex) => {
      section.questions.forEach((question, qIndex) => {
        questions.push({ question, sectionIndex: sIndex, questionIndex: qIndex });
      });
    });
    return questions;
  }, [survey]);

  // 섹션 번호 생성 (A, B, C...)
  const getSectionLetter = (sectionIndex: number): string => {
    return String.fromCharCode(65 + sectionIndex);
  };

  // 문항 번호 생성 (A1, A2, B1...)
  const getQuestionNumber = (sectionIndex: number, questionIndex: number): string => {
    const sectionLetter = getSectionLetter(sectionIndex);
    return `${sectionLetter}${questionIndex + 1}`;
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // 로고 이미지 업로드 (파일 객체 직접 받기)
  const handleLogoUploadFile = async (file: File) => {
    if (!file) return;

    // 이미지 파일인지 확인
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      showSnackbar('이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await uploadImage(file);
      handleSurveyChange('logo_url', url);
      showSnackbar('로고가 업로드되었습니다.', 'success');
    } catch (err: any) {
      showSnackbar(err.message || '로고 업로드에 실패했습니다.', 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  // 로고 이미지 업로드 (파일 입력 이벤트)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleLogoUploadFile(file);
    }
  };

  // 로고 이미지 삭제
  const handleLogoDelete = () => {
    handleSurveyChange('logo_url', null);
  };


  // 드래그 앤 드롭 핸들러
  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLogo(false);
  };

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLogo(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) =>
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
    );

    if (imageFile) {
      await handleLogoUploadFile(imageFile);
    } else {
      showSnackbar('이미지 파일만 업로드할 수 있습니다.', 'error');
    }
  };

  // 설문 정보 변경
  const handleSurveyChange = (field: keyof Survey, value: any) => {
    onSurveyChange({ ...survey, [field]: value });
    setHasChanges(true);
  };

  // 섹션 변경
  const handleSectionChange = (sectionIndex: number, field: keyof Section, value: any) => {
    const newSections = [...survey.sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], [field]: value };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 문항 변경
  const handleQuestionChange = (sectionIndex: number, questionIndex: number, field: keyof Question, value: any) => {
    const newSections = [...survey.sections];
    const newQuestions = [...newSections[sectionIndex].questions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], [field]: value };
    newSections[sectionIndex] = { ...newSections[sectionIndex], questions: newQuestions };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 선택지 변경
  const handleOptionChange = (sectionIndex: number, questionIndex: number, optionIndex: number, field: keyof QuestionOption, value: any) => {
    const newSections = [...survey.sections];
    const newQuestions = [...newSections[sectionIndex].questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options: newOptions };
    newSections[sectionIndex] = { ...newSections[sectionIndex], questions: newQuestions };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 선택지 추가
  const handleAddOption = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...survey.sections];
    const newQuestions = [...newSections[sectionIndex].questions];
    const currentOptions = newQuestions[questionIndex].options;
    const newOption: QuestionOption = {
      label: '',
      value: String(currentOptions.length + 1),
      order_index: currentOptions.length,
    };
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: [...currentOptions, newOption],
    };
    newSections[sectionIndex] = { ...newSections[sectionIndex], questions: newQuestions };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 선택지 삭제
  const handleDeleteOption = (sectionIndex: number, questionIndex: number, optionIndex: number) => {
    const newSections = [...survey.sections];
    const newQuestions = [...newSections[sectionIndex].questions];
    const newOptions = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options: newOptions };
    newSections[sectionIndex] = { ...newSections[sectionIndex], questions: newQuestions };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 문항 추가
  const handleAddQuestion = async (sectionIndex: number) => {
    const section = survey.sections[sectionIndex];
    const newQuestion: Question = {
      type: 'single_choice',
      title: '새 문항',
      required: false,
      order_index: section.questions.length,
      is_hidden: false,
      options: [
        { label: '선택지 1', value: '1', order_index: 0 },
        { label: '선택지 2', value: '2', order_index: 1 },
      ],
    };
    
    const newSections = [...survey.sections];
    newSections[sectionIndex] = {
      ...section,
      questions: [...section.questions, newQuestion],
    };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 문항 삭제
  const handleDeleteQuestion = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...survey.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      questions: newSections[sectionIndex].questions.filter((_, i) => i !== questionIndex),
    };
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 문항 숨기기 토글
  const handleToggleHide = (sectionIndex: number, questionIndex: number) => {
    const question = survey.sections[sectionIndex].questions[questionIndex];
    handleQuestionChange(sectionIndex, questionIndex, 'is_hidden', !question.is_hidden);
  };

  // 섹션 추가
  const handleAddSection = () => {
    const newSection: Section = {
      title: '새 섹션',
      survey_id: survey.id!,
      order_index: survey.sections.length,
      questions: [],
    };
    onSurveyChange({ ...survey, sections: [...survey.sections, newSection] });
    setHasChanges(true);
  };

  // 섹션 삭제
  const handleDeleteSection = (sectionIndex: number) => {
    const newSections = survey.sections.filter((_, i) => i !== sectionIndex);
    onSurveyChange({ ...survey, sections: newSections });
    setHasChanges(true);
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      setHasChanges(false);
      showSnackbar('저장되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e.message || '저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 로고 크기 계산 (텍스트가 없으면 크게 표시) - useMemo로 최적화
  const logoSize = useMemo(() => {
    const hasText = survey.organization_name || survey.organization_subtitle;
    
    if (!hasText && survey.logo_url) {
      // 텍스트가 없으면 로고를 크게 표시
      return {
        width: survey.logo_width || 120,
        height: survey.logo_height || 120,
      };
    }
    
    // 텍스트가 있으면 설정된 크기 또는 기본값
    return {
      width: survey.logo_width || 48,
      height: survey.logo_height || 48,
    };
  }, [survey.logo_url, survey.logo_width, survey.logo_height, survey.organization_name, survey.organization_subtitle]);

  // 텍스트 위치에 따른 레이아웃 방향 결정
  const layoutDirection = useMemo(() => {
    const position = survey.text_position || 'right';
    return (position === 'top' || position === 'bottom') ? 'column' : 'row';
  }, [survey.text_position]);

  // 텍스트 위치에 따른 정렬
  const textAlignment = useMemo(() => {
    const position = survey.text_position || 'right';
    if (position === 'left' || position === 'top') return 'flex-start';
    if (position === 'right' || position === 'bottom') return 'flex-end';
    return 'center';
  }, [survey.text_position]);

  // 문항 렌더링
  const renderQuestion = (question: Question, sectionIndex: number, questionIndex: number) => {
    const questionNumber = getQuestionNumber(sectionIndex, questionIndex);
    const isSelected = selectedElement === `q-${sectionIndex}-${questionIndex}`;

    return (
      <Paper
        key={question.id || `${sectionIndex}-${questionIndex}`}
        elevation={0}
        onClick={() => setSelectedElement(`q-${sectionIndex}-${questionIndex}`)}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
          backgroundColor: question.is_hidden ? '#F9FAFB' : 'white',
          opacity: question.is_hidden ? 0.7 : 1,
          position: 'relative',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: '#3B82F6',
          },
        }}
      >
        {/* 문항 컨트롤 */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.2s',
            '.MuiPaper-root:hover &': { opacity: 1 },
          }}
        >
          <Tooltip title={question.is_hidden ? '표시하기' : '숨기기'}>
            <IconButton size="small" onClick={() => handleToggleHide(sectionIndex, questionIndex)}>
              {question.is_hidden ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="삭제">
            <IconButton size="small" color="error" onClick={() => handleDeleteQuestion(sectionIndex, questionIndex)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 숨김 표시 */}
        {question.is_hidden && (
          <Chip
            label="숨김"
            size="small"
            sx={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#FEF3C7', color: '#92400E' }}
          />
        )}

        {/* 문항 제목 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
          <Typography variant="body1" fontWeight={600} sx={{ color: '#6B7280', minWidth: 40 }}>
            {questionNumber}.
          </Typography>
          <Box sx={{ flex: 1 }}>
            <EditableText
              value={question.title}
              onChange={(value) => handleQuestionChange(sectionIndex, questionIndex, 'title', value)}
              variant="subtitle"
              placeholder="문항 제목을 입력하세요"
              onStyleChange={(style) => {
                // 스타일 저장 로직 (필요시 확장)
              }}
            />
            {question.required && (
              <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                *
              </Typography>
            )}
          </Box>
        </Box>

        {/* 문항 설명 */}
        <Box sx={{ ml: 5, mb: 2 }}>
          <EditableText
            value={question.description || ''}
            onChange={(value) => handleQuestionChange(sectionIndex, questionIndex, 'description', value)}
            variant="caption"
            placeholder="설명 추가 (선택사항)"
          />
        </Box>

        {/* 선택지 (단일선택/다중선택) */}
        {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
          <Box sx={{ ml: 5 }}>
            {question.options.map((option, optIndex) => (
              <Box
                key={option.id || optIndex}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1.5,
                  p: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: '#F9FAFB',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: question.type === 'single_choice' ? '50%' : 1,
                    border: '2px solid #D1D5DB',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <EditableText
                    value={option.label}
                    onChange={(value) => handleOptionChange(sectionIndex, questionIndex, optIndex, 'label', value)}
                    variant="body"
                    placeholder="선택지 텍스트"
                  />
                </Box>
                <Tooltip title="삭제">
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteOption(sectionIndex, questionIndex, optIndex)}
                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
            <Button
              startIcon={<Add />}
              onClick={() => handleAddOption(sectionIndex, questionIndex)}
              size="small"
              sx={{ mt: 1, ml: 3 }}
            >
              선택지 추가
            </Button>
          </Box>
        )}

        {/* 리커트 척도 */}
        {question.type === 'likert' && question.likert_config && (
          <Box sx={{ ml: 5, mt: 2 }}>
            <EditableLikert
              config={question.likert_config}
              onChange={(newConfig) => handleQuestionChange(sectionIndex, questionIndex, 'likert_config', newConfig)}
            />
          </Box>
        )}

        {/* 텍스트 입력 */}
        {(question.type === 'short_text' || question.type === 'long_text') && (
          <Box sx={{ ml: 5, mt: 2 }}>
            <Box
              sx={{
                p: 2,
                border: '1px dashed #D1D5DB',
                borderRadius: 2,
                backgroundColor: '#F9FAFB',
                color: '#9CA3AF',
              }}
            >
              {question.type === 'short_text' ? '짧은 텍스트 입력란' : '긴 텍스트 입력란'}
            </Box>
          </Box>
        )}

        {/* 숫자 입력 */}
        {question.type === 'number' && (
          <Box sx={{ ml: 5, mt: 2 }}>
            <Box
              sx={{
                p: 2,
                border: '1px dashed #D1D5DB',
                borderRadius: 2,
                backgroundColor: '#F9FAFB',
                color: '#9CA3AF',
                width: 200,
              }}
            >
              숫자 입력란
            </Box>
          </Box>
        )}

        {/* 날짜 선택 */}
        {question.type === 'date' && (
          <Box sx={{ ml: 5, mt: 2 }}>
            <Box
              sx={{
                p: 2,
                border: '1px dashed #D1D5DB',
                borderRadius: 2,
                backgroundColor: '#F9FAFB',
                color: '#9CA3AF',
                width: 200,
              }}
            >
              날짜 선택
            </Box>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC', pb: 10 }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* 헤더 - 로고와 조직명 (편집 가능) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box 
            onDragOver={handleLogoDragOver}
            onDragLeave={handleLogoDragLeave}
            onDrop={handleLogoDrop}
            sx={{ 
              display: 'flex', 
              flexDirection: layoutDirection,
              alignItems: textAlignment,
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              border: dragOverLogo ? '2px dashed #3B82F6' : '2px dashed #D1D5DB',
              backgroundColor: dragOverLogo ? '#EFF6FF' : '#FAFAFA',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#3B82F6',
                backgroundColor: '#F0F7FF',
              },
            }}
          >
            {/* 로고 이미지 영역 */}
            <Box sx={{ position: 'relative' }}>
              {survey.logo_url ? (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={survey.logo_url}
                    alt="로고"
                    sx={{
                      width: logoSize.width,
                      height: logoSize.height,
                      objectFit: 'contain',
                      borderRadius: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => logoInputRef.current?.click()}
                  />
                  <IconButton
                    size="small"
                    onClick={handleLogoDelete}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#EF4444',
                      color: 'white',
                      width: 20,
                      height: 20,
                      '&:hover': { backgroundColor: '#DC2626' },
                    }}
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  onClick={() => logoInputRef.current?.click()}
                  sx={{
                    width: logoSize.width,
                    height: logoSize.height,
                    borderRadius: 1,
                    border: dragOverLogo ? '2px dashed #3B82F6' : '2px dashed #D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: dragOverLogo ? '#EFF6FF' : '#F9FAFB',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#3B82F6',
                      backgroundColor: '#EFF6FF',
                    },
                  }}
                >
                  {uploadingLogo ? (
                    <CircularProgress size={20} />
                  ) : (
                    <AddPhotoAlternate sx={{ color: dragOverLogo ? '#3B82F6' : '#9CA3AF', fontSize: 24 }} />
                  )}
                </Box>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
            </Box>

            {/* 조직명 편집 영역 */}
            {(survey.organization_name || survey.organization_subtitle || !survey.logo_url) && (
              <Box sx={{ minWidth: 150 }}>
                <EditableText
                  value={survey.organization_subtitle || ''}
                  onChange={(value) => handleSurveyChange('organization_subtitle', value)}
                  placeholder="부제목 (예: 서울특별시)"
                  variant="body"
                  onStyleChange={() => {}}
                  sx={{
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    display: 'block',
                    lineHeight: 1.2,
                    mb: 0.5,
                  }}
                />
                <EditableText
                  value={survey.organization_name || ''}
                  onChange={(value) => handleSurveyChange('organization_name', value)}
                  placeholder="조직명 (예: 서울신용보증재단)"
                  variant="body"
                  onStyleChange={() => {}}
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#3B82F6',
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                />
              </Box>
            )}
            
            {/* 로고 설정 버튼 */}
            {survey.logo_url && (
              <Tooltip title="로고 설정">
                <IconButton
                  size="small"
                  onClick={() => setLogoSettingsOpen(true)}
                  sx={{ ml: 1 }}
                >
                  <Settings sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          {/* 편집 모드 표시 */}
          <Chip
            label="편집 모드"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
        
        {/* 설문 제목 */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <EditableText
            value={survey.title}
            onChange={(value) => handleSurveyChange('title', value)}
            variant="title"
            placeholder="설문 제목을 입력하세요"
            onStyleChange={() => {}}
          />
        </Box>

        {/* 첫 페이지 (소개 콘텐츠) 편집 */}
        <Box sx={{ mb: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: '2px dashed #D1D5DB',
              backgroundColor: '#FAFAFA',
              '&:hover': {
                borderColor: '#3B82F6',
                backgroundColor: '#F0F7FF',
              },
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1F2937' }}>
              설문 시작 페이지 콘텐츠
            </Typography>
            <MarkdownEditor
              value={survey.intro_content || ''}
              onChange={(value) => handleSurveyChange('intro_content', value)}
              label=""
              placeholder="설문 시작 전에 표시될 안내 문구를 입력하세요. Markdown 형식을 사용할 수 있습니다."
              rows={10}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              이 콘텐츠는 설문 시작 전 첫 페이지에 표시됩니다. 비워두면 첫 페이지가 표시되지 않습니다.
            </Typography>
          </Paper>
        </Box>

        {/* 섹션 목록 */}
        {survey.sections.map((section, sIndex) => (
          <Box key={section.id || sIndex} sx={{ mb: 4 }}>
            {/* 섹션 헤더 */}
            <Paper
              elevation={0}
              onClick={() => setSelectedElement(`s-${sIndex}`)}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                backgroundColor: '#F3F4F6',
                border: selectedElement === `s-${sIndex}` ? '2px solid #3B82F6' : '1px solid transparent',
                position: 'relative',
                '&:hover': {
                  borderColor: '#3B82F6',
                },
              }}
            >
              {/* 섹션 컨트롤 */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 0.5,
                  opacity: selectedElement === `s-${sIndex}` ? 1 : 0,
                  transition: 'opacity 0.2s',
                  '.MuiPaper-root:hover &': { opacity: 1 },
                }}
              >
                <Tooltip title="삭제">
                  <IconButton size="small" color="error" onClick={() => handleDeleteSection(sIndex)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={600} sx={{ color: '#374151' }}>
                  {getSectionLetter(sIndex)}.
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <EditableText
                    value={section.title}
                    onChange={(value) => handleSectionChange(sIndex, 'title', value)}
                    variant="subtitle"
                    placeholder="섹션 제목을 입력하세요"
                    onStyleChange={() => {}}
                  />
                </Box>
              </Box>
            </Paper>

            {/* 문항 목록 */}
            {section.questions.map((question, qIndex) =>
              renderQuestion(question, sIndex, qIndex)
            )}

            {/* 문항 추가 버튼 */}
            <Button
              startIcon={<Add />}
              onClick={() => handleAddQuestion(sIndex)}
              variant="outlined"
              fullWidth
              sx={{
                borderRadius: 2,
                borderStyle: 'dashed',
                py: 1.5,
                color: '#6B7280',
                borderColor: '#D1D5DB',
                '&:hover': {
                  borderColor: '#3B82F6',
                  color: '#3B82F6',
                  backgroundColor: 'transparent',
                },
              }}
            >
              문항 추가
            </Button>
          </Box>
        ))}

        {/* 섹션 추가 버튼 */}
        <Button
          startIcon={<Add />}
          onClick={handleAddSection}
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 2,
            borderStyle: 'dashed',
            py: 2,
            color: '#6B7280',
            borderColor: '#D1D5DB',
            '&:hover': {
              borderColor: '#3B82F6',
              color: '#3B82F6',
              backgroundColor: 'transparent',
            },
          }}
        >
          섹션 추가
        </Button>

        {/* 푸터 */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            Powered by SurveyMachine
          </Typography>
        </Box>
      </Container>

      {/* 저장 FAB */}
      <Fab
        color="primary"
        onClick={handleSave}
        disabled={saving}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
        }}
      >
        {saving ? <CircularProgress size={24} color="inherit" /> : <Save />}
      </Fab>

      {/* 변경사항 표시 */}
      {hasChanges && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 3,
            py: 1.5,
            borderRadius: 3,
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
          }}
        >
          <Typography variant="body2" fontWeight={600} color="#92400E">
            저장되지 않은 변경사항이 있습니다
          </Typography>
        </Paper>
      )}

      {/* 로고 설정 다이얼로그 */}
      <Dialog open={logoSettingsOpen} onClose={() => setLogoSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>로고 설정</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* 로고 너비 */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                로고 너비: {survey.logo_width || 48}px
              </Typography>
              <Slider
                value={survey.logo_width || 48}
                onChange={(_, value) => handleSurveyChange('logo_width', value as number)}
                min={24}
                max={200}
                step={4}
                marks={[
                  { value: 24, label: '24px' },
                  { value: 100, label: '100px' },
                  { value: 200, label: '200px' },
                ]}
              />
            </Box>

            {/* 로고 높이 */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                로고 높이: {survey.logo_height || 48}px
              </Typography>
              <Slider
                value={survey.logo_height || 48}
                onChange={(_, value) => handleSurveyChange('logo_height', value as number)}
                min={24}
                max={200}
                step={4}
                marks={[
                  { value: 24, label: '24px' },
                  { value: 100, label: '100px' },
                  { value: 200, label: '200px' },
                ]}
              />
            </Box>

            {/* 텍스트 위치 */}
            <FormControl fullWidth>
              <InputLabel>텍스트 위치</InputLabel>
              <Select
                value={survey.text_position || 'right'}
                onChange={(e) => handleSurveyChange('text_position', e.target.value)}
                label="텍스트 위치"
              >
                <MenuItem value="right">오른쪽</MenuItem>
                <MenuItem value="left">왼쪽</MenuItem>
                <MenuItem value="top">위</MenuItem>
                <MenuItem value="bottom">아래</MenuItem>
              </Select>
              <FormHelperText>
                텍스트가 없을 때는 로고가 자동으로 크게 표시됩니다.
              </FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoSettingsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
