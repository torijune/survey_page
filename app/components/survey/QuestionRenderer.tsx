import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Question } from '../../api/surveys';
import {
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  TextQuestion,
  NumberQuestion,
  DateQuestion,
  DropdownQuestion,
  LikertQuestion,
} from './questions';

interface AnswerData {
  answer_value?: any;
  answer_text?: string;
}

interface QuestionRendererProps {
  question: Question;
  questionNumber: string | number;
  answer?: AnswerData;
  onChange: (answer: AnswerData) => void;
  error?: string;
}

export default function QuestionRenderer({
  question,
  questionNumber,
  answer,
  onChange,
  error,
}: QuestionRendererProps) {
  const renderQuestion = () => {
    switch (question.type) {
      case 'single_choice':
        return (
          <SingleChoiceQuestion
            question={question}
            value={answer?.answer_value}
            otherText={answer?.answer_text}
            onChange={(value, otherText) => onChange({ answer_value: value, answer_text: otherText })}
            error={error}
          />
        );
      
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            value={answer?.answer_value || []}
            otherText={answer?.answer_text}
            onChange={(value, otherText) => onChange({ answer_value: value, answer_text: otherText })}
            error={error}
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
          />
        );
      
      case 'number':
        return (
          <NumberQuestion
            question={question}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
          />
        );
      
      case 'date':
        return (
          <DateQuestion
            question={question}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
          />
        );
      
      case 'dropdown':
        return (
          <DropdownQuestion
            question={question}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
          />
        );
      
      case 'likert':
        return (
          <LikertQuestion
            question={question}
            value={answer?.answer_value}
            onChange={(value) => onChange({ answer_value: value })}
            error={error}
          />
        );
      
      default:
        return <Typography color="error">지원하지 않는 문항 유형입니다.</Typography>;
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
          fontSize: '1.125rem',
        }}
      >
        {questionNumber ? `${questionNumber}. ` : ''}{question.title}
        {question.required && (
          <Typography component="span" color="error" sx={{ ml: 0.5 }}>
            *
          </Typography>
        )}
      </Typography>
      
      {question.description && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.6 }}
        >
          {question.description}
        </Typography>
      )}
      
      {renderQuestion()}
    </Box>
  );
}

