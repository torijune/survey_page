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
import { ArrowBack, ArrowForward, Send, Remove, Add, TextFields, Image } from '@mui/icons-material';
import { Survey, Question, ResponseItem, startResponse, submitResponse, updateResponseItems } from '../../api/surveys';
import QuestionRenderer from './QuestionRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkPreserveNewlines } from '../../lib/remarkPreserveNewlines';
import FirstPageRenderer from './FirstPageRenderer';

const markdownPlugins = [remarkGfm, remarkBreaks, remarkPreserveNewlines()];

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
  /** 미리보기 모드: true이면 제출 시 API 호출 없이 onComplete만 호출 (실제 완료 페이지 연출용) */
  isPreview?: boolean;
}

export default function SurveyForm({ survey, onComplete, showNavigation = false, isPreview = false }: SurveyFormProps) {
  const [showIntro, setShowIntro] = useState(false); // 첫 페이지(소개) 표시 여부
  const [currentDescriptionPageIndex, setCurrentDescriptionPageIndex] = useState(0); // 현재 설명 페이지 인덱스
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // 설명 페이지 확인 (intro_content가 있으면 자동으로 Desc1로 변환)
  const descriptionPages = useMemo(() => {
    const pages = [...(survey.description_pages || [])];
    
    // intro_content가 있고 description_pages에 Desc1이 없으면 자동으로 Desc1로 변환
    if (survey.intro_content && survey.intro_content.trim()) {
      const hasDesc1 = pages.some(p => p.index === 'Desc1');
      if (!hasDesc1) {
        // Desc1을 맨 앞에 추가
        pages.unshift({ index: 'Desc1', content: survey.intro_content });
      }
    }
    
    return pages;
  }, [survey.description_pages, survey.intro_content]);
  
  const hasDescriptionPages = descriptionPages.length > 0;
  const hasFirstPageContent = useMemo(
    () => (survey.first_page_content ?? '').trim() !== '',
    [survey.first_page_content]
  );

  const [showFirstPage, setShowFirstPage] = useState(false);
  // 설문지 첫 페이지가 있으면 진입 시 첫 페이지부터 표시; 없으면 기존대로 설명 페이지/질문
  useEffect(() => {
    setShowFirstPage(!!hasFirstPageContent);
  }, [survey.id, hasFirstPageContent]);
  // 설명 페이지가 있으면 showIntro 활성화 (설문지 첫 페이지가 없을 때만, 있으면 첫 페이지 다음에 설명으로 감)
  useEffect(() => {
    if (!hasFirstPageContent) setShowIntro(hasDescriptionPages);
  }, [hasDescriptionPages, hasFirstPageContent]);

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
  
  // 글씨 크기 조절. 설문지 불러올 때마다 항상 기본(0)으로 시작
  // fontSizeLevel: -5 (최소) ~ +5 (최대), 기본값 0
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0);
  
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
      setFontSizeLevel(fontSizeLevel + 1);
    }
  };
  
  // 글씨 크기 감소
  const handleFontSizeDecrease = () => {
    if (fontSizeLevel > MIN_FONT_SIZE_LEVEL) {
      setFontSizeLevel(fontSizeLevel - 1);
    }
  };

  // 이미지 크기 레벨. 설문지 불러올 때마다 항상 기본(0)으로 시작
  const [imageSizeLevel, setImageSizeLevel] = useState<number>(0);
  
  // 이미지 크기 단계 범위 (텍스트와 동일)
  const MIN_IMAGE_SIZE_LEVEL = -5;
  const MAX_IMAGE_SIZE_LEVEL = 5;
  
  // 기본 이미지 크기 배율 (level 0 기준: 1.0 = 100%)
  const BASE_IMAGE_SIZE = 1.0;
  const IMAGE_SIZE_STEP = 0.1; // 각 단계마다 10%씩 증가/감소
  
  // 현재 단계에 맞는 이미지 크기 배율 계산
  const calculateImageSize = (baseSize: number): number => {
    const multiplier = 1 + (imageSizeLevel * IMAGE_SIZE_STEP);
    const calculatedSize = baseSize * multiplier;
    // 최소 50%, 최대 200%로 제한
    const clampedSize = Math.max(0.5, Math.min(2.0, calculatedSize));
    return clampedSize;
  };
  
  // 현재 이미지 크기 배율
  const currentImageSizeMultiplier = calculateImageSize(BASE_IMAGE_SIZE);
  
  // 로고 크기 (설정값 유지, 콘텐츠 이미지 크기 조절과 무관)
  const logoSize = useMemo(() => {
    const hasText = survey.organization_name || survey.organization_subtitle;
    
    if (!hasText && survey.logo_url) {
      return {
        width: survey.logo_width || 120,
        height: survey.logo_height || 120,
      };
    }
    return {
      width: survey.logo_width || 40,
      height: survey.logo_height || 40,
    };
  }, [survey.logo_url, survey.logo_width, survey.logo_height, survey.organization_name, survey.organization_subtitle]);
  
  // 이미지 크기 증가
  const handleImageSizeIncrease = () => {
    if (imageSizeLevel < MAX_IMAGE_SIZE_LEVEL) {
      setImageSizeLevel(imageSizeLevel + 1);
    }
  };
  
  // 이미지 크기 감소
  const handleImageSizeDecrease = () => {
    if (imageSizeLevel > MIN_IMAGE_SIZE_LEVEL) {
      setImageSizeLevel(imageSizeLevel - 1);
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
  
  // 조건 한 개 평가 (표시 여부는 호출 쪽에서 action으로 반영)
  const evaluateOneCondition = (c: { question_id: string; operator: string; value: any }, ans: Record<string, { answer_value: any }>): boolean => {
    const answer = ans[c.question_id];
    if (!answer) return false;
    const answerValue = answer.answer_value;
    const conditionValues = Array.isArray(c.value) ? c.value : [c.value];
    let conditionMet = false;
    switch (c.operator) {
      case 'equals':
        if (Array.isArray(answerValue)) {
          conditionMet = answerValue.some((val: any) => conditionValues.includes(val));
        } else {
          conditionMet = conditionValues.includes(answerValue);
        }
        break;
      case 'not_equals':
        if (Array.isArray(answerValue)) {
          conditionMet = !answerValue.some((val: any) => conditionValues.includes(val));
        } else {
          conditionMet = !conditionValues.includes(answerValue);
        }
        break;
      case 'contains':
        if (Array.isArray(answerValue)) {
          conditionMet = conditionValues.some((val: any) => answerValue.includes(val));
        } else {
          conditionMet = conditionValues.includes(answerValue);
        }
        break;
      case 'not_contains':
        if (Array.isArray(answerValue)) {
          conditionMet = !conditionValues.some((val: any) => answerValue.includes(val));
        } else {
          conditionMet = !conditionValues.includes(answerValue);
        }
        break;
      case 'greater_than': {
        const numValue = typeof answerValue === 'number' ? answerValue : parseFloat(String(answerValue));
        conditionMet = conditionValues.some((val: any) => {
          const numCondition = typeof val === 'number' ? val : parseFloat(String(val));
          return !isNaN(numValue) && !isNaN(numCondition) && numValue > numCondition;
        });
        break;
      }
      case 'less_than': {
        const numValue2 = typeof answerValue === 'number' ? answerValue : parseFloat(String(answerValue));
        conditionMet = conditionValues.some((val: any) => {
          const numCondition = typeof val === 'number' ? val : parseFloat(String(val));
          return !isNaN(numValue2) && !isNaN(numCondition) && numValue2 < numCondition;
        });
        break;
      }
      default:
        conditionMet = false;
    }
    return conditionMet;
  };

  // 조건부 로직 처리 - 표시할 질문 필터링 (여러 조건은 AND)
  const visibleQuestions = useMemo(() => {
    return visibleQuestionsList.filter(q => {
      const conditions = Array.isArray(q.conditional_logic)
        ? q.conditional_logic
        : q.conditional_logic
          ? [q.conditional_logic]
          : [];
      if (conditions.length === 0) return true;

      const allMet = conditions.every(c => evaluateOneCondition(c, answers));
      const action = conditions[0].action;
      return action === 'show' ? allMet : !allMet;
    });
  }, [visibleQuestionsList, answers]);
  
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
  
  // 표시할 문항 번호: 사용자가 직접 입력한 question_number가 있을 때만 사용 (자동 생성 인덱스는 표시하지 않음)
  const currentQuestionNumber = useMemo(() => {
    if (!currentQuestion) return '';
    if (currentQuestion.question_number) return getQuestionNumber(currentQuestion);
    return '';
  }, [currentQuestion, survey.sections]);

  // 특정 질문으로 이동 (네비게이션 바에서 사용)
  const handleQuestionClick = (questionIndex: number) => {
    setShowFirstPage(false);
    setCurrentQuestionIndex(questionIndex);
    setShowIntro(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 특정 설명 페이지로 이동 (네비게이션 바에서 사용)
  const handleDescriptionPageClick = (pageIndex: number) => {
    setShowFirstPage(false);
    setCurrentDescriptionPageIndex(pageIndex);
    setShowIntro(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 설문지 첫 페이지로 이동 (네비게이션 바에서 사용)
  const handleGoToFirstPage = () => {
    if (hasFirstPageContent) {
      setShowFirstPage(true);
    } else if (hasDescriptionPages) {
      setShowIntro(true);
      setCurrentDescriptionPageIndex(0);
    } else {
      setShowIntro(false);
      setCurrentQuestionIndex(0);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 뒤로 가기
  const handleBack = () => {
    if (showIntro && currentDescriptionPageIndex > 0) {
      setCurrentDescriptionPageIndex(currentDescriptionPageIndex - 1);
    } else if (showIntro && currentDescriptionPageIndex === 0) {
      if (hasFirstPageContent) setShowFirstPage(true);
      else setShowIntro(false);
    } else if (!showIntro && currentQuestionIndex > 0) {
      // 질문에서 이전 질문으로
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (!showIntro && currentQuestionIndex === 0) {
      if (hasDescriptionPages) {
        setCurrentDescriptionPageIndex(descriptionPages.length - 1);
        setShowIntro(true);
      } else if (hasFirstPageContent) {
        setShowFirstPage(true);
      }
    }
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
            목차
          </Typography>
        </Box>
        
        {/* 설문지 첫 페이지 */}
        <List sx={{ py: 0 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleGoToFirstPage}
              selected={(showFirstPage && hasFirstPageContent) || (!hasFirstPageContent && ((showIntro && currentDescriptionPageIndex === 0) || (!showIntro && currentQuestionIndex === 0 && !hasDescriptionPages)))}
              sx={{
                py: 1.5,
                px: 2,
                '&.Mui-selected': {
                  backgroundColor: '#EFF6FF',
                  borderLeft: '3px solid #3B82F6',
                  '&:hover': { backgroundColor: '#DBEAFE' },
                },
                '&:hover': { backgroundColor: '#F9FAFB' },
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={500} sx={{ color: '#1F2937' }}>
                    설문지 첫 페이지
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        </List>
        
        {/* 설명 페이지 목록 */}
        {hasDescriptionPages && (
          <>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB' }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: '#6B7280', textTransform: 'uppercase' }}>
                설명 페이지
              </Typography>
            </Box>
            <List sx={{ py: 0 }}>
              {descriptionPages.map((page, index) => {
                const isActive = showIntro && index === currentDescriptionPageIndex;

                return (
                  <ListItem key={`desc-${index}`} disablePadding>
                    <ListItemButton
                      onClick={() => handleDescriptionPageClick(index)}
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
                          <Typography
                            variant="body2"
                            fontWeight={isActive ? 600 : 500}
                            sx={{
                              color: isActive ? '#3B82F6' : '#1F2937',
                            }}
                          >
                            설명 페이지 {index + 1}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
        
        {/* 질문 목록 */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', borderTop: hasDescriptionPages ? '1px solid #E5E7EB' : 'none' }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#6B7280', textTransform: 'uppercase' }}>
            질문
          </Typography>
        </Box>
        <List sx={{ py: 1 }}>
          {visibleQuestions.map((question, index) => {
            const questionNumber = getQuestionNumber(question);
            const isActive = !showIntro && index === currentQuestionIndex;
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

        {/* 설문 마무리 페이지 (미리보기에서 완료 페이지로 이동) */}
        {isPreview && (
          <>
            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #E5E7EB' }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: '#6B7280', textTransform: 'uppercase' }}>
                마무리
              </Typography>
            </Box>
            <List sx={{ py: 0 }}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={onComplete}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&:hover': { backgroundColor: '#F9FAFB' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500} sx={{ color: '#1F2937' }}>
                        설문 마무리 페이지
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </>
        )}
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
      } else if (q.type === 'repeatable_inputs' && Array.isArray(answer?.answer_value)) {
        const hasAnyFilled = answer.answer_value.some(
          (row: Record<string, string>) => row && Object.values(row).some(v => v != null && String(v).trim() !== '')
        );
        if (!hasAnyFilled) {
          newErrors[q.id!] = '최소 한 행 이상 입력해주세요.';
        }
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
    } else if (currentQuestionIndex === 0 && hasDescriptionPages) {
      // 첫 질문에서 뒤로 가면 마지막 설명 페이지로
      setCurrentDescriptionPageIndex(descriptionPages.length - 1);
      setShowIntro(true);
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
      if (isPreview) {
        // 미리보기: API 제출 없이 완료 콜백만 호출 → 실제 배포 시의 마지막 페이지(완료 화면) 연출
        onComplete();
      } else {
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
      }
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
  
  // 설문지 첫 페이지 (first_page_content) 표시
  if (showFirstPage && hasFirstPageContent) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex' }}>
        {renderNavigationBar()}
        <Box sx={{ flex: 1, marginLeft: showNavigation ? '280px' : 0 }}>
          <Container maxWidth="md" sx={{ py: 4 }}>
            {/* 헤더 - 로고와 크기 조절 (설명 페이지와 동일) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: layoutDirection, alignItems: textAlignment, gap: 1 }}>
                {survey.logo_url ? (
                  <Box component="img" src={survey.logo_url} alt="로고" sx={{ width: logoSize.width, height: logoSize.height, objectFit: 'contain' }} />
                ) : (
                  <Box sx={{ width: logoSize.width, height: logoSize.height, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>S</Box>
                )}
                {(survey.organization_name || survey.organization_subtitle) && (
                  <Box>
                    {survey.organization_subtitle && <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', lineHeight: 1.2, fontSize: currentFontSize.caption }}>{survey.organization_subtitle}</Typography>}
                    {survey.organization_name && <Typography variant="h6" sx={{ color: '#3B82F6', fontWeight: 700, lineHeight: 1.2, fontSize: currentFontSize.h6 }}>{survey.organization_name}</Typography>}
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
                  <TextFields sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
                  <Tooltip title="글씨 크기 줄이기"><IconButton size="small" onClick={handleFontSizeDecrease} disabled={fontSizeLevel <= MIN_FONT_SIZE_LEVEL} sx={{ color: fontSizeLevel <= MIN_FONT_SIZE_LEVEL ? '#D1D5DB' : '#6B7280', '&:hover': { backgroundColor: fontSizeLevel <= MIN_FONT_SIZE_LEVEL ? 'transparent' : '#F3F4F6' }, '&.Mui-disabled': { color: '#D1D5DB' } }}><Remove fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="글씨 크기 늘리기"><IconButton size="small" onClick={handleFontSizeIncrease} disabled={fontSizeLevel >= MAX_FONT_SIZE_LEVEL} sx={{ color: fontSizeLevel >= MAX_FONT_SIZE_LEVEL ? '#D1D5DB' : '#6B7280', '&:hover': { backgroundColor: fontSizeLevel >= MAX_FONT_SIZE_LEVEL ? 'transparent' : '#F3F4F6' }, '&.Mui-disabled': { color: '#D1D5DB' } }}><Add fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="기본 크기로 되돌리기">
                  <Typography variant="caption" onClick={() => setFontSizeLevel(0)} sx={{ ml: 0.5, color: fontSizeLevel === 0 ? '#3B82F6' : '#9CA3AF', fontWeight: fontSizeLevel === 0 ? 600 : 400, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>기본</Typography>
                </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
                  <Image sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
                  <Tooltip title="콘텐츠 이미지 크기 줄이기 (설명·본문 이미지)"><IconButton size="small" onClick={handleImageSizeDecrease} disabled={imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL} sx={{ color: imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL ? '#D1D5DB' : '#6B7280', '&:hover': { backgroundColor: imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL ? 'transparent' : '#F3F4F6' }, '&.Mui-disabled': { color: '#D1D5DB' } }}><Remove fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="콘텐츠 이미지 크기 늘리기 (설명·본문 이미지)"><IconButton size="small" onClick={handleImageSizeIncrease} disabled={imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL} sx={{ color: imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL ? '#D1D5DB' : '#6B7280', '&:hover': { backgroundColor: imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL ? 'transparent' : '#F3F4F6' }, '&.Mui-disabled': { color: '#D1D5DB' } }}><Add fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="기본 크기로 되돌리기">
                  <Typography variant="caption" onClick={() => setImageSizeLevel(0)} sx={{ ml: 0.5, color: imageSizeLevel === 0 ? '#3B82F6' : '#9CA3AF', fontWeight: imageSizeLevel === 0 ? 600 : 400, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>기본</Typography>
                </Tooltip>
                </Box>
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 2, color: '#1F2937', fontSize: currentFontSize.h4 }}>{survey.title || '설문'}</Typography>
            <Paper elevation={0} sx={{ p: 4, mb: 3, borderRadius: 2, border: '1px solid #E5E7EB', backgroundColor: 'white' }}>
              <FirstPageRenderer
                content={survey.first_page_content}
                fontSizeBody={currentFontSize.body1}
                fontSizeH1={currentFontSize.h1}
                fontSizeH2={currentFontSize.h2}
                fontSizeH3={currentFontSize.h3}
                imageSizeMultiplier={currentImageSizeMultiplier}
              />
            </Paper>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
              <Button variant="contained" size="large" onClick={() => { setShowFirstPage(false); if (hasDescriptionPages) { setShowIntro(true); setCurrentDescriptionPageIndex(0); } else { setShowIntro(false); setCurrentQuestionIndex(0); } window.scrollTo({ top: 0, behavior: 'smooth' }); }} sx={{ borderRadius: 2, px: 4, py: 1.5, fontSize: currentFontSize.body1, fontWeight: 600, backgroundColor: '#3B82F6', '&:hover': { backgroundColor: '#2563EB' } }}>
                다음
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    );
  }

  // 첫 페이지(소개) 표시 - 설명 페이지들 표시
  if (showIntro && hasDescriptionPages && currentDescriptionPageIndex < descriptionPages.length) {
    const currentPage = descriptionPages[currentDescriptionPageIndex];
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
            
            {/* 진행바와 크기 조절 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 글씨 크기 조절 버튼 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
                <TextFields sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
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
                <Tooltip title="기본 크기로 되돌리기">
                  <Typography variant="caption" onClick={() => setFontSizeLevel(0)} sx={{ ml: 0.5, color: fontSizeLevel === 0 ? '#3B82F6' : '#9CA3AF', fontWeight: fontSizeLevel === 0 ? 600 : 400, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>기본</Typography>
                </Tooltip>
              </Box>
              
              {/* 이미지 크기 조절 버튼 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
                <Image sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
                <Tooltip title="콘텐츠 이미지 크기 줄이기 (설명·본문 이미지)">
                  <IconButton
                    size="small"
                    onClick={handleImageSizeDecrease}
                    disabled={imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL}
                    sx={{
                      color: imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                      '&:hover': {
                        backgroundColor: imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                      },
                      '&.Mui-disabled': {
                        color: '#D1D5DB',
                      },
                    }}
                  >
                    <Remove fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="콘텐츠 이미지 크기 늘리기 (설명·본문 이미지)">
                  <IconButton
                    size="small"
                    onClick={handleImageSizeIncrease}
                    disabled={imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL}
                    sx={{
                      color: imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                      '&:hover': {
                        backgroundColor: imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                      },
                      '&.Mui-disabled': {
                        color: '#D1D5DB',
                      },
                    }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="기본 크기로 되돌리기">
                  <Typography variant="caption" onClick={() => setImageSizeLevel(0)} sx={{ ml: 0.5, color: imageSizeLevel === 0 ? '#3B82F6' : '#9CA3AF', fontWeight: imageSizeLevel === 0 ? 600 : 400, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>기본</Typography>
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
                      width: `${((currentDescriptionPageIndex + 1) / descriptionPages.length) * 100}%`,
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
              mb: 2,
              color: '#1F2937',
              fontSize: currentFontSize.h4,
            }}
          >
            {survey.title || '설문'}
          </Typography>
          
          {/* 설명 페이지 콘텐츠 */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              backgroundColor: 'white',
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
            <ReactMarkdown 
              remarkPlugins={markdownPlugins}
              components={{
                img: ({ node, ...props }) => {
                  return (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        my: 2,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          display: 'inline-block',
                          p: 2,
                          backgroundColor: 'white',
                          borderRadius: 2,
                          border: '1px solid #E5E7EB',
                          maxWidth: `${100 * currentImageSizeMultiplier}%`,
                        }}
                      >
                        <Box
                          component="img"
                          {...props}
                          sx={{
                            maxWidth: '100%',
                            width: 'auto',
                            height: 'auto',
                            borderRadius: 1,
                            display: 'block',
                          }}
                        />
                      </Paper>
                    </Box>
                  );
                },
              }}
            >
              {currentPage.content}
            </ReactMarkdown>
          </Paper>
          
          {/* 뒤로 가기 / 다음 버튼 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ArrowBack />}
              onClick={handleBack}
              disabled={currentDescriptionPageIndex === 0 && !hasDescriptionPages}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: currentFontSize.body1,
                fontWeight: 600,
                borderColor: '#D1D5DB',
                color: '#6B7280',
                '&:hover': {
                  borderColor: '#9CA3AF',
                  backgroundColor: '#F9FAFB',
                },
                '&.Mui-disabled': {
                  borderColor: '#E5E7EB',
                  color: '#D1D5DB',
                },
              }}
            >
              뒤로
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                if (currentDescriptionPageIndex < descriptionPages.length - 1) {
                  // 다음 설명 페이지로
                  setCurrentDescriptionPageIndex(currentDescriptionPageIndex + 1);
                } else {
                  // 질문으로
                  setShowIntro(false);
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
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
          
          {/* 진행바와 크기 조절 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 글씨 크기 조절 버튼 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
              <TextFields sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
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
              <Tooltip title="기본 크기로 되돌리기">
                <Typography variant="caption" onClick={() => setFontSizeLevel(0)} sx={{ ml: 0.5, color: fontSizeLevel === 0 ? '#3B82F6' : '#9CA3AF', fontWeight: fontSizeLevel === 0 ? 600 : 400, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>기본</Typography>
              </Tooltip>
            </Box>
            
            {/* 이미지 크기 조절 버튼 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid #E5E7EB', borderRadius: 2, p: 0.5 }}>
              <Image sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
              <Tooltip title="콘텐츠 이미지 크기 줄이기 (설명·본문 이미지)">
                <IconButton
                  size="small"
                  onClick={handleImageSizeDecrease}
                  disabled={imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL}
                  sx={{
                    color: imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                    '&:hover': {
                      backgroundColor: imageSizeLevel <= MIN_IMAGE_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                    },
                    '&.Mui-disabled': {
                      color: '#D1D5DB',
                    },
                  }}
                >
                  <Remove fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="콘텐츠 이미지 크기 늘리기 (설명·본문 이미지)">
                <IconButton
                  size="small"
                  onClick={handleImageSizeIncrease}
                  disabled={imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL}
                  sx={{
                    color: imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL ? '#D1D5DB' : '#6B7280',
                    '&:hover': {
                      backgroundColor: imageSizeLevel >= MAX_IMAGE_SIZE_LEVEL ? 'transparent' : '#F3F4F6',
                    },
                    '&.Mui-disabled': {
                      color: '#D1D5DB',
                    },
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="기본 크기로 되돌리기">
                <Typography variant="caption" onClick={() => setImageSizeLevel(0)} sx={{ ml: 0.5, color: imageSizeLevel === 0 ? '#3B82F6' : '#9CA3AF', fontWeight: imageSizeLevel === 0 ? 600 : 400, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>기본</Typography>
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
        
        {/* 섹션 제목 및 설명 */}
        {currentSection && (currentSection.title || currentSection.description) && (
          <Box
            sx={{
              backgroundColor: '#F3F4F6',
              p: 2,
              borderRadius: 2,
              mb: 3,
            }}
          >
            {currentSection.title && (
              <Typography variant="h6" fontWeight={600} sx={{ color: '#1F2937', fontSize: currentFontSize.h6, mb: currentSection.description ? 1.5 : 0 }}>
                {currentSection.title}
              </Typography>
            )}
            {currentSection.description && currentSection.description.trim() && (
              <Box
                sx={{
                  '& p': { margin: 0, fontSize: currentFontSize.body2, color: '#4B5563', lineHeight: 1.6 },
                  '& p + p': { mt: 1 },
                  '& ul, & ol': { pl: 2.5, my: 0.5, fontSize: currentFontSize.body2, color: '#4B5563' },
                  '& strong': { fontWeight: 600 },
                }}
              >
                <ReactMarkdown remarkPlugins={markdownPlugins}>
                  {currentSection.description}
                </ReactMarkdown>
              </Box>
            )}
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
              contentImageSizeMultiplier={currentImageSizeMultiplier}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, mb: 4 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBack />}
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0 && !hasDescriptionPages}
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1.5,
              fontSize: currentFontSize.body1,
              fontWeight: 600,
              borderColor: '#D1D5DB',
              color: '#6B7280',
              '&:hover': {
                borderColor: '#9CA3AF',
                backgroundColor: '#F9FAFB',
              },
              '&.Mui-disabled': {
                borderColor: '#E5E7EB',
                color: '#D1D5DB',
              },
            }}
          >
            뒤로
          </Button>
          {isLastQuestion ? (
            <Button
              variant="contained"
              size="large"
              endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
              onClick={handleSubmit}
              disabled={submitting}
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
              제출하기
            </Button>
          ) : (
            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
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

