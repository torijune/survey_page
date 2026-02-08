import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowBack, ArrowForward, Send, Remove, Add } from '@mui/icons-material';
import { Survey, Question, ResponseItem, startResponse, submitResponse, updateResponseItems } from '../../api/surveys';
import QuestionRenderer from './QuestionRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface Answers {
  [questionId: string]: {
    answer_value?: any;
    answer_text?: string;
  };
}

interface SurveyFormProps {
  survey: Survey;
  onComplete: () => void;
  showNavigation?: boolean;
}

export default function SurveyForm({ survey, onComplete, showNavigation = false }: SurveyFormProps) {
  const [showIntro, setShowIntro] = useState(false); // 첫 페이지(소개) 표시 여부
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // survey.intro_content가 변경되면 showIntro 업데이트
  useEffect(() => {
    const hasIntroContent = survey.intro_content && survey.intro_content.trim();
    setShowIntro(!!hasIntroContent);
  }, [survey.intro_content]);

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
      width: survey.logo_width || 40,
      height: survey.logo_height || 40,
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
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  
  // 글씨 크기 조절 (로컬 스토리지에 저장)
  // fontSizeLevel: -5 (최소) ~ +5 (최대), 기본값 0
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('survey-font-size-level');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  
  // 글씨 크기 단계 범위
  const MIN_FONT_SIZE_LEVEL = -5;
  const MAX_FONT_SIZE_LEVEL = 5;
  
  // 기본 글씨 크기 (level 0 기준)
  const baseFontSizes = {
    base: 1.0,      // 1rem = 16px
    h1: 2.0,        // 2rem = 32px
    h2: 1.5,        // 1.5rem = 24px
    h3: 1.25,       // 1.25rem = 20px
    h4: 1.125,      // 1.125rem = 18px
    h5: 1.0,        // 1rem = 16px
    h6: 1.0,        // 1rem = 16px
    body1: 1.0,     // 1rem = 16px
    body2: 0.875,   // 0.875rem = 14px
    caption: 0.75,  // 0.75rem = 12px
  };
  
  // 단계당 증가율 (각 단계마다 10%씩 증가/감소)
  const FONT_SIZE_STEP = 0.1; // 10%
  
  // 현재 단계에 맞는 글씨 크기 계산
  const calculateFontSize = (baseSize: number): string => {
    const multiplier = 1 + (fontSizeLevel * FONT_SIZE_STEP);
    const calculatedSize = baseSize * multiplier;
    // 최소 0.5rem, 최대 3rem으로 제한
    const clampedSize = Math.max(0.5, Math.min(3.0, calculatedSize));
    return `${clampedSize}rem`;
  };
  
  // 현재 글씨 크기 설정
  const currentFontSize = {
    base: calculateFontSize(baseFontSizes.base),
    h1: calculateFontSize(baseFontSizes.h1),
    h2: calculateFontSize(baseFontSizes.h2),
    h3: calculateFontSize(baseFontSizes.h3),
    h4: calculateFontSize(baseFontSizes.h4),
    h5: calculateFontSize(baseFontSizes.h5),
    h6: calculateFontSize(baseFontSizes.h6),
    body1: calculateFontSize(baseFontSizes.body1),
    body2: calculateFontSize(baseFontSizes.body2),
    caption: calculateFontSize(baseFontSizes.caption),
  };
  
  // 글씨 크기 증가
  const handleFontSizeIncrease = () => {
    if (fontSizeLevel < MAX_FONT_SIZE_LEVEL) {
      const newLevel = fontSizeLevel + 1;
      setFontSizeLevel(newLevel);
      if (typeof window !== 'undefined') {
        localStorage.setItem('survey-font-size-level', newLevel.toString());
      }
    }
  };
  
  // 글씨 크기 감소
  const handleFontSizeDecrease = () => {
    if (fontSizeLevel > MIN_FONT_SIZE_LEVEL) {
      const newLevel = fontSizeLevel - 1;
      setFontSizeLevel(newLevel);
      if (typeof window !== 'undefined') {
        localStorage.setItem('survey-font-size-level', newLevel.toString());
      }
    }
  };
  
  // 모든 질문을 평탄화하여 하나의 배열로 만들기 (변수 치환을 위해 모든 질문 포함)
  const allQuestions = useMemo(() => {
    const questions: Question[] = [];
    
    survey.sections.forEach(section => {
      section.questions.forEach(question => {
        // 변수 치환을 위해 모든 질문 포함 (숨겨진 문항도 포함)
        questions.push(question);
      });
    });
    
    return questions;
  }, [survey]);
  
  // 표시할 질문만 필터링 (숨겨진 문항 제외)
  const visibleQuestionsList = useMemo(() => {
    return allQuestions.filter(q => !q.is_hidden);
  }, [allQuestions]);
  
  // 조건부 로직 처리 - 표시할 질문 필터링
  const visibleQuestions = useMemo(() => {
    return visibleQuestionsList.filter(q => {
      if (!q.conditional_logic) return true;
      
      const { question_id, operator, value, action } = q.conditional_logic;
      const answer = answers[question_id];
      
      if (!answer) return action !== 'show';
      
      let conditionMet = false;
      const answerValue = answer.answer_value;
      
      // value가 배열인지 확인 (다중 조건 값)
      const conditionValues = Array.isArray(value) ? value : [value];
      
      switch (operator) {
        case 'equals':
          // 단일 값 응답: 조건 값 배열에 포함되는지 확인
          // 다중 값 응답: 조건 값 배열과 겹치는지 확인
          if (Array.isArray(answerValue)) {
            conditionMet = answerValue.some(val => conditionValues.includes(val));
          } else {
            conditionMet = conditionValues.includes(answerValue);
          }
          break;
        case 'not_equals':
          // 단일 값 응답: 조건 값 배열에 포함되지 않는지 확인
          // 다중 값 응답: 조건 값 배열과 겹치지 않는지 확인
          if (Array.isArray(answerValue)) {
            conditionMet = !answerValue.some(val => conditionValues.includes(val));
          } else {
            conditionMet = !conditionValues.includes(answerValue);
          }
          break;
        case 'contains':
          // 다중 선택 응답에서 조건 값 중 하나라도 포함되는지 확인
          if (Array.isArray(answerValue)) {
            conditionMet = conditionValues.some(val => answerValue.includes(val));
          } else {
            conditionMet = conditionValues.includes(answerValue);
          }
          break;
        case 'not_contains':
          // 다중 선택 응답에서 조건 값이 모두 포함되지 않는지 확인
          if (Array.isArray(answerValue)) {
            conditionMet = !conditionValues.some(val => answerValue.includes(val));
          } else {
            conditionMet = !conditionValues.includes(answerValue);
          }
          break;
        case 'greater_than':
          // 숫자 비교: 조건 값 중 하나라도보다 큰지 확인
          const numValue = typeof answerValue === 'number' ? answerValue : parseFloat(String(answerValue));
          conditionMet = conditionValues.some(val => {
            const numCondition = typeof val === 'number' ? val : parseFloat(String(val));
            return !isNaN(numValue) && !isNaN(numCondition) && numValue > numCondition;
          });
          break;
        case 'less_than':
          // 숫자 비교: 조건 값 중 하나라도보다 작은지 확인
          const numValue2 = typeof answerValue === 'number' ? answerValue : parseFloat(String(answerValue));
          conditionMet = conditionValues.some(val => {
            const numCondition = typeof val === 'number' ? val : parseFloat(String(val));
            return !isNaN(numValue2) && !isNaN(numCondition) && numValue2 < numCondition;
          });
          break;
        default:
          conditionMet = false;
      }
      
      return action === 'show' ? conditionMet : !conditionMet;
    });
  }, [allQuestions, answers]);
  
  // 현재 질문
  const currentQuestion = visibleQuestions[currentQuestionIndex];
  
  // 현재 질문이 속한 섹션 찾기
  const currentSection = useMemo(() => {
    if (!currentQuestion || !currentQuestion.section_id) return null;
    return survey.sections.find(section => 
      section.id === currentQuestion.section_id
    ) || null;
  }, [currentQuestion, survey.sections]);
  
  // 섹션 번호 생성 (A, B, C...)
  const getSectionLetter = (sectionIndex: number): string => {
    return String.fromCharCode(65 + sectionIndex); // A=65, B=66, C=67...
  };
  
  // 문항 번호 생성 (저장된 question_number 우선, 없으면 A1, A2, B1... 형식으로 생성)
  const getQuestionNumber = (question: Question): string => {
    // 저장된 question_number가 있으면 우선 사용
    if (question.question_number) {
      return question.question_number;
    }
    
    if (!question.section_id) return '';
    
    // 섹션 인덱스 찾기
    const sectionIndex = survey.sections.findIndex(s => s.id === question.section_id);
    if (sectionIndex === -1) return '';
    
    const sectionLetter = getSectionLetter(sectionIndex);
    
    // 해당 섹션 내에서 문항 인덱스 찾기 (숨겨진 문항 제외)
    const sectionQuestions = survey.sections[sectionIndex].questions.filter(q => !q.is_hidden);
    const questionIndex = sectionQuestions.findIndex(q => q.id === question.id);
    if (questionIndex === -1) return '';
    
    return `${sectionLetter}${questionIndex + 1}`;
  };
  
  // 현재 섹션 번호
  const currentSectionLetter = useMemo(() => {
    if (!currentSection) return '';
    const sectionIndex = survey.sections.findIndex(s => s.id === currentSection.id);
    return sectionIndex >= 0 ? getSectionLetter(sectionIndex) : '';
  }, [currentSection, survey.sections]);
  
  // 현재 문항 번호
  const currentQuestionNumber = useMemo(() => {
    if (!currentQuestion) return '';
    return getQuestionNumber(currentQuestion);
  }, [currentQuestion, survey.sections]);

  // 특정 질문으로 이동 (네비게이션 바에서 사용)
  const handleQuestionClick = (questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 네비게이션 바 렌더링
  const renderNavigationBar = () => {
    if (!showNavigation) return null;

    return (
      <Paper
        elevation={2}
        sx={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          overflowY: 'auto',
          zIndex: 1000,
          borderRadius: 0,
          borderRight: '1px solid #E5E7EB',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB' }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: '#1F2937' }}>
            질문 목록
          </Typography>
        </Box>
        <List sx={{ py: 1 }}>
          {visibleQuestions.map((question, index) => {
            const questionNumber = getQuestionNumber(question);
            const isActive = index === currentQuestionIndex;
            const hasAnswer = answers[question.id!] && (
              answers[question.id!].answer_value !== undefined || 
              answers[question.id!].answer_text
            );

            return (
              <ListItem key={question.id} disablePadding>
                <ListItemButton
                  onClick={() => handleQuestionClick(index)}
                  selected={isActive}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: '#EFF6FF',
                      borderLeft: '3px solid #3B82F6',
                      '&:hover': {
                        backgroundColor: '#DBEAFE',
                      },
                    },
                    '&:hover': {
                      backgroundColor: '#F9FAFB',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={isActive ? 600 : 500}
                          sx={{
                            color: isActive ? '#3B82F6' : '#1F2937',
                            minWidth: 40,
                          }}
                        >
                          {questionNumber || `Q${index + 1}`}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#6B7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {question.title || '제목 없음'}
                        </Typography>
                        {hasAnswer && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    );
  };
  
  // 진행률 계산
  const answeredCount = useMemo(() => {
    return allQuestions.filter(q => {
      const answer = answers[q.id!];
      return answer && (answer.answer_value !== undefined || answer.answer_text);
    }).length;
  }, [allQuestions, answers]);
  
  // 응답 시작
  useEffect(() => {
    const initResponse = async () => {
      if (!responseId && survey.id) {
        setLoading(true);
        try {
          const response = await startResponse(survey.id);
          setResponseId(response.id!);
        } catch (e) {
          console.error('응답 시작 실패:', e);
        } finally {
          setLoading(false);
        }
      }
    };
    initResponse();
  }, [survey.id, responseId]);

  // cleanup: 컴포넌트 unmount 시 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  // 백그라운드 저장 함수 (비동기, await 없음)
  const saveAnswersInBackground = useCallback(async (answersToSave: Answers) => {
    if (!responseId || !survey.allow_edit) return;
    
    try {
      const items: ResponseItem[] = Object.entries(answersToSave).map(([questionId, data]) => ({
        question_id: questionId,
        answer_value: data.answer_value,
        answer_text: data.answer_text,
      }));
      await updateResponseItems(responseId, items);
      pendingSaveRef.current = false;
    } catch (e) {
      console.error('자동 저장 실패:', e);
      pendingSaveRef.current = false;
    }
  }, [responseId, survey.allow_edit]);

  // 답변 변경 핸들러 (debounce 적용)
  const handleAnswerChange = useCallback((questionId: string, data: { answer_value?: any; answer_text?: string }) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: data,
      };
      
      // debounce: 2초 후 자동 저장
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (!pendingSaveRef.current) {
          pendingSaveRef.current = true;
          saveAnswersInBackground(newAnswers);
        }
      }, 2000);
      
      return newAnswers;
    });
    
    // 에러 클리어
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  }, [errors, saveAnswersInBackground]);
  
  // 현재 질문 검증
  const validateCurrentQuestion = (): boolean => {
    if (!currentQuestion) return true;
    
    const newErrors: Record<string, string> = {};
    const q = currentQuestion;
    
    if (q.required) {
      const answer = answers[q.id!];
      if (!answer || (answer.answer_value === undefined && !answer.answer_text)) {
        newErrors[q.id!] = '필수 항목입니다.';
      } else if (Array.isArray(answer.answer_value) && answer.answer_value.length === 0) {
        newErrors[q.id!] = '최소 하나 이상 선택해주세요.';
      }
    }
    
    // 유효성 검증
    const answer = answers[q.id!];
    if (answer && q.validation_rules) {
      const rules = q.validation_rules;
      
      if (answer.answer_text) {
        if (rules.min_length && answer.answer_text.length < rules.min_length) {
          newErrors[q.id!] = `최소 ${rules.min_length}자 이상 입력해주세요.`;
        }
        if (rules.max_length && answer.answer_text.length > rules.max_length) {
          newErrors[q.id!] = `최대 ${rules.max_length}자까지 입력 가능합니다.`;
        }
        if (rules.pattern === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(answer.answer_text)) {
            newErrors[q.id!] = '올바른 이메일 형식이 아닙니다.';
          }
        }
      }
      
      if (answer.answer_value !== undefined && typeof answer.answer_value === 'number') {
        if (rules.min_value !== undefined && answer.answer_value < rules.min_value) {
          newErrors[q.id!] = `최소값은 ${rules.min_value}입니다.`;
        }
        if (rules.max_value !== undefined && answer.answer_value > rules.max_value) {
          newErrors[q.id!] = `최대값은 ${rules.max_value}입니다.`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 다음 질문으로 이동 (즉시 이동, 저장은 백그라운드)
  const handleNext = () => {
    if (!validateCurrentQuestion()) return;
    
    // debounce 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // 즉시 저장 (백그라운드, await 없음)
    if (responseId && survey.allow_edit) {
      pendingSaveRef.current = true;
      saveAnswersInBackground(answers).catch(e => {
        console.error('저장 실패:', e);
      });
    }
    
    // 즉시 다음 질문으로 이동 (저장 완료를 기다리지 않음)
    if (currentQuestionIndex < visibleQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // 이전 질문으로 이동
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // 제출 (제출 시에는 저장 완료를 기다림)
  const handleSubmit = async () => {
    if (!validateCurrentQuestion()) return;
    if (!responseId) return;
    
    // debounce 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // 마지막 저장 완료 대기 (필요한 경우)
    if (pendingSaveRef.current && responseId && survey.allow_edit) {
      // 잠시 대기하여 저장 완료 확인
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const items: ResponseItem[] = Object.entries(answers).map(([questionId, data]) => ({
        question_id: questionId,
        answer_value: data.answer_value,
        answer_text: data.answer_text,
      }));
      
      await submitResponse(responseId, {
        items,
        user_info: survey.duplicate_prevention ? userInfo : undefined,
      });
      
      onComplete();
    } catch (e: any) {
      setSubmitError(e.message || '응답 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1;
  
  // visibleQuestions가 변경되면 인덱스 조정
  useEffect(() => {
    if (currentQuestionIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentQuestionIndex]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (visibleQuestions.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          표시할 질문이 없습니다.
        </Alert>
      </Container>
    );
  }
  
  // 첫 페이지(소개) 표시
  const hasIntroContent = survey.intro_content && survey.intro_content.trim();
  if (showIntro && hasIntroContent) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex' }}>
        {renderNavigationBar()}
        <Box sx={{ flex: 1, marginLeft: showNavigation ? '280px' : 0 }}>
          <Container maxWidth="md" sx={{ py: 4 }}>
          {/* 헤더 - 로고와 진행바 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            {/* 로고 영역 */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: layoutDirection,
                alignItems: textAlignment,
                gap: 1,
              }}
            >
              {survey.logo_url ? (
                <Box
                  component="img"
                  src={survey.logo_url}
                  alt="로고"
                  sx={{
                    width: logoSize.width,
                    height: logoSize.height,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: logoSize.width,
                    height: logoSize.height,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                  }}
                >
                  S
                </Box>
              )}
              {(survey.organization_name || survey.organization_subtitle) && (
                <Box>
                  {survey.organization_subtitle && (
                    <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', lineHeight: 1.2, fontSize: currentFontSize.caption }}>
                      {survey.organization_subtitle}
                    </Typography>
                  )}
                  {survey.organization_name && (
                    <Typography variant="h6" sx={{ color: '#3B82F6', fontWeight: 700, lineHeight: 1.2, fontSize: currentFontSize.h6 }}>
                      {survey.organization_name}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            
            {/* 진행바와 글씨 크기 조절 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 글씨 크기 조절 버튼 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
                <Tooltip title="글씨 크기 줄이기">
                  <IconButton
                    size="small"
                    onClick={handleFontSizeDecrease}
                    disabled={fontSizeLevel <= MIN_FONT_SIZE_LEVEL}
                    sx={{
                      color: fontSizeLevel <= MIN_FONT_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                      '&:hover': {
                        backgroundColor: fontSizeLevel <= MIN_FONT_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                      },
                      '&.Mui-disabled': {
                        color: '#D1D5DB',
                      },
                    }}
                  >
                    <Remove fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="글씨 크기 늘리기">
                  <IconButton
                    size="small"
                    onClick={handleFontSizeIncrease}
                    disabled={fontSizeLevel >= MAX_FONT_SIZE_LEVEL}
                    sx={{
                      color: fontSizeLevel >= MAX_FONT_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                      '&:hover': {
                        backgroundColor: fontSizeLevel >= MAX_FONT_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                      },
                      '&.Mui-disabled': {
                        color: '#D1D5DB',
                      },
                    }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {/* 진행바 */}
              <Box sx={{ width: 200 }}>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#E5E7EB',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: '5%',
                      backgroundColor: '#3B82F6',
                      borderRadius: 3,
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* 설문 제목 */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              mb: 4,
              color: '#1F2937',
              fontSize: currentFontSize.h4,
            }}
          >
            {survey.title || '설문'}
          </Typography>
          
          {/* 소개 콘텐츠 */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 2,
                mb: 2,
              },
              '& p': {
                mb: 2,
                lineHeight: 1.8,
                fontSize: currentFontSize.body1,
                color: '#374151',
              },
              '& ul, & ol': {
                pl: 3,
                mb: 2,
              },
              '& li': {
                mb: 1,
                lineHeight: 1.8,
                color: '#374151',
                fontSize: currentFontSize.body1,
              },
              '& h1': {
                fontSize: currentFontSize.h1,
                fontWeight: 700,
                mb: 2,
                mt: 3,
              },
              '& h2': {
                fontSize: currentFontSize.h2,
                fontWeight: 600,
                mb: 1.5,
                mt: 2.5,
              },
              '& h3': {
                fontSize: currentFontSize.h3,
                fontWeight: 600,
                mb: 1,
                mt: 2,
              },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {survey.intro_content || ''}
            </ReactMarkdown>
          </Paper>
          
          {/* 다음 버튼 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => setShowIntro(false)}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: currentFontSize.body1,
                fontWeight: 600,
                backgroundColor: '#3B82F6',
                '&:hover': {
                  backgroundColor: '#2563EB',
                },
              }}
            >
              다음
            </Button>
          </Box>
          
          {/* 푸터 */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: currentFontSize.caption }}>
              Powered by SurveyMachine
            </Typography>
          </Box>
        </Container>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex' }}>
      {renderNavigationBar()}
      <Box sx={{ flex: 1, marginLeft: showNavigation ? '280px' : 0 }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
        {/* 헤더 - 로고와 진행바 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          {/* 로고 영역 */}
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: layoutDirection,
              alignItems: textAlignment,
              gap: 1,
            }}
          >
            {survey.logo_url ? (
              <Box
                component="img"
                src={survey.logo_url}
                alt="로고"
                sx={{
                  width: logoSize.width,
                  height: logoSize.height,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: logoSize.width,
                  height: logoSize.height,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                }}
              >
                S
              </Box>
            )}
            {(survey.organization_name || survey.organization_subtitle) && (
              <Box>
                {survey.organization_subtitle && (
                  <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', lineHeight: 1.2, fontSize: currentFontSize.caption }}>
                    {survey.organization_subtitle}
                  </Typography>
                )}
                {survey.organization_name && (
                  <Typography variant="h6" sx={{ color: '#3B82F6', fontWeight: 700, lineHeight: 1.2, fontSize: currentFontSize.h6 }}>
                    {survey.organization_name}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          
          {/* 진행바와 글씨 크기 조절 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 글씨 크기 조절 버튼 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
              <Tooltip title="글씨 크기 줄이기">
                <IconButton
                  size="small"
                  onClick={handleFontSizeDecrease}
                  disabled={fontSizeLevel <= MIN_FONT_SIZE_LEVEL}
                  sx={{
                    color: fontSizeLevel <= MIN_FONT_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                    '&:hover': {
                      backgroundColor: fontSizeLevel <= MIN_FONT_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                    },
                    '&.Mui-disabled': {
                      color: '#D1D5DB',
                    },
                  }}
                >
                  <Remove fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="글씨 크기 늘리기">
                <IconButton
                  size="small"
                  onClick={handleFontSizeIncrease}
                  disabled={fontSizeLevel >= MAX_FONT_SIZE_LEVEL}
                  sx={{
                    color: fontSizeLevel >= MAX_FONT_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                    '&:hover': {
                      backgroundColor: fontSizeLevel >= MAX_FONT_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                    },
                    '&.Mui-disabled': {
                      color: '#D1D5DB',
                    },
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* 진행바 */}
            <Box sx={{ width: 200 }}>
              <Box
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#E5E7EB',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${((currentQuestionIndex + 1) / visibleQuestions.length) * 100}%`,
                    backgroundColor: '#3B82F6',
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
        
        {/* 섹션 제목 */}
        {currentSection?.title && (
          <Box
            sx={{
              backgroundColor: '#F3F4F6',
              p: 2,
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ color: '#1F2937', fontSize: currentFontSize.h6 }}>
              {currentSectionLetter && `${currentSectionLetter}. `}{currentSection.title}
            </Typography>
          </Box>
        )}
        
        {/* 현재 질문 */}
        {currentQuestion && (
          <>
            <QuestionRenderer
              key={currentQuestion.id}
              question={currentQuestion}
              questionNumber={currentQuestionNumber}
              answer={answers[currentQuestion.id!]}
              onChange={(data) => handleAnswerChange(currentQuestion.id!, data)}
              error={errors[currentQuestion.id!]}
              allQuestions={allQuestions}
              allAnswers={answers}
              fontSize={currentFontSize}
            />
          </>
        )}
        
        {/* 사용자 정보 입력 (마지막 질문에서만) */}
        {isLastQuestion && survey.duplicate_prevention && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: currentFontSize.h6 }}>
              응답자 정보
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: currentFontSize.body2 }}>
              중복 제출 방지를 위해 식별 정보를 입력해주세요. (이메일 또는 전화번호)
            </Typography>
            <TextField
              fullWidth
              value={userInfo}
              onChange={(e) => setUserInfo(e.target.value)}
              placeholder="이메일 또는 전화번호"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Paper>
        )}
        
        {/* 에러 메시지 */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {submitError}
          </Alert>
        )}
        
        {/* 네비게이션 버튼 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: 4 }}>
          {isLastQuestion ? (
            <Button
              variant="contained"
              endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
              onClick={handleSubmit}
              disabled={submitting}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                backgroundColor: '#3B82F6',
                '&:hover': {
                  backgroundColor: '#2563EB',
                },
              }}
            >
              제출하기
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                backgroundColor: '#3B82F6',
                '&:hover': {
                  backgroundColor: '#2563EB',
                },
              }}
            >
              다음
            </Button>
          )}
        </Box>
        
        {/* 푸터 */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: currentFontSize.caption }}>
            Powered by SurveyMachine
          </Typography>
        </Box>
      </Container>
      </Box>
    </Box>
  );
}

