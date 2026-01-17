import React from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { Question, QuestionOption } from '../../../api/surveys';

interface SingleChoiceQuestionProps {
  question: Question;
  value?: string;
  otherText?: string;
  onChange: (value: string, otherText?: string) => void;
  error?: string;
}

export default function SingleChoiceQuestion({
  question,
  value,
  otherText,
  onChange,
  error,
}: SingleChoiceQuestionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  const handleOtherTextChange = (optionValue: string, text: string) => {
    onChange(optionValue, text);
  };
  
  // 현재 선택된 선택지 찾기
  const selectedOption = question.options.find(opt => opt.value === value);
  const showOtherInput = selectedOption?.allow_other && value;
  
  return (
    <Box>
      <FormControl component="fieldset" error={!!error} fullWidth>
        <RadioGroup value={value || ''} onChange={handleChange}>
          {question.options.map((option) => (
            <Box key={option.id || option.value} sx={{ mb: 1.5 }}>
              <FormControlLabel
                value={option.value}
                control={
                  <Radio
                    sx={{
                      color: '#6B7280',
                      '&.Mui-checked': {
                        color: '#3B82F6',
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#374151',
                      fontSize: '1rem',
                    }}
                  >
                    {option.label}
                  </Typography>
                }
                sx={{
                  alignItems: 'flex-start',
                  m: 0,
                }}
              />
              {/* 선택된 선택지가 allow_other이면 직접 입력 필드 표시 */}
              {value === option.value && option.allow_other && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder="직접 입력해주세요"
                  value={otherText || ''}
                  onChange={(e) => handleOtherTextChange(option.value, e.target.value)}
                  sx={{
                    ml: 4,
                    mt: 1,
                    maxWidth: 'calc(100% - 32px)',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              )}
            </Box>
          ))}
        </RadioGroup>
        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}

