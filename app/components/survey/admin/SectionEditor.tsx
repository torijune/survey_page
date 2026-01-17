import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  IconButton,
  Paper,
  Typography,
  Collapse,
  Divider,
} from '@mui/material';
import { Add, Delete, ExpandMore, ExpandLess, DragIndicator } from '@mui/icons-material';
import { Section, Question } from '../../../api/surveys';
import QuestionEditor from './QuestionEditor';

interface SectionEditorProps {
  section: Section;
  sectionIndex: number;
  onChange: (section: Section) => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (questionIndex: number) => void;
  onQuestionChange: (questionIndex: number, question: Question) => void;
  onSaveQuestion?: (questionIndex: number) => void;
  onToggleQuestionHide?: (questionIndex: number) => void;
}

export default function SectionEditor({
  section,
  sectionIndex,
  onChange,
  onDelete,
  onAddQuestion,
  onDeleteQuestion,
  onQuestionChange,
  onSaveQuestion,
  onToggleQuestionHide,
}: SectionEditorProps) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        borderRadius: 3,
        border: '2px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      {/* 섹션 헤더 */}
      <Box
        sx={{
          p: 2,
          backgroundColor: '#F9FAFB',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton size="small" sx={{ cursor: 'grab' }}>
          <DragIndicator />
        </IconButton>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {section.title 
              ? `섹션 ${sectionIndex + 1}: ${section.title}`
              : `섹션 ${sectionIndex + 1}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {section.questions.length}개 문항
          </Typography>
        </Box>
        
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          color="error"
        >
          <Delete />
        </IconButton>
        
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ p: 3 }}>
          {/* 섹션 정보 편집 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="섹션 제목"
              placeholder="섹션 제목을 입력하세요"
              value={section.title || ''}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
              size="small"
            />
          </Box>
          
          <TextField
            fullWidth
            label="섹션 설명"
            value={section.description || ''}
            onChange={(e) => onChange({ ...section, description: e.target.value })}
            size="small"
            multiline
            rows={2}
            sx={{ mb: 3 }}
          />
          
          <Divider sx={{ mb: 3 }} />
          
          {/* 문항 목록 */}
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            문항 ({section.questions.length})
          </Typography>
          
          {section.questions.map((question, qIndex) => (
            <QuestionEditor
              key={question.id || qIndex}
              question={question}
              onChange={(q) => onQuestionChange(qIndex, q)}
              onDelete={() => onDeleteQuestion(qIndex)}
              onSave={onSaveQuestion ? () => onSaveQuestion(qIndex) : undefined}
              onToggleHide={onToggleQuestionHide ? () => onToggleQuestionHide(qIndex) : undefined}
              isNew={!question.id}
            />
          ))}
          
          <Button
            startIcon={<Add />}
            onClick={onAddQuestion}
            variant="outlined"
            sx={{ mt: 2, borderRadius: 2 }}
          >
            문항 추가
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
}

