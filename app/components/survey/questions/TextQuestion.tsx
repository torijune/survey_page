import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { Question } from '../../../api/surveys';

interface TextQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function TextQuestion({
  question,
  value,
  onChange,
  error,
}: TextQuestionProps) {
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
          },
        }}
      />
      {rules?.max_length && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
          {value?.length || 0} / {rules.max_length}
        </Typography>
      )}
    </Box>
  );
}

