import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import { ArrowBack, ArrowForward, Send } from '@mui/icons-material';
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
}

export default function SurveyForm({ survey, onComplete }: SurveyFormProps) {
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
  
  // 모든 질문을 평탄화하여 하나의 배열로 만들기 (숨겨진 문항 제외)
  const allQuestions = useMemo(() => {
    const questions: Question[] = [];
    
    survey.sections.forEach(section => {
      section.questions.forEach(question => {
        // 숨겨진 문항은 제외
        if (!question.is_hidden) {
          questions.push(question);
        }
      });
    });
    
    return questions;
  }, [survey]);
  
  // 조건부 로직 처리 - 표시할 질문 필터링
  const visibleQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (!q.conditional_logic) return true;
      
      const { question_id, operator, value, action } = q.conditional_logic;
      const answer = answers[question_id];
      
      if (!answer) return action !== 'show';
      
      let conditionMet = false;
      const answerValue = answer.answer_value;
      
      switch (operator) {
        case 'equals':
          conditionMet = answerValue === value;
          break;
        case 'not_equals':
          conditionMet = answerValue !== value;
          break;
        case 'contains':
          conditionMet = Array.isArray(answerValue) && answerValue.includes(value);
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
  
  // 문항 번호 생성 (A1, A2, B1...)
  const getQuestionNumber = (question: Question): string => {
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
  
  // 답변 변경 핸들러
  const handleAnswerChange = (questionId: string, data: { answer_value?: any; answer_text?: string }) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: data,
    }));
    
    // 에러 클리어
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };
  
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
  
  // 다음 질문으로 이동
  const handleNext = async () => {
    if (!validateCurrentQuestion()) return;
    
    // 중간 저장
    if (responseId && survey.allow_edit) {
      try {
        const items: ResponseItem[] = Object.entries(answers).map(([questionId, data]) => ({
          question_id: questionId,
          answer_value: data.answer_value,
          answer_text: data.answer_text,
        }));
        await updateResponseItems(responseId, items);
      } catch (e) {
        console.error('중간 저장 실패:', e);
      }
    }
    
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
  
  // 제출
  const handleSubmit = async () => {
    if (!validateCurrentQuestion()) return;
    if (!responseId) return;
    
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
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
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
                    <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', lineHeight: 1.2 }}>
                      {survey.organization_subtitle}
                    </Typography>
                  )}
                  {survey.organization_name && (
                    <Typography variant="h6" sx={{ color: '#3B82F6', fontWeight: 700, lineHeight: 1.2 }}>
                      {survey.organization_name}
                    </Typography>
                  )}
                </Box>
              )}
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
          
          {/* 설문 제목 */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              mb: 4,
              color: '#1F2937',
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
                fontSize: '1rem',
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
              },
              '& h1': {
                fontSize: '2rem',
                fontWeight: 700,
                mb: 2,
                mt: 3,
              },
              '& h2': {
                fontSize: '1.5rem',
                fontWeight: 600,
                mb: 1.5,
                mt: 2.5,
              },
              '& h3': {
                fontSize: '1.25rem',
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
          </Box>
          
          {/* 푸터 */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
              Powered by SurveyMachine
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }
  
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
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
                  <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', lineHeight: 1.2 }}>
                    {survey.organization_subtitle}
                  </Typography>
                )}
                {survey.organization_name && (
                  <Typography variant="h6" sx={{ color: '#3B82F6', fontWeight: 700, lineHeight: 1.2 }}>
                    {survey.organization_name}
                  </Typography>
                )}
              </Box>
            )}
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
            <Typography variant="h6" fontWeight={600} sx={{ color: '#1F2937' }}>
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
            <Typography variant="h6" fontWeight={600} gutterBottom>
              응답자 정보
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            Powered by SurveyMachine
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

