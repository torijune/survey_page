import React from 'react';
import { Box, TextField, Button, Typography, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { Question } from '../../../api/surveys';
import type { RepeatableInputsConfig } from '../../../api/surveys';

interface FontSizeConfig {
  base: string;
  body1: string;
  body2: string;
  caption: string;
}

interface RepeatableInputsQuestionProps {
  question: Question;
  value?: Record<string, string>[]; // 각 행의 입력값 { key: value }[]
  onChange: (value: Record<string, string>[]) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

const CIRCLE_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export default function RepeatableInputsQuestion({
  question,
  value = [],
  onChange,
  error,
  fontSize,
}: RepeatableInputsQuestionProps) {
  const defaultFontSize: FontSizeConfig = {
    base: '1rem',
    body1: '1rem',
    body2: '0.875rem',
    caption: '0.75rem',
  };
  const currentFontSize = fontSize || defaultFontSize;
  const config = (question.repeatable_config || { parts: [] }) as RepeatableInputsConfig;
  const parts = config.parts || [];

  const rows = value.length >= 1 ? value : [{}];
  const displayRows = value.length >= 1 ? value : [{}];

  const updateRow = (rowIndex: number, key: string, val: string) => {
    const next = [...displayRows];
    if (!next[rowIndex]) next[rowIndex] = {};
    next[rowIndex] = { ...next[rowIndex], [key]: val };
    onChange(next);
  };

  const addRow = () => {
    onChange([...displayRows, {}]);
  };

  const removeRow = (rowIndex: number) => {
    if (displayRows.length <= 1) return;
    const next = displayRows.filter((_, i) => i !== rowIndex);
    onChange(next);
  };

  return (
    <Box>
      {displayRows.map((row, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            mb: rowIndex < displayRows.length - 1 ? 2 : 0,
            pb: rowIndex < displayRows.length - 1 ? 2 : 0,
            borderBottom: rowIndex < displayRows.length - 1 ? '1px solid #E5E7EB' : 'none',
          }}
        >
          <Typography
            component="span"
            sx={{ mr: 1, fontSize: currentFontSize.body1, fontWeight: 500 }}
          >
            {CIRCLE_NUMBERS[rowIndex] || `${rowIndex + 1}.`}
          </Typography>
          {parts.map((part, partIndex) => {
            if (part.type === 'text') {
              return (
                <Typography
                  key={partIndex}
                  component="span"
                  sx={{ fontSize: currentFontSize.body1 }}
                >
                  {part.value || ''}
                </Typography>
              );
            }
            if (part.type === 'input' && part.key) {
              return (
                <Box key={partIndex} component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Typography component="span" sx={{ fontSize: currentFontSize.body1 }}>(</Typography>
                  <TextField
                    size="small"
                    value={row[part.key] || ''}
                    onChange={(e) => updateRow(rowIndex, part.key!, e.target.value)}
                    placeholder={part.placeholder}
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: currentFontSize.body1,
                        minWidth: 60,
                        maxWidth: 120,
                        '& input': { py: 0.25, px: 0.5 },
                        border: '1px solid #D1D5DB',
                        borderRadius: 0.5,
                        backgroundColor: '#fff',
                      },
                    }}
                  />
                  <Typography component="span" sx={{ fontSize: currentFontSize.body1 }}>)</Typography>
                </Box>
              );
            }
            return null;
          })}
          {displayRows.length > 1 && (
            <IconButton
              size="small"
              onClick={() => removeRow(rowIndex)}
              sx={{ ml: 0.5 }}
              title="이 행 삭제"
            >
              <Remove fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
      <Button
        startIcon={<Add />}
        onClick={addRow}
        variant="outlined"
        size="small"
        sx={{ mt: 2, borderRadius: 2 }}
      >
        추가
      </Button>
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontSize: currentFontSize.caption }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
