import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Popover,
  Divider,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatColorText,
  Check,
} from '@mui/icons-material';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  onBlur?: () => void;
}

const COLORS = [
  '#1F2937',
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '텍스트를 입력하세요',
  minHeight = 40,
  onBlur,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 초기 값 설정
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  // 외부에서 value가 변경될 때 동기화 (포커스 없을 때만)
  useEffect(() => {
    if (editorRef.current && !isFocused && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    onBlur?.();
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleColor = (color: string) => {
    execCommand('foreColor', color);
    setColorAnchorEl(null);
  };

  const isFormatActive = (command: string): boolean => {
    return document.queryCommandState(command);
  };

  return (
    <Box
      sx={{
        border: isFocused ? '2px solid #3B82F6' : '1px solid #E5E7EB',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      {/* 도구바 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 0.5,
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
        }}
      >
        <Tooltip title="굵게 (Ctrl+B)">
          <IconButton
            size="small"
            onClick={handleBold}
            sx={{
              backgroundColor: isFormatActive('bold') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: isFormatActive('bold') ? '#3B82F6' : '#6B7280',
            }}
          >
            <FormatBold sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="기울임 (Ctrl+I)">
          <IconButton
            size="small"
            onClick={handleItalic}
            sx={{
              backgroundColor: isFormatActive('italic') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: isFormatActive('italic') ? '#3B82F6' : '#6B7280',
            }}
          >
            <FormatItalic sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="밑줄 (Ctrl+U)">
          <IconButton
            size="small"
            onClick={handleUnderline}
            sx={{
              backgroundColor: isFormatActive('underline') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: isFormatActive('underline') ? '#3B82F6' : '#6B7280',
            }}
          >
            <FormatUnderlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title="글자 색상">
          <IconButton
            size="small"
            onClick={(e) => setColorAnchorEl(e.currentTarget)}
            sx={{ color: '#6B7280' }}
          >
            <FormatColorText sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 편집 영역 */}
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        sx={{
          minHeight,
          p: 1.5,
          outline: 'none',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          color: '#374151',
          '&:empty:before': {
            content: `"${placeholder}"`,
            color: '#9CA3AF',
          },
          '& b, & strong': {
            fontWeight: 700,
          },
          '& i, & em': {
            fontStyle: 'italic',
          },
          '& u': {
            textDecoration: 'underline',
          },
        }}
        suppressContentEditableWarning
      />

      {/* 색상 팝오버 */}
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
              onClick={() => handleColor(color)}
              sx={{
                width: 28,
                height: 28,
                backgroundColor: color,
                '&:hover': {
                  backgroundColor: color,
                  opacity: 0.8,
                },
              }}
            />
          ))}
        </Box>
      </Popover>
    </Box>
  );
}

// HTML을 렌더링하는 컴포넌트
export function RichTextDisplay({ html, style }: { html: string; style?: React.CSSProperties }) {
  return (
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
}
