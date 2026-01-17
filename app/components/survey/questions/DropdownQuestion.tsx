import React from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { Question } from '../../../api/surveys';

interface DropdownQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function DropdownQuestion({
  question,
  value,
  onChange,
  error,
}: DropdownQuestionProps) {
  return (
    <Box>
      <FormControl fullWidth error={!!error}>
        <Select
          value={value || ''}
          onChange={(e) => onChange(e.target.value as string)}
          displayEmpty
          sx={{
            borderRadius: 2,
          }}
        >
          <MenuItem value="" disabled>
            <Typography color="text.secondary">선택해주세요</Typography>
          </MenuItem>
          {question.options.map((option) => (
            <MenuItem key={option.id || option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}

