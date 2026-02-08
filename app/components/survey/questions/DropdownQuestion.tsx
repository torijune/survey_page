import React from 'react';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
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

interface DropdownQuestionProps {
  question: Question;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function DropdownQuestion({
  question,
  value,
  onChange,
  error,
  fontSize,
}: DropdownQuestionProps) {
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
      <FormControl fullWidth error={!!error}>
        <Select
          value={value || ''}
          onChange={(e) => onChange(e.target.value as string)}
          displayEmpty
          sx={{
            borderRadius: 2,
            fontSize: currentFontSize.body1,
            '& .MuiSelect-select': {
              fontSize: currentFontSize.body1,
            },
          }}
        >
          <MenuItem value="" disabled>
            <Typography color="text.secondary" sx={{ fontSize: currentFontSize.body1 }}>선택해주세요</Typography>
          </MenuItem>
          {question.options.map((option) => (
            <MenuItem 
              key={option.id || option.value} 
              value={option.value}
              sx={{
                color: '#000000',
                fontSize: currentFontSize.body1,
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 1, fontSize: currentFontSize.caption }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}

