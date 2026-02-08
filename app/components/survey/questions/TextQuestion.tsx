import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
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

interface TextQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function TextQuestion({
  question,
  value,
  onChange,
  error,
  fontSize,
}: TextQuestionProps) {
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
  const isLongText = question.type === 'long_text';
  const rules = question.validation_rules;
  
  return (
    <Box>
      <TextField
        fullWidth
        multiline={isLongText}
        rows={isLongText ? 4 : 1}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isLongText ? '자유롭게 작성해주세요' : '답변을 입력해주세요'}
        error={!!error}
        helperText={error}
        inputProps={{
          maxLength: rules?.max_length,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            fontSize: currentFontSize.body1,
          },
          '& .MuiInputBase-input': {
            fontSize: currentFontSize.body1,
          },
          '& .MuiFormHelperText-root': {
            fontSize: currentFontSize.caption,
          },
        }}
      />
      {rules?.max_length && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right', fontSize: currentFontSize.caption }}>
          {value?.length || 0} / {rules.max_length}
        </Typography>
      )}
    </Box>
  );
}

