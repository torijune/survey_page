import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkPreserveNewlines } from '../../lib/remarkPreserveNewlines';
import { Question } from '../../api/surveys';

const markdownPlugins = [remarkGfm, remarkBreaks, remarkPreserveNewlines()] as React.ComponentProps<typeof ReactMarkdown>['remarkPlugins'];
import {
  SingleChoiceQuestion,
  SingleScaleQuestion,
  MultipleChoiceQuestion,
  TextQuestion,
  NumberQuestion,
  DateQuestion,
  DropdownQuestion,
  LikertQuestion,
  RankingQuestion,
  RepeatableInputsQuestion,
} from './questions';

interface AnswerData {
  answer_value?: any;
  answer_text?: string;
}

interface FontSizeConfig {
  base: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  body1: string;
  body2: string;
  caption: string;
}

interface QuestionRendererProps {
  question: Question;
  questionNumber: string | number;
  answer?: AnswerData;
  onChange: (answer: AnswerData) => void;
  error?: string;
  allQuestions?: Question[]; // 모든 질문 목록 (변수 치환용)
  allAnswers?: Record<string, AnswerData>; // 모든 응답 (변수 치환용)
  fontSize?: FontSizeConfig; // 글씨 크기 설정
  /** 콘텐츠 이미지(설명·본문) 크기 배율. 로고는 제외. 기본 1.0 */
  contentImageSizeMultiplier?: number;
}

