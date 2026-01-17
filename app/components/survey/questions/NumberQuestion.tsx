import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { Question } from '../../../api/surveys';

interface NumberQuestionProps {
  question: Question;
  value?: number;
  onChange: (value: number | undefined) => void;
  error?: string;
}

export default function NumberQuestion({
  question,
  value,
  onChange,
  error,
}: NumberQuestionProps) {
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
          },
        }}
      />
      {(rules?.min_value !== undefined || rules?.max_value !== undefined) && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {rules?.min_value !== undefined && `최소: ${rules.min_value}`}
          {rules?.min_value !== undefined && rules?.max_value !== undefined && ' / '}
          {rules?.max_value !== undefined && `최대: ${rules.max_value}`}
        </Typography>
      )}
    </Box>
  );
}

