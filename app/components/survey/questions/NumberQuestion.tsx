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

interface NumberQuestionProps {
  question: Question;
  value?: number;
  onChange: (value: number | undefined) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function NumberQuestion({
  question,
  value,
  onChange,
  error,
  fontSize,
}: NumberQuestionProps) {
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
  const rules = question.validation_rules;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else {
      onChange(parseFloat(val));
    }
  };
  
  return (
    <Box>
      <TextField
        fullWidth
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        placeholder="숫자를 입력해주세요"
        error={!!error}
        helperText={error}
        inputProps={{
          min: rules?.min_value,
          max: rules?.max_value,
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
      {(rules?.min_value !== undefined || rules?.max_value !== undefined) && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: currentFontSize.caption }}>
          {rules?.min_value !== undefined && `최소: ${rules.min_value}`}
          {rules?.min_value !== undefined && rules?.max_value !== undefined && ' / '}
          {rules?.max_value !== undefined && `최대: ${rules.max_value}`}
        </Typography>
      )}
    </Box>
  );
}