export default function QuestionRenderer({
  question,
  questionNumber,
  answer,
  onChange,
  error,
  allQuestions = [],
  allAnswers = {},
  fontSize,
  contentImageSizeMultiplier = 1,
}: QuestionRendererProps) {
  
  // 변수 치환 함수: {{question_number}} 또는 {{question_id}}를 실제 응답 값으로 치환
  const replaceVariables = React.useCallback((text: string): string => {
    if (!text || !allQuestions.length) {
      return text;
    }
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      // 변수명 정리 (공백 제거)
      const cleanVarName = varName.trim();
      
      // 변수명이 question_number인 경우 (question_number만 매칭, UUID는 사용하지 않음)
      const refQuestion = allQuestions.find(q => {
        // question_number로만 매칭 (대소문자 무시)
        if (q.question_number) {
          const qNum = q.question_number.trim().toUpperCase();
          const varNum = cleanVarName.toUpperCase();
          if (qNum === varNum) {
            return true;
          }
        }
        // UUID(id)로는 매칭하지 않음
        return false;
      });
      
      if (!refQuestion || !refQuestion.id) {
        // 변수를 찾지 못하면 원본 유지
        return match;
      }
      
      const refAnswer = allAnswers[refQuestion.id];
      if (!refAnswer) {
        // 응답이 없으면 변수명을 그대로 표시 (미리보기 모드)
        return `[${refQuestion.question_number || refQuestion.id}]`;
      }
      
      // 응답 값 추출
      let answerText = '';
      if (refAnswer.answer_text) {
        answerText = refAnswer.answer_text;
      } else if (refAnswer.answer_value !== undefined && refAnswer.answer_value !== null) {
        if (Array.isArray(refAnswer.answer_value)) {
          // 다중 선택: 선택된 옵션들의 label을 찾아서 조합
          const selectedLabels = refAnswer.answer_value
            .map((val: string) => {
              const option = refQuestion.options?.find(opt => opt.value === val);
              return option ? option.label : val;
            })
            .filter(Boolean);
          answerText = selectedLabels.join(', ');
        } else {
          // 단일 선택: 선택된 옵션의 label 찾기
          const option = refQuestion.options?.find(opt => opt.value === refAnswer.answer_value);
          answerText = option ? option.label : String(refAnswer.answer_value);
        }
      }
      
      return answerText || `[${refQuestion.question_number || refQuestion.id}]`; // 응답이 없으면 변수명 표시
    });
  }, [allQuestions, allAnswers]);
  
  // 질문 제목과 설명에 변수 치환 적용
  const resolvedTitle = useMemo(() => replaceVariables(question.title || ''), [question.title, replaceVariables]);
  const resolvedDescription = useMemo(() => 
    question.description ? replaceVariables(question.description) : '', 
    [question.description, replaceVariables]
  );
  
  // 선택지(옵션)에도 변수 치환 적용
  const resolvedQuestion = useMemo(() => {
    const resolved = {
      ...question,
      options: question.options?.map(opt => {
        const originalLabel = opt.label || '';
        const resolvedLabel = replaceVariables(originalLabel);
        // 디버깅: 변수 치환이 실제로 작동하는지 확인
        if (originalLabel !== resolvedLabel) {
          console.log('변수 치환됨:', { original: originalLabel, resolved: resolvedLabel });
        }
        return {
          ...opt,
          label: resolvedLabel,
        };
      }),
    };
    return resolved;
  }, [question, replaceVariables]);
  
  // 기본 글씨 크기 설정
  const defaultFontSize: FontSizeConfig = {
    base: '1rem',
    h1: '2rem',
    h2: '1.5rem',
    h3: '1.25rem',
    h4: '1.125rem',
    h5: '1rem',
    h6: '1rem',
    body1: '1rem',
    body2: '0.875rem',
    caption: '0.75rem',
  };
  
  const currentFontSize = fontSize || defaultFontSize;
  
  const renderQuestion = () => {
    switch (question.type) {
      case 'single_choice':
        return (
          <SingleChoiceQuestion
            question={resolvedQuestion}
            value={answer?.answer_value}
            otherText={answer?.answer_text}
            onChange={(value, otherText) => onChange({ answer_value: value, answer_text: otherText })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'single_scale':
        return (
          <SingleScaleQuestion
            question={resolvedQuestion}
            value={answer?.answer_value}
            otherText={answer?.answer_text}
            onChange={(value, otherText) => onChange({ answer_value: value, answer_text: otherText })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={resolvedQuestion}
            value={answer?.answer_value || []}
            otherText={answer?.answer_text}
            onChange={(value, otherText) => onChange({ answer_value: value, answer_text: otherText })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'short_text':
      case 'long_text':
        return (
          <TextQuestion
            question={question}
            value={answer?.answer_text}
            onChange={(value) => onChange({ answer_text: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'number':
        return (
          <NumberQuestion
            question={question}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'date':
        return (
          <DateQuestion
            question={question}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'dropdown':
        return (
          <DropdownQuestion
            question={resolvedQuestion}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'likert':
        // Likert의 경우 rows와 labels에도 변수 치환 적용
        const resolvedLikertConfig = question.likert_config ? {
          ...question.likert_config,
          labels: question.likert_config.labels?.map(label => {
            if (typeof label === 'string') {
              return replaceVariables(label);
            }
            return label;
          }),
          rows: question.likert_config.rows?.map(row => {
            if (typeof row === 'string') {
              return replaceVariables(row);
            } else if (row && typeof row === 'object' && 'text' in row) {
              return {
                ...row,
                text: replaceVariables(row.text || ''),
              };
            }
            return row;
          }),
        } : undefined;
        
        return (
          <LikertQuestion
            question={{
              ...resolvedQuestion,
              likert_config: resolvedLikertConfig,
            }}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'ranking':
        // Ranking의 경우 options에도 변수 치환 적용
        return (
          <RankingQuestion
            question={{
              ...resolvedQuestion,
              ranking_config: question.ranking_config, // ranking_config는 그대로 전달
            }}
            value={answer?.answer_value || {}}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      case 'repeatable_inputs':
        return (
          <RepeatableInputsQuestion
            question={question}
            value={Array.isArray(answer?.answer_value) ? answer.answer_value : undefined}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
            fontSize={currentFontSize}
          />
        );
      
      default:
        return <Typography color="error" sx={{ fontSize: currentFontSize.body1 }}>지원하지 않는 문항 유형입니다.</Typography>;
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: '#1F2937',
          mb: 3,
          fontSize: currentFontSize.h6,
        }}
      >
        {questionNumber ? `${questionNumber}. ` : ''}{resolvedTitle}
        {question.required && (
          <Typography component="span" color="error" sx={{ ml: 0.5, fontSize: currentFontSize.h6 }}>
            *
          </Typography>
        )}
      </Typography>
      
      {resolvedDescription && (
        <Box
          sx={{
            mb: 3,
            lineHeight: 1.6,
            fontSize: currentFontSize.body1,
            color: 'text.secondary',
            '& p': { mb: 1 },
            '& p:last-child': { mb: 0 },
            '& ul, & ol': { pl: 3, mb: 1 },
            '& h1, & h2, & h3': { fontSize: 'inherit', fontWeight: 600, mt: 1, mb: 0.5 },
          }}
        >
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
                    <img
                      {...imgProps}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  </Box>
                </Box>
              ),
            }}
          >
            {resolvedDescription}
          </ReactMarkdown>
        </Box>
      )}
      
      {renderQuestion()}
    </Box>
  );
}

