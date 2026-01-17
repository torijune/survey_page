import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
  TextField,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatColorText,
  FormatSize,
  Check,
} from '@mui/icons-material';

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: 'small' | 'medium' | 'large';
}

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  style?: TextStyle;
  onStyleChange?: (style: TextStyle) => void;
  variant?: 'title' | 'subtitle' | 'body' | 'caption';
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}

const COLORS = [
  '#1F2937', // 기본 (검정)
  '#3B82F6', // 파랑
  '#EF4444', // 빨강
  '#10B981', // 초록
  '#F59E0B', // 주황
  '#8B5CF6', // 보라
  '#EC4899', // 분홍
  '#6B7280', // 회색
];

const FONT_SIZES = {
  small: '0.875rem',
  medium: '1rem',
  large: '1.25rem',
};

export default function EditableText({
  value,
  onChange,
  style = {},
  onStyleChange,
  variant = 'body',
  placeholder = '텍스트를 입력하세요',
  multiline = false,
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
  const [sizeAnchorEl, setSizeAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setIsEditing(true);
    setAnchorEl(e.currentTarget);
  };

  const handleBlur = () => {
    // 포퍼가 열려있으면 blur 무시
    if (colorAnchorEl || sizeAnchorEl) return;
    
    setTimeout(() => {
      if (!colorAnchorEl && !sizeAnchorEl) {
        setIsEditing(false);
        setAnchorEl(null);
        if (localValue !== value) {
          onChange(localValue);
        }
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      setIsEditing(false);
      setAnchorEl(null);
      onChange(localValue);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setAnchorEl(null);
      setLocalValue(value);
    }
  };

  const handleFormatChange = (format: 'bold' | 'italic' | 'underline') => {
    if (onStyleChange) {
      onStyleChange({
        ...style,
        [format]: !style[format],
      });
    }
  };

  const handleColorChange = (color: string) => {
    if (onStyleChange) {
      onStyleChange({
        ...style,
        color,
      });
    }
    setColorAnchorEl(null);
  };

  const handleSizeChange = (size: 'small' | 'medium' | 'large') => {
    if (onStyleChange) {
      onStyleChange({
        ...style,
        fontSize: size,
      });
    }
    setSizeAnchorEl(null);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'title':
        return {
          fontSize: style.fontSize ? FONT_SIZES[style.fontSize] : '1.5rem',
          fontWeight: 700,
          lineHeight: 1.3,
        };
      case 'subtitle':
        return {
          fontSize: style.fontSize ? FONT_SIZES[style.fontSize] : '1.125rem',
          fontWeight: 600,
          lineHeight: 1.4,
        };
      case 'caption':
        return {
          fontSize: style.fontSize ? FONT_SIZES[style.fontSize] : '0.875rem',
          fontWeight: 400,
          lineHeight: 1.5,
          color: style.color || '#6B7280',
        };
      default:
        return {
          fontSize: style.fontSize ? FONT_SIZES[style.fontSize] : '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
        };
    }
  };

  const textStyles = {
    ...getVariantStyles(),
    fontWeight: style.bold ? 700 : getVariantStyles().fontWeight,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    color: style.color || getVariantStyles().color || '#1F2937',
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          cursor: disabled ? 'default' : 'text',
          borderRadius: 1,
          transition: 'all 0.2s',
          position: 'relative',
          '&:hover': disabled ? {} : {
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            outline: '2px dashed #3B82F6',
            outlineOffset: 2,
          },
          ...(isEditing && {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            outline: '2px solid #3B82F6',
            outlineOffset: 2,
          }),
          p: 0.5,
          minHeight: variant === 'title' ? 48 : variant === 'subtitle' ? 36 : 24,
        }}
      >
        {isEditing ? (
          <TextField
            inputRef={inputRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            multiline={multiline}
            rows={multiline ? 3 : 1}
            fullWidth
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                ...textStyles,
                p: 0,
              },
            }}
            sx={{
              '& .MuiInputBase-input': {
                p: 0,
              },
            }}
          />
        ) : (
          <Box
            sx={{
              ...textStyles,
              minHeight: variant === 'title' ? 36 : variant === 'subtitle' ? 28 : 20,
              display: 'flex',
              alignItems: 'center',
              opacity: value ? 1 : 0.5,
            }}
          >
            {value || placeholder}
          </Box>
        )}
      </Box>

      {/* 스타일링 도구바 */}
      <Popover
        open={Boolean(anchorEl) && isEditing && !!onStyleChange}
        anchorEl={anchorEl}
        onClose={() => {}}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        sx={{
          pointerEvents: 'auto',
          '& .MuiPopover-paper': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: 2,
            p: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          },
        }}
      >
        <Tooltip title="굵게 (Ctrl+B)">
          <IconButton
            size="small"
            onClick={() => handleFormatChange('bold')}
            sx={{
              backgroundColor: style.bold ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: style.bold ? '#3B82F6' : '#6B7280',
            }}
          >
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="기울임 (Ctrl+I)">
          <IconButton
            size="small"
            onClick={() => handleFormatChange('italic')}
            sx={{
              backgroundColor: style.italic ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: style.italic ? '#3B82F6' : '#6B7280',
            }}
          >
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="밑줄 (Ctrl+U)">
          <IconButton
            size="small"
            onClick={() => handleFormatChange('underline')}
            sx={{
              backgroundColor: style.underline ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: style.underline ? '#3B82F6' : '#6B7280',
            }}
          >
            <FormatUnderlined fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        
        <Tooltip title="글자 색상">
          <IconButton
            size="small"
            onClick={(e) => setColorAnchorEl(e.currentTarget)}
            sx={{ color: style.color || '#6B7280' }}
          >
            <FormatColorText fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="글자 크기">
          <IconButton
            size="small"
            onClick={(e) => setSizeAnchorEl(e.currentTarget)}
            sx={{ color: '#6B7280' }}
          >
            <FormatSize fontSize="small" />
          </IconButton>
        </Tooltip>
      </Popover>

      {/* 색상 선택 팝오버 */}
      <Popover
        open={Boolean(colorAnchorEl)}
        anchorEl={colorAnchorEl}
        onClose={() => setColorAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPopover-paper': {
            p: 1.5,
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {COLORS.map((color) => (
            <IconButton
              key={color}
              size="small"
              onClick={() => handleColorChange(color)}
              sx={{
                width: 32,
                height: 32,
                backgroundColor: color,
                border: style.color === color ? '2px solid #3B82F6' : '2px solid transparent',
                '&:hover': {
                  backgroundColor: color,
                  opacity: 0.8,
                },
              }}
            >
              {style.color === color && <Check sx={{ color: 'white', fontSize: 16 }} />}
            </IconButton>
          ))}
        </Box>
      </Popover>

      {/* 크기 선택 팝오버 */}
      <Popover
        open={Boolean(sizeAnchorEl)}
        anchorEl={sizeAnchorEl}
        onClose={() => setSizeAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPopover-paper': {
            p: 1,
            borderRadius: 2,
          },
        }}
      >
        <ToggleButtonGroup
          value={style.fontSize || 'medium'}
          exclusive
          onChange={(_, newSize) => newSize && handleSizeChange(newSize)}
          size="small"
        >
          <ToggleButton value="small" sx={{ px: 2 }}>
            <Box sx={{ fontSize: '0.75rem' }}>가</Box>
          </ToggleButton>
          <ToggleButton value="medium" sx={{ px: 2 }}>
            <Box sx={{ fontSize: '1rem' }}>가</Box>
          </ToggleButton>
          <ToggleButton value="large" sx={{ px: 2 }}>
            <Box sx={{ fontSize: '1.25rem' }}>가</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Popover>
    </>
  );
}
