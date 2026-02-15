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
  Collapse,
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
  ExpandMore,
  ExpandLess,
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
import ResizableImage from './ResizableImage';
import FirstPageEditor from './FirstPageEditor';
import FirstPageRenderer from '../FirstPageRenderer';
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
  const [expandedDescIndices, setExpandedDescIndices] = useState<Set<number>>(new Set());
  const toggleDescExpanded = (index: number) => {
    setExpandedDescIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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
      console.log('로고 업로드 성공, URL:', url);
      if (!url) {
        throw new Error('업로드된 이미지 URL을 받지 못했습니다.');
      }
      handleSurveyChange('logo_url', url);
      console.log('로고 URL 저장됨:', url);
      showSnackbar('로고가 업로드되었습니다.', 'success');
    } catch (err: any) {
      console.error('로고 업로드 실패:', err);
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
      allow_other: false,
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
        { label: '선택지 1', value: '1', order_index: 0, allow_other: false },
        { label: '선택지 2', value: '2', order_index: 1, allow_other: false },
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
      is_conditional: false,
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

  // 문항 렌더링 (표시 번호: 사용자가 입력한 question_number만 사용, 자동 생성 인덱스는 표시하지 않음)
  const renderQuestion = (question: Question, sectionIndex: number, questionIndex: number) => {
    const questionNumber = question.question_number || '';
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
          {questionNumber && (
            <Typography variant="body1" fontWeight={600} sx={{ color: '#6B7280', minWidth: 40 }}>
              {questionNumber}.
            </Typography>
          )}
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

        {/* 문항 설명 (마크다운·이미지, 질문과 선택지 사이 표시) */}
        <Box sx={{ ml: 5, mb: 2 }}>
          <MarkdownEditor
            value={question.description || ''}
            onChange={(value) => handleQuestionChange(sectionIndex, questionIndex, 'description', value)}
            label=""
            placeholder="설명 추가 (선택사항, 이미지 드래그 앤 드롭 가능)"
            rows={4}
            showLivePreview={true}
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

        {/* 순위 선택 */}
        {question.type === 'ranking' && (
          <Box sx={{ ml: 5, mt: 2 }}>
            {question.options && question.options.length > 0 ? (
              <Box>
                {question.ranking_config?.rank_labels?.map((rankLabel, rankIndex) => (
                  <Box
                    key={rankIndex}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: '1px solid #E5E7EB',
                      borderRadius: 2,
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      {rankLabel} 선택
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        border: '1px dashed #D1D5DB',
                        borderRadius: 1,
                        backgroundColor: 'white',
                        color: '#9CA3AF',
                      }}
                    >
                      드롭다운 선택
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  p: 2,
                  border: '1px dashed #D1D5DB',
                  borderRadius: 2,
                  backgroundColor: '#F9FAFB',
                  color: '#9CA3AF',
                }}
              >
                순위 선택 (선택지가 없습니다)
              </Box>
            )}
          </Box>
        )}

        {/* 반복 입력 (주소 등) */}
        {question.type === 'repeatable_inputs' && (
          <Box sx={{ ml: 5, mt: 2 }}>
            {(question.repeatable_config?.parts?.length ?? 0) > 0 ? (
              <Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 2, pb: 2, borderBottom: '1px solid #E5E7EB' }}>
                  <Typography component="span" variant="body2">①</Typography>
                  {(question.repeatable_config as { parts?: { type: string; value?: string; key?: string }[] }).parts?.map((part: { type: string; value?: string; key?: string }, i: number) =>
                    part.type === 'text' ? (
                      <Typography key={i} component="span" variant="body2">{part.value || ''}</Typography>
                    ) : (
                      <Typography key={i} component="span" variant="body2" sx={{ border: '1px solid #D1D5DB', px: 0.5, borderRadius: 0.5 }}>( )</Typography>
                    )
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">+ 추가 버튼으로 행 추가</Typography>
              </Box>
            ) : (
              <Box sx={{ p: 2, border: '1px dashed #D1D5DB', borderRadius: 2, backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                반복 입력 (형식 설정 필요)
              </Box>
            )}
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
                <ResizableImage
                  src={survey.logo_url}
                  width={survey.logo_width || logoSize.width}
                  height={survey.logo_height || logoSize.height}
                  onSizeChange={(newWidth, newHeight) => {
                    handleSurveyChange('logo_width', newWidth);
                    handleSurveyChange('logo_height', newHeight);
                  }}
                  onDelete={handleLogoDelete}
                  onImageClick={() => logoInputRef.current?.click()}
                  minWidth={24}
                  minHeight={24}
                  maxWidth={500}
                  maxHeight={500}
                  maintainAspectRatio={false}
                />
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
                  variant="caption"
                  onStyleChange={() => {}}
                />
                <EditableText
                  value={survey.organization_name || ''}
                  onChange={(value) => handleSurveyChange('organization_name', value)}
                  placeholder="조직명 (예: 서울신용보증재단)"
                  variant="subtitle"
                  onStyleChange={() => {}}
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

        {/* 설문지 첫 페이지 (설명·질문보다 먼저 편집 가능) */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1F2937' }}>
            설문지 첫 페이지
          </Typography>
          <Paper
            elevation={0}
            onClick={() => setSelectedElement('first-page')}
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 2,
              border: selectedElement === 'first-page' ? '2px solid #3B82F6' : '2px dashed #D1D5DB',
              backgroundColor: selectedElement === 'first-page' ? '#F0F7FF' : '#FAFAFA',
              '&:hover': {
                borderColor: '#3B82F6',
                backgroundColor: '#F0F7FF',
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              응답자가 설문을 시작할 때 가장 먼저 보는 한 페이지입니다. 텍스트 블록과 표 블록을 추가해 구성하세요. 표는 셀 색, 굵게, 글자색, 행/열 추가·삭제로 직접 편집할 수 있습니다.
            </Typography>
            <FirstPageEditor
              value={survey.first_page_content || ''}
              onChange={(value) => handleSurveyChange('first_page_content', value)}
              placeholder="설문 시작 시 표시할 내용. {{survey_title}} 로 설문 제목 삽입."
            />
            {(survey.first_page_content ?? '').trim() !== '' && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #E5E7EB' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  첫 페이지 미리보기 (실제 설문에서 보이는 텍스트·이미지·표)
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#FAFAFA', borderRadius: 2 }}>
                  <FirstPageRenderer content={survey.first_page_content} />
                </Paper>
              </Box>
            )}
          </Paper>
        </Box>

        {/* 설명 페이지 목록 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1F2937' }}>
            설명 페이지 (Desc1, Desc2, ...)
          </Typography>
          
          {(survey.description_pages || []).map((page, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                mb: 2,
                borderRadius: 2,
                border: selectedElement === `desc-${index}` ? '2px solid #3B82F6' : '2px dashed #D1D5DB',
                backgroundColor: selectedElement === `desc-${index}` ? '#F0F7FF' : '#FAFAFA',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: '#3B82F6',
                  backgroundColor: '#F0F7FF',
                },
              }}
            >
              <Box
                sx={{
                  p: 2,
                  backgroundColor: '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  borderBottom: expandedDescIndices.has(index) ? '1px solid #E5E7EB' : 'none',
                }}
                onClick={() => toggleDescExpanded(index)}
              >
                <IconButton size="small">
                  {expandedDescIndices.has(index) ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
                <Typography variant="subtitle2" fontWeight={600}>
                  {page.index || `Desc${index + 1}`}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="삭제">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newPages = (survey.description_pages || []).filter((_, i) => i !== index);
                      handleSurveyChange('description_pages', newPages.length > 0 ? newPages : undefined);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Collapse in={expandedDescIndices.has(index)}>
                <Box sx={{ p: 3 }} onClick={() => setSelectedElement(`desc-${index}`)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#6B7280', minWidth: 80 }}>
                      인덱스:
                    </Typography>
                    <EditableText
                      value={page.index}
                      onChange={(value) => {
                        const newPages = [...(survey.description_pages || [])];
                        newPages[index] = { ...newPages[index], index: value };
                        handleSurveyChange('description_pages', newPages);
                      }}
                      variant="body"
                      placeholder="Desc1"
                      onStyleChange={() => {}}
                    />
                  </Box>
                  <MarkdownEditor
                    value={page.content}
                    onChange={(value) => {
                      const newPages = [...(survey.description_pages || [])];
                      newPages[index] = { ...newPages[index], content: value };
                      handleSurveyChange('description_pages', newPages);
                    }}
                    label=""
                    placeholder="설명 페이지 내용을 입력하세요. Markdown 형식을 사용할 수 있습니다."
                    rows={8}
                  />
                </Box>
              </Collapse>
            </Paper>
          ))}
          
          <Button
            startIcon={<Add />}
            onClick={() => {
              const newPages = survey.description_pages || [];
              const nextIndex = `Desc${newPages.length + 1}`;
              handleSurveyChange('description_pages', [...newPages, { index: nextIndex, content: '' }]);
            }}
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
            설명 페이지 추가
          </Button>
        </Box>

        {/* 설문 종료 페이지 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1F2937' }}>
            설문 종료 페이지
          </Typography>
          <Paper
            elevation={0}
            onClick={() => setSelectedElement('completion-page')}
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 2,
              border: selectedElement === 'completion-page' ? '2px solid #3B82F6' : '2px dashed #D1D5DB',
              backgroundColor: selectedElement === 'completion-page' ? '#F0F7FF' : '#FAFAFA',
              '&:hover': {
                borderColor: '#3B82F6',
                backgroundColor: '#F0F7FF',
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              응답 제출 후 표시되는 완료 화면입니다. 비우면 기본 메시지 표시. {'{{survey_title}}'} 로 설문 제목 삽입. 이미지는 드래그 앤 드롭으로 추가 가능.
            </Typography>
            <MarkdownEditor
              value={survey.completion_content || ''}
              onChange={(value) => handleSurveyChange('completion_content', value)}
              label=""
              placeholder="# 설문이 완료되었습니다!&#10;&#10;{{survey_title}} 설문에 참여해주셔서 감사합니다."
              rows={8}
            />
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
