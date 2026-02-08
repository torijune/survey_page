import React from 'react';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
} from '@mui/material';
import { Question } from '../../../api/surveys';

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

interface MultipleChoiceQuestionProps {
  question: Question;
  value?: string[];
  otherText?: string;
  onChange: (value: string[], otherText?: string) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function MultipleChoiceQuestion({
  question,
  value = [],
  otherText,
  onChange,
  error,
  fontSize,
}: MultipleChoiceQuestionProps) {
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
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };
  
  const handleOtherTextChange = (optionValue: string, text: string) => {
    // 다중 선택의 경우 otherText를 객체로 관리 (각 선택지별로 다른 텍스트)
    // 현재는 단일 otherText만 지원하므로, 선택된 첫 번째 allow_other 선택지의 텍스트로 저장
    onChange(value, text);
  };
  
  return (
    <Box>
      <FormControl component="fieldset" error={!!error} fullWidth>
        <FormGroup>
          {question.options.map((option) => {
            const isSelected = value.includes(option.value);
            const showOtherInput = isSelected && option.allow_other;
            
            return (
              <Box key={option.id || option.value} sx={{ mb: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleChange(option.value, e.target.checked)}
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
                        color: '#000000',
                        fontSize: currentFontSize.body1,
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
                {showOtherInput && (
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
            );
          })}
        </FormGroup>
        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}

