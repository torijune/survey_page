import React from 'react';
import {
  Box,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from '@mui/material';
import { Question, LikertRowItem } from '../../../api/surveys';

// HTML을 렌더링하는 컴포넌트
const RichTextDisplay = ({ html, style }: { html: string; style?: React.CSSProperties }) => (
  <Box
    component="span"
    dangerouslySetInnerHTML={{ __html: html || '' }}
    sx={{
      '& b, & strong': {
        fontWeight: 700,
      },
      '& i, & em': {
        fontStyle: 'italic',
      },
      '& u': {
        textDecoration: 'underline',
      },
      ...style,
    }}
  />
);

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

interface LikertQuestionProps {
  question: Question;
  value?: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

// Row 항목을 정규화하여 LikertRowItem 형태로 변환
const normalizeRow = (row: string | LikertRowItem): LikertRowItem => {
  if (typeof row === 'string') {
    return { text: row };
  }
  return row;
};

export default function LikertQuestion({
  question,
  value = {},
  onChange,
  error,
  fontSize,
}: LikertQuestionProps) {
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
  const config = question.likert_config;
  if (!config) return null;
  
  const { scale_min, scale_max, labels, rows } = config;
  const scaleRange = Array.from(
    { length: scale_max - scale_min + 1 },
    (_, i) => scale_min + i
  );
  
  // rows를 정규화
  const normalizedRows = rows.map(normalizeRow);
  
  const handleChange = (rowIndex: number, newValue: number) => {
    onChange({
      ...value,
      [rowIndex.toString()]: newValue,
    });
  };

  // Row 스타일 적용
  const getRowStyle = (style?: LikertRowItem['style']) => ({
    fontWeight: style?.bold ? 700 : 500,
    fontStyle: style?.italic ? 'italic' : 'normal',
    textDecoration: style?.underline ? 'underline' : 'none',
    color: style?.color || '#374151',
  });
  
  return (
    <Box>
      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          border: '1px solid #E5E7EB',
          borderRadius: 2,
          overflow: 'auto',
          backgroundColor: 'white',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 600, minWidth: 200, borderBottom: '1px solid #E5E7EB' }}></TableCell>
              {scaleRange.map((scale, idx) => (
                <TableCell 
                  key={scale} 
                  align="center"
                  sx={{ 
                    fontWeight: 500, 
                    minWidth: 100,
                    borderBottom: '1px solid #E5E7EB',
                    py: 2,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, fontSize: currentFontSize.body2 }}>
                    {scale}
                  </Typography>
                  {labels[idx] && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: currentFontSize.caption,
                        lineHeight: 1.4,
                        color: 'text.secondary',
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                      }}
                    >
                      {labels[idx]}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {normalizedRows.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                sx={{ 
                  '&:hover': { backgroundColor: '#F9FAFB' },
                }}
              >
                <TableCell 
                  sx={{ 
                    borderBottom: '1px solid #E5E7EB',
                  }}
                >
                  <Box sx={{ ...getRowStyle(row.style), whiteSpace: 'pre-wrap', fontSize: currentFontSize.body1 }}>
                    <RichTextDisplay html={row.text} />
                  </Box>
                  {row.image_url && (
                    <Box sx={{ mt: 1 }}>
                      <img
                        src={row.image_url}
                        alt="첨부 이미지"
                        style={{
                          maxWidth: 200,
                          maxHeight: 150,
                          borderRadius: 8,
                          border: '1px solid #E5E7EB',
                        }}
                      />
                    </Box>
                  )}
                </TableCell>
                {scaleRange.map((scale) => (
                  <TableCell 
                    key={scale} 
                    align="center" 
                    padding="checkbox"
                    sx={{ borderBottom: '1px solid #E5E7EB' }}
                  >
                    <Radio
                      checked={value[rowIndex.toString()] === scale}
                      onChange={() => handleChange(rowIndex, scale)}
                      size="small"
                      sx={{
                        color: '#6B7280',
                        '&.Mui-checked': {
                          color: '#3B82F6',
                        },
                      }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block', fontSize: currentFontSize.caption }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

