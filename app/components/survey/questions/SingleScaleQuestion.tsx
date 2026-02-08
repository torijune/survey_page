import React from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import { Question, QuestionOption } from '../../../api/surveys';

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

interface SingleScaleQuestionProps {
  question: Question;
  value?: string;
  otherText?: string;
  onChange: (value: string, otherText?: string) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function SingleScaleQuestion({
  question,
  value,
  otherText,
  onChange,
  error,
  fontSize,
}: SingleScaleQuestionProps) {
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  const handleOtherTextChange = (optionValue: string, text: string) => {
    onChange(optionValue, text);
  };
  
  // 현재 선택된 선택지 찾기
  const selectedOption = question.options.find(opt => opt.value === value);
  const showOtherInput = selectedOption?.allow_other && value;
  
  // 그라데이션 배경색 계산 (왼쪽부터 부드러운 파란색, 오른쪽으로 갈수록 흰색)
  // 두 번째 사진의 색상 참고: 중간 톤의 muted blue에서 흰색으로
  const getGradientColor = (index: number, total: number) => {
    // 0 (왼쪽) = 부드러운 파란색, total-1 (오른쪽) = 흰색
    const ratio = index / (total - 1);
    // 부드러운 파란색에서 흰색으로 그라데이션
    // 시작 색상: #6B9BD1 (rgb(107, 155, 209)) - 중간 톤의 muted blue
    // 끝 색상: #FFFFFF (rgb(255, 255, 255)) - 흰색
    const r = Math.round(107 + (255 - 107) * ratio);
    const g = Math.round(155 + (255 - 155) * ratio);
    const b = Math.round(209 + (255 - 209) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  return (
    <Box>
      <FormControl component="fieldset" error={!!error} fullWidth>
        <RadioGroup 
          value={value || ''} 
          onChange={handleChange}
          sx={{ width: '100%' }}
        >
          <Table
            sx={{
              border: '1px solid #E5E7EB',
              borderRadius: 1,
              overflow: 'hidden',
              '& .MuiTableCell-root': {
                border: '1px solid #E5E7EB',
                padding: '12px',
                textAlign: 'center',
              },
            }}
          >
            {/* 헤더 행 (그라데이션 적용) */}
            <TableBody>
              <TableRow>
                {question.options.map((option, index) => {
                  const gradientColor = getGradientColor(index, question.options.length);
                  
                  return (
                    <TableCell
                      key={`header-${option.id || option.value}`}
                      sx={{
                        backgroundColor: gradientColor,
                        fontWeight: 600,
                        color: '#000000',
                      }}
                    >
                    <Typography variant="body2" sx={{ fontSize: currentFontSize.body2, color: '#000000', fontWeight: 600 }}>
                      {option.label}
                    </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {/* 라디오 버튼 행 (흰색 배경) */}
              <TableRow>
                {question.options.map((option) => {
                  const isSelected = value === option.value;
                  
                  return (
                    <TableCell
                      key={`radio-${option.id || option.value}`}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        position: 'relative',
                      }}
                    >
                      <FormControlLabel
                        value={option.value}
                        control={
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              border: isSelected ? '2px solid #3B82F6' : '2px solid #D1D5DB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <Radio
                              checked={isSelected}
                              sx={{
                                color: isSelected ? '#3B82F6' : 'transparent',
                                '&.Mui-checked': {
                                  color: '#3B82F6',
                                },
                                '& .MuiSvgIcon-root': {
                                  fontSize: 20,
                                },
                                padding: 0,
                              }}
                            />
                          </Box>
                        }
                        label=""
                        sx={{
                          m: 0,
                          justifyContent: 'center',
                        }}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </RadioGroup>
        
        {/* 기타 입력 필드 */}
        {showOtherInput && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="직접 입력해주세요"
              value={otherText || ''}
              onChange={(e) => handleOtherTextChange(selectedOption!.value, e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}
        
        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}
