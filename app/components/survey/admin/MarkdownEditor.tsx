import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  Title,
  Image as ImageIcon,
  Code,
  Link,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  label = 'Markdown 콘텐츠',
  placeholder = '# 제목\n\n## 소제목\n\n- 목록 항목 1\n- 목록 항목 2\n\n**굵은 글씨** *기울임*',
  rows = 15,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textField = textFieldRef.current;
    if (!textField) return;

    const start = textField.selectionStart;
    const end = textField.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // 커서 위치 조정
    setTimeout(() => {
      textField.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textField.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const uploadImageFile = async (file: File) => {
    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }

    try {
      // Supabase Storage에 업로드
      const formData = new FormData();
      formData.append('file', file);

      // 백엔드 API를 통해 이미지 업로드
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://na6biybdk3xhs2lk337vtujjd40dbvcv.lambda-url.us-east-1.on.aws'
          : 'http://localhost:8000');
      
      const response = await fetch(`${apiUrl}/api/v1/surveys/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드 실패');
      }

      const data = await response.json();
      const imageUrl = data.url;

      // Markdown 형식으로 이미지 삽입
      const textField = textFieldRef.current;
      if (textField) {
        const start = textField.selectionStart;
        const imageMarkdown = `![${file.name}](${imageUrl})\n`;
        const newText = value.substring(0, start) + imageMarkdown + value.substring(start);
        onChange(newText);
        
        // 커서 위치 조정
        setTimeout(() => {
          textField.focus();
          const newCursorPos = start + imageMarkdown.length;
          textField.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await uploadImageFile(file);
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 여러 이미지 업로드
    for (const file of imageFiles) {
      await uploadImageFile(file);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="미리보기">
            <IconButton
              size="small"
              onClick={() => setShowPreview(!showPreview)}
              color={showPreview ? 'primary' : 'default'}
            >
              👁️
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!showPreview ? (
        <Box
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            position: 'relative',
            border: isDragging ? '2px dashed #3B82F6' : '2px dashed transparent',
            borderRadius: 2,
            p: isDragging ? 1 : 0,
            transition: 'all 0.2s',
            backgroundColor: isDragging ? '#EFF6FF' : 'transparent',
          }}
        >
          {isDragging && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 2,
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h6" color="primary" fontWeight={600}>
                이미지를 여기에 놓으세요
              </Typography>
            </Box>
          )}
          
          {/* 툴바 */}
          <Paper
            elevation={0}
            sx={{
              p: 0.5,
              mb: 1,
              border: '1px solid #E5E7EB',
              borderRadius: 1,
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Tooltip title="제목 (H1)">
              <IconButton size="small" onClick={() => insertText('# ', '')}>
                <Title fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="소제목 (H2)">
              <IconButton size="small" onClick={() => insertText('## ', '')}>
                <Title fontSize="small" sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="굵게">
              <IconButton size="small" onClick={() => insertText('**', '**')}>
                <FormatBold fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="기울임">
              <IconButton size="small" onClick={() => insertText('*', '*')}>
                <FormatItalic fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="코드">
              <IconButton size="small" onClick={() => insertText('`', '`')}>
                <Code fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="링크">
              <IconButton size="small" onClick={() => insertText('[링크 텍스트](', ')')}>
                <Link fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="목록">
              <IconButton size="small" onClick={() => insertText('- ', '')}>
                <FormatListBulleted fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="번호 목록">
              <IconButton size="small" onClick={() => insertText('1. ', '')}>
                <FormatListNumbered fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="이미지 업로드">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                component="label"
              >
                <ImageIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </Paper>

          {/* 에디터 */}
          <TextField
            inputRef={textFieldRef}
            fullWidth
            multiline
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
            }}
          />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid #E5E7EB',
            borderRadius: 2,
            minHeight: 400,
            '& img': {
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 2,
              mb: 2,
            },
            '& p': {
              mb: 2,
              lineHeight: 1.8,
            },
            '& ul, & ol': {
              pl: 3,
              mb: 2,
            },
            '& li': {
              mb: 1,
            },
            '& h1': {
              fontSize: '2rem',
              fontWeight: 700,
              mb: 2,
              mt: 3,
            },
            '& h2': {
              fontSize: '1.5rem',
              fontWeight: 600,
              mb: 1.5,
              mt: 2.5,
            },
            '& h3': {
              fontSize: '1.25rem',
              fontWeight: 600,
              mb: 1,
              mt: 2,
            },
            '& code': {
              backgroundColor: '#F3F4F6',
              padding: '2px 6px',
              borderRadius: 1,
              fontFamily: 'monospace',
            },
            '& pre': {
              backgroundColor: '#F3F4F6',
              padding: 2,
              borderRadius: 1,
              overflow: 'auto',
            },
          }}
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{value}</ReactMarkdown>
          ) : (
            <Typography color="text.secondary" fontStyle="italic">
              미리보기를 보려면 콘텐츠를 입력하세요.
            </Typography>
          )}
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Markdown 형식으로 작성하세요. # 제목, ## 소제목, - 목록, **굵게**, *기울임* 등을 사용할 수 있습니다.
      </Typography>
    </Box>
  );
}
