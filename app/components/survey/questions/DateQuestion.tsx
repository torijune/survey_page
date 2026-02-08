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

interface DateQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function DateQuestion({
  question,
  value,
  onChange,
  error,
  fontSize,
}: DateQuestionProps) {
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
  return (
    <Box>
      <TextField
        fullWidth
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        helperText={error}
        InputLabelProps={{
          shrink: true,
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
    </Box>
  );
}

