import React, { useMemo } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  Typography,
  Paper,
  Grid,
  Button,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
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

interface RankingQuestionProps {
  question: Question;
  value?: Record<string, string>; // { "1순위": "option_value", "2순위": "option_value" }
  onChange: (value: Record<string, string>) => void;
  error?: string;
  fontSize?: FontSizeConfig;
}

export default function RankingQuestion({
  question,
  value = {},
  onChange,
  error,
  fontSize,
}: RankingQuestionProps) {
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
  // ranking_config가 없거나 잘못된 경우 기본값 사용
  const rankingConfig = question.ranking_config || { max_ranks: 2, rank_labels: ['1순위', '2순위'] };
  const maxRanks = rankingConfig.max_ranks || 2;
  const rankLabels = rankingConfig.rank_labels || Array.from({ length: maxRanks }, (_, i) => `${i + 1}순위`);
  
  // options가 없으면 빈 배열로 처리
  const options = question.options || [];

  // 현재 선택된 순위들을 배열로 변환 (1순위, 2순위, 3순위 순서대로)
  const selectedRanks = useMemo(() => {
    const ranks: Array<{ rankLabel: string; optionValue: string; optionLabel: string }> = [];
    rankLabels.forEach((rankLabel) => {
      const optionValue = value[rankLabel];
      if (optionValue) {
        const option = options.find(opt => opt.value === optionValue);
        if (option) {
          ranks.push({ rankLabel, optionValue, optionLabel: option.label });
        }
      }
    });
    return ranks;
  }, [value, rankLabels, options]);

  // 옵션의 현재 순위 가져오기
  const getRankForOption = (optionValue: string): number | null => {
    for (let i = 0; i < rankLabels.length; i++) {
      if (value[rankLabels[i]] === optionValue) {
        return i + 1;
      }
    }
    return null;
  };

  // 다음 순위 가져오기
  const getNextRank = (): string | null => {
    for (let i = 0; i < rankLabels.length; i++) {
      if (!value[rankLabels[i]]) {
        return rankLabels[i];
      }
    }
    return null;
  };

  // 옵션 클릭 핸들러
  const handleOptionClick = (optionValue: string) => {
    const currentRank = getRankForOption(optionValue);
    const newValue = { ...value };

    if (currentRank) {
      // 이미 선택된 옵션이면 선택 해제
      delete newValue[rankLabels[currentRank - 1]];
    } else {
      // 다음 순위에 할당
      const nextRank = getNextRank();
      if (nextRank) {
        // 같은 옵션이 다른 순위에 이미 선택되어 있는지 확인하고 제거
        Object.keys(newValue).forEach(rankLabel => {
          if (newValue[rankLabel] === optionValue) {
            delete newValue[rankLabel];
          }
        });
        newValue[nextRank] = optionValue;
      }
    }

    onChange(newValue);
  };

  // 다시 선택 핸들러 (모든 선택 초기화)
  const handleReset = () => {
    onChange({});
  };

  return (
    <Box>
      <FormControl component="fieldset" error={!!error} fullWidth>
        {/* 선택된 순위 요약 섹션 */}
        {selectedRanks.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 2.5,
              borderRadius: 2,
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                {selectedRanks.map((rank, index) => (
                  <Typography
                    key={rank.rankLabel}
                    variant="body1"
                    sx={{
                      mb: index < selectedRanks.length - 1 ? 1 : 0,
                      color: '#374151',
                      fontSize: currentFontSize.body1,
                    }}
                  >
                    <strong>{rank.rankLabel}:</strong> {rank.optionLabel}
                  </Typography>
                ))}
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={handleReset}
                sx={{
                  ml: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: '#D1D5DB',
                  color: '#6B7280',
                  '&:hover': {
                    borderColor: '#9CA3AF',
                    backgroundColor: '#F3F4F6',
                  },
                }}
              >
                다시 선택
              </Button>
            </Box>
          </Paper>
        )}

        {/* 옵션 그리드 */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
          }}
        >
          <Grid container spacing={2}>
            {options.map((option) => {
              const rank = getRankForOption(option.value);
              const isSelected = rank !== null;

              return (
                <Grid item xs={12} sm={6} key={option.id || option.value}>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={isSelected}
                        onChange={() => handleOptionClick(option.value)}
                        value={option.value}
                        sx={{
                          '& .MuiSvgIcon-root': {
                            fontSize: 24,
                          },
                          color: isSelected ? '#3B82F6' : '#9CA3AF',
                          '&.Mui-checked': {
                            color: '#3B82F6',
                          },
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isSelected && (
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: '#3B82F6',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {rank}
                          </Box>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#000000',
                            fontWeight: isSelected ? 500 : 400,
                            fontSize: currentFontSize.body2,
                          }}
                        >
                          {option.label}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      margin: 0,
                      width: '100%',
                      padding: '12px',
                      borderRadius: 1,
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      border: isSelected ? '1px solid #3B82F6' : '1px solid transparent',
                      '&:hover': {
                        backgroundColor: isSelected ? '#DBEAFE' : '#F3F4F6',
                      },
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Paper>
        
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
            {error}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}
