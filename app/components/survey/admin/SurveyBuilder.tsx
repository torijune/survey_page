import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormHelperText,
  Collapse,
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
  AccountTree,
  Delete,
  AddPhotoAlternate,
  Close,
  ExpandMore,
  ExpandLess,
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
  uploadImage,
} from '../../../api/surveys';
import SectionEditor from './SectionEditor';
import MarkdownEditor from './MarkdownEditor';
import FirstPageEditor from './FirstPageEditor';
import FirstPageRenderer from '../FirstPageRenderer';
import ResizableImage from './ResizableImage';

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
  
  // 로고 업로드 관련 상태
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOverLogo, setDragOverLogo] = useState(false);
  const [logoSettingsOpen, setLogoSettingsOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Desc(설명 페이지) 접기/펼치기
  const [expandedDescIndices, setExpandedDescIndices] = useState<Set<number>>(new Set());
  const toggleDescExpanded = (index: number) => {
    setExpandedDescIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  
  // 모든 질문 목록 (변수 삽입용) - useMemo로 최적화
  const allQuestions = useMemo(() => {
    if (!survey) return [];
    return survey.sections.flatMap(s => s.questions).filter(q => q.id);
  }, [survey]);
  
  // 설문 로드
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        setLoading(true);
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
    showSnackbar('로고가 삭제되었습니다.', 'success');
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
  
  // 로고 크기 계산
  const logoSize = useMemo(() => {
    if (!survey) return { width: 48, height: 48 };
    const hasText = survey.organization_name || survey.organization_subtitle;
    
    if (!hasText && survey.logo_url) {
      return {
        width: survey.logo_width || 120,
        height: survey.logo_height || 120,
      };
    }
    
    return {
      width: survey.logo_width || 48,
      height: survey.logo_height || 48,
    };
  }, [survey?.logo_url, survey?.logo_width, survey?.logo_height, survey?.organization_name, survey?.organization_subtitle]);

  // 텍스트 위치에 따른 레이아웃 방향 결정
  const layoutDirection = useMemo(() => {
    if (!survey) return 'row';
    const position = survey.text_position || 'right';
    return (position === 'top' || position === 'bottom') ? 'column' : 'row';
  }, [survey?.text_position]);

  // 텍스트 위치에 따른 정렬
  const textAlignment = useMemo(() => {
    if (!survey) return 'flex-start';
    const position = survey.text_position || 'right';
    if (position === 'left' || position === 'top') return 'flex-start';
    if (position === 'right' || position === 'bottom') return 'flex-end';
    return 'center';
  }, [survey?.text_position]);
  
  // 섹션 변경
  const handleSectionChange = (sectionIndex: number, updatedSection: Section) => {
    if (survey) {
      const newSections = [...survey.sections];
      newSections[sectionIndex] = updatedSection;
      setSurvey({ ...survey, sections: newSections });
    }
  };
  
  // 섹션 추가 (맨 끝에 추가)
  const handleAddSection = async () => {
    handleInsertSection(survey?.sections.length ?? 0);
  };
  
  // 섹션 삽입 (특정 위치에 삽입)
  const handleInsertSection = async (sectionIndex: number) => {
    if (!survey) return;
    
    try {
      const newSection = await createSection({
        survey_id: survey.id!,
        title: '',
        order_index: sectionIndex,
      });
      const newSections = [...survey.sections];
      newSections.splice(sectionIndex, 0, { ...newSection, questions: [] });
      newSections.forEach((s, i) => { s.order_index = i; });
      setSurvey({ ...survey, sections: newSections });
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
  
  // 문항 추가 (로컬에만 추가, 저장 버튼으로 DB 저장) - 맨 끝에 추가
  const handleAddQuestion = (sectionIndex: number) => {
    handleInsertQuestion(sectionIndex, undefined);
  };
  
  // 문항 삽입 (특정 위치에 삽입, insertIndex 미입력 시 맨 끝)
  const handleInsertQuestion = (sectionIndex: number, insertIndex?: number) => {
    if (!survey) return;
    
    const section = survey.sections[sectionIndex];
    const targetIndex = insertIndex !== undefined ? insertIndex : section.questions.length;
    
    const newQuestion: Question = {
      type: 'short_text',
      title: '',
      required: false,
      order_index: targetIndex,
      is_hidden: false,
      options: [],
    };
    
    const newSections = [...survey.sections];
    const newQuestions = [...section.questions];
    newQuestions.splice(targetIndex, 0, newQuestion);
    // order_index 갱신
    newQuestions.forEach((q, i) => { q.order_index = i; });
    newSections[sectionIndex] = {
      ...section,
      questions: newQuestions,
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
          ranking_config: question.ranking_config,
          repeatable_config: question.repeatable_config,
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
          ranking_config: question.ranking_config,
          repeatable_config: question.repeatable_config,
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
  
  // 문항 순서 변경 (드래그 앤 드롭)
  const handleMoveQuestion = (sectionIndex: number, fromIndex: number, toIndex: number) => {
    if (!survey) return;
    if (fromIndex === toIndex) return;
    
    const section = survey.sections[sectionIndex];
    const newQuestions = [...section.questions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    newQuestions.forEach((q, i) => { q.order_index = i; });
    
    const newSections = [...survey.sections];
    newSections[sectionIndex] = { ...section, questions: newQuestions };
    setSurvey({ ...survey, sections: newSections });
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
    // DB에 저장되지 않은 새 문항은 로컬에서만 제거
    if (!question.id) {
      const newSections = [...survey.sections];
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        questions: newSections[sectionIndex].questions.filter((_, i) => i !== questionIndex),
      };
      newSections[sectionIndex].questions.forEach((q, i) => { q.order_index = i; });
      setSurvey({ ...survey, sections: newSections });
      return;
    }
    
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
      const updateData = {
        title: titleToSave,
        description: survey.description,
        description_pages: survey.description_pages,
        allow_edit: survey.allow_edit,
        duplicate_prevention: survey.duplicate_prevention,
        logo_url: survey.logo_url,
        organization_name: survey.organization_name,
        organization_subtitle: survey.organization_subtitle,
        logo_width: survey.logo_width,
        logo_height: survey.logo_height,
        text_position: survey.text_position,
        first_page_content: survey.first_page_content,
        completion_content: survey.completion_content,
      };
      console.log('설문 저장 데이터:', updateData);
      await updateSurvey(survey.id!, updateData);
      
      // 모든 섹션 업데이트를 병렬로 처리
      const sectionUpdatePromises = survey.sections
        .filter(section => section.id)
        .map(section => 
          updateSection(section.id!, {
            title: section.title,
            description: section.description,
            order_index: section.order_index,
          })
        );
      await Promise.all(sectionUpdatePromises);
      
      // 모든 질문 업데이트를 병렬로 처리
      const questionUpdatePromises: Promise<any>[] = [];
      for (const section of survey.sections) {
        for (const question of section.questions) {
          if (question.id) {
            // 제목이 "새 문항"이면 빈 문자열로 저장
            const titleToSave = question.title === '새 문항' ? '' : question.title;
            questionUpdatePromises.push(
              updateQuestion(question.id, {
                type: question.type,
                title: titleToSave,
                description: question.description,
                required: question.required,
                order_index: question.order_index,
                is_hidden: question.is_hidden,
                question_number: question.question_number,
                validation_rules: question.validation_rules,
                conditional_logic: question.conditional_logic || null,
                likert_config: question.likert_config,
                ranking_config: question.ranking_config || null,
                repeatable_config: question.repeatable_config || null,
                options: question.options,
              })
            );
          }
        }
      }
      await Promise.all(questionUpdatePromises);
      
      // 저장 후 설문 다시 로드
      if (survey.id) {
        console.log('저장 전 설문 상태:', {
          logo_url: survey.logo_url,
          logo_width: survey.logo_width,
          logo_height: survey.logo_height,
          text_position: survey.text_position,
        });
        const updatedSurvey = await getSurvey(survey.id);
        console.log('저장 후 로드된 설문 상태:', {
          logo_url: updatedSurvey.logo_url,
          logo_width: updatedSurvey.logo_width,
          logo_height: updatedSurvey.logo_height,
          text_position: updatedSurvey.text_position,
        });
        setSurvey(updatedSurvey);
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
                  onClick={() => router.push('/m7k9p2/surveys')}
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
                startIcon={<AccountTree />}
                onClick={() => router.push(`/m7k9p2/surveys/${surveyId}/flow`)}
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
                흐름 편집
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Visibility />}
                onClick={() => router.push(`/m7k9p2/surveys/${surveyId}/preview`)}
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
          
          {/* 로고 및 조직명 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} color="grey.700" sx={{ mb: 2 }}>
              로고 및 조직명
            </Typography>
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
                <Box sx={{ minWidth: 150, flex: 1 }}>
                  <TextField
                    fullWidth
                    label="부제목"
                    placeholder="부제목 (예: 서울특별시)"
                    value={survey.organization_subtitle || ''}
                    onChange={(e) => handleSurveyChange('organization_subtitle', e.target.value)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    fullWidth
                    label="조직명"
                    placeholder="조직명 (예: 서울신용보증재단)"
                    value={survey.organization_name || ''}
                    onChange={(e) => handleSurveyChange('organization_name', e.target.value)}
                    size="small"
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
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              이미지를 드래그 앤 드롭하거나 클릭하여 업로드하세요.
            </Typography>
          </Box>
          
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
          
          {/* 설문지 첫 페이지 (설명 페이지·질문과 별도로 분리) */}
          <Typography variant="subtitle2" fontWeight={600} color="grey.700" sx={{ mb: 2, mt: 2 }}>
            설문지 첫 페이지
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            응답자가 설문을 시작할 때 가장 먼저 보는 한 페이지입니다. 비우면 설명 페이지나 첫 질문부터 표시됩니다. 텍스트 블록(마크다운·이미지)과 표 블록을 추가하여 구성하세요. 표는 셀 색, 굵게, 글자색, 행/열 추가·삭제로 직접 편집할 수 있습니다.
          </Typography>
          <FirstPageEditor
            value={survey.first_page_content || ''}
            onChange={(value) => handleSurveyChange('first_page_content', value)}
            placeholder="설문 시작 시 표시할 내용. {{survey_title}} 로 설문 제목 삽입. 이미지 드래그 앤 드롭 가능."
          />
          {(survey.first_page_content ?? '').trim() !== '' && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E5E7EB' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                첫 페이지 미리보기 (실제 설문에서 보이는 텍스트·이미지·표)
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#FAFAFA', borderRadius: 2 }}>
                <FirstPageRenderer content={survey.first_page_content} />
              </Paper>
            </Box>
          )}
          
          {/* 설명 페이지 목록 */}
          <Typography variant="subtitle2" fontWeight={600} color="grey.700" sx={{ mb: 2, mt: 3 }}>
            설명 페이지 (Desc1, Desc2, ...)
          </Typography>
          
          {(survey.description_pages || []).map((page, index) => (
            <Box key={index}>
              {/* Desc 삽입 버튼 (위쪽) */}
              <Button
                fullWidth
                startIcon={<Add />}
                onClick={() => {
                  const newPages = [...(survey.description_pages || [])];
                  const nextIndex = `Desc${newPages.length + 1}`;
                  newPages.splice(index, 0, { index: nextIndex, content: '' });
                  handleSurveyChange('description_pages', newPages);
                }}
                variant="outlined"
                size="small"
                sx={{ mb: 1, borderRadius: 2, borderStyle: 'dashed', color: 'grey.500' }}
              >
                Desc 삽입
              </Button>
              <Paper
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid #E5E7EB',
                  borderRadius: 2,
                  overflow: 'hidden',
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
                  <Button
                    startIcon={<Delete />}
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newPages = (survey.description_pages || []).filter((_, i) => i !== index);
                      handleSurveyChange('description_pages', newPages.length > 0 ? newPages : undefined);
                    }}
                  >
                    삭제
                  </Button>
                </Box>
                <Collapse in={expandedDescIndices.has(index)}>
                  <Box sx={{ p: 2 }}>
                    <TextField
                      label="인덱스"
                      value={page.index}
                      onChange={(e) => {
                        const newPages = [...(survey.description_pages || [])];
                        newPages[index] = { ...newPages[index], index: e.target.value };
                        handleSurveyChange('description_pages', newPages);
                      }}
                      placeholder="Desc1"
                      size="small"
                      sx={{ width: 150, mb: 2 }}
                    />
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
            </Box>
          ))}
          
          <Button
            startIcon={<Add />}
            onClick={() => {
              const newPages = survey.description_pages || [];
              const nextIndex = `Desc${newPages.length + 1}`;
              handleSurveyChange('description_pages', [...newPages, { index: nextIndex, content: '' }]);
            }}
            variant="outlined"
            sx={{ mb: 3 }}
          >
            설명 페이지 추가
          </Button>
          
          {/* 설문 종료(완료) 페이지 */}
          <Typography variant="subtitle2" fontWeight={600} color="grey.700" sx={{ mb: 2, mt: 3 }}>
            설문 종료 페이지
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            응답 제출 후 보여줄 완료 화면입니다. 비우면 기본 메시지가 표시됩니다. 설문 제목은 <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>{'{{survey_title}}'}</code> 로 삽입할 수 있습니다. 이미지는 에디터에서 드래그 앤 드롭으로 추가하세요.
          </Typography>
          <MarkdownEditor
            value={survey.completion_content || ''}
            onChange={(value) => handleSurveyChange('completion_content', value)}
            label=""
            placeholder="# 설문이 완료되었습니다!&#10;&#10;{{survey_title}} 설문에 참여해주셔서 감사합니다.&#10;&#10;소중한 응답이 정상적으로 제출되었습니다.&#10;&#10;![이미지 설명](이미지 URL)"
            rows={10}
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
            <Box key={section.id || sIndex} sx={{ mb: 2 }}>
              {/* 섹션 삽입 버튼 (위쪽) */}
              <Button
                fullWidth
                startIcon={<Add />}
                onClick={() => handleInsertSection(sIndex)}
                variant="outlined"
                size="small"
                sx={{ mb: 1.5, borderRadius: 2, borderStyle: 'dashed', color: 'grey.500' }}
              >
                섹션 삽입
              </Button>
              <SectionEditor
                section={section}
                sectionIndex={sIndex}
                onChange={(s) => handleSectionChange(sIndex, s)}
                onDelete={() => handleDeleteSection(sIndex)}
                onAddQuestion={() => handleAddQuestion(sIndex)}
                onInsertQuestion={(qIndex) => handleInsertQuestion(sIndex, qIndex)}
                onMoveQuestion={(fromIndex, toIndex) => handleMoveQuestion(sIndex, fromIndex, toIndex)}
                onDeleteQuestion={(qIndex) => handleDeleteQuestion(sIndex, qIndex)}
                onQuestionChange={(qIndex, q) => handleQuestionChange(sIndex, qIndex, q)}
                onSaveQuestion={(qIndex) => handleSaveQuestion(sIndex, qIndex)}
                onToggleQuestionHide={(qIndex) => handleToggleQuestionHide(sIndex, qIndex)}
                allQuestions={allQuestions}
              />
            </Box>
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
      
      {/* 로고 설정 다이얼로그 */}
      <Dialog open={logoSettingsOpen} onClose={() => setLogoSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>로고 설정</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* 로고 너비 */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                로고 너비: {survey?.logo_width || 48}px
              </Typography>
              <Slider
                value={survey?.logo_width || 48}
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
                로고 높이: {survey?.logo_height || 48}px
              </Typography>
              <Slider
                value={survey?.logo_height || 48}
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
                value={survey?.text_position || 'right'}
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
    </Box>
  );
}
