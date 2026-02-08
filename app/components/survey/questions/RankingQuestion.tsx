import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  Chip,
} from '@mui/material';
import { EmojiEvents, LooksTwo } from '@mui/icons-material';
import { Question } from '../../../api/surveys';

interface RankingQuestionProps {
  question: Question;
  value?: Record<string, string>; // { "1순위": "option_value", "2순위": "option_value" }
  onChange: (value: Record<string, string>) => void;
  error?: string;
}

export default function RankingQuestion({
  question,
  value = {},
  onChange,
  error,
}: RankingQuestionProps) {
  // ranking_config가 없거나 잘못된 경우 기본값 사용
  const rankingConfig = question.ranking_config || { max_ranks: 2, rank_labels: ['1순위', '2순위'] };
  const maxRanks = rankingConfig.max_ranks || 2;
  const rankLabels = rankingConfig.rank_labels || Array.from({ length: maxRanks }, (_, i) => `${i + 1}순위`);
  
  // options가 없으면 빈 배열로 처리
  const options = question.options || [];
  
  const handleRankChange = (rankLabel: string, optionValue: string) => {
    const newValue = { ...value };
    
    // 같은 옵션이 다른 순위에 이미 선택되어 있는지 확인
    const existingRank = Object.keys(newValue).find(rank => newValue[rank] === optionValue && rank !== rankLabel);
    if (existingRank) {
      // 기존 순위에서 제거
      delete newValue[existingRank];
    }
    
    // 새 순위에 설정
    if (optionValue) {
      newValue[rankLabel] = optionValue;
    } else {
      delete newValue[rankLabel];
    }
    
    onChange(newValue);
  };
  
  const getSelectedOptionForRank = (rankLabel: string): string => {
    return value[rankLabel] || '';
  };
  
  const isOptionSelectedInOtherRank = (optionValue: string, currentRankLabel: string): boolean => {
    return Object.keys(value).some(rankLabel => 
      rankLabel !== currentRankLabel && value[rankLabel] === optionValue
    );
  };
  
  // 순위별 색상 및 아이콘
  const getRankStyle = (rankIndex: number) => {
    const styles = [
      { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#FFFFFF', icon: <EmojiEvents sx={{ fontSize: 20 }} /> },
      { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', color: '#FFFFFF', icon: <LooksTwo sx={{ fontSize: 20 }} /> },
      { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', color: '#FFFFFF', icon: <Typography sx={{ fontSize: 16, fontWeight: 700 }}>3</Typography> },
    ];
    return styles[rankIndex] || { bg: '#F3F4F6', color: '#374151', icon: <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{rankIndex + 1}</Typography> };
  };
  
  return (
    <Box>
      <FormControl component="fieldset" error={!!error} fullWidth>
        <Box sx={{ mb: 3 }}>
          {rankLabels.map((rankLabel, rankIndex) => {
            const rankStyle = getRankStyle(rankIndex);
            const selectedValue = getSelectedOptionForRank(rankLabel);
            const selectedOption = options.find(opt => opt.value === selectedValue);
            
            return (
              <Paper
                key={rankLabel}
                elevation={0}
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: selectedValue ? '#3B82F6' : '#E5E7EB',
                  backgroundColor: selectedValue ? '#F0F9FF' : '#FFFFFF',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#3B82F6',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: rankStyle.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: rankStyle.color,
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    {rankStyle.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: '#1F2937',
                        mb: 0.5,
                      }}
                    >
                      {rankLabel} 선택
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedOption 
                        ? `선택됨: ${selectedOption.label}` 
                        : '아래에서 선택해주세요'}
                    </Typography>
                  </Box>
                </Box>
                
                <FormControl fullWidth>
                  <Select
                    value={selectedValue}
                    onChange={(e) => handleRankChange(rankLabel, e.target.value)}
                    displayEmpty
                    sx={{
                      backgroundColor: '#FFFFFF',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: error ? '#ef4444' : '#D1D5DB',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: error ? '#ef4444' : '#3B82F6',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: error ? '#ef4444' : '#3B82F6',
                        borderWidth: 2,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>선택 안 함</em>
                    </MenuItem>
                    {options.map((option) => {
                      const isSelectedInOtherRank = isOptionSelectedInOtherRank(option.value, rankLabel);
                      const isSelectedInThisRank = selectedValue === option.value;
                      
                      return (
                        <MenuItem
                          key={option.id || option.value}
                          value={option.value}
                          disabled={isSelectedInOtherRank && !isSelectedInThisRank}
                          sx={{
                            opacity: isSelectedInOtherRank && !isSelectedInThisRank ? 0.5 : 1,
                          }}
                        >
                          {option.label}
                          {isSelectedInOtherRank && !isSelectedInThisRank && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1, color: 'text.secondary' }}
                            >
                              (다른 순위에 선택됨)
                            </Typography>
                          )}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Paper>
            );
          })}
        </Box>
        
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}
