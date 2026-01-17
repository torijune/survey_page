import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export default function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        {showLabel && (
          <>
            <Typography variant="body2" color="text.secondary">
              진행률
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {current} / {total}
            </Typography>
          </>
        )}
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: '#E5E7EB',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: 'linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)',
          },
        }}
      />
    </Box>
  );
}

