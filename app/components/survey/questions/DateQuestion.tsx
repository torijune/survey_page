import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { Question } from '../../../api/surveys';

interface DateQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function DateQuestion({
  question,
  value,
  onChange,
  error,
}: DateQuestionProps) {
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
          },
        }}
      />
    </Box>
  );
}

