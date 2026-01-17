import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Paper,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import { Add, Delete, DragIndicator, Save, Visibility, VisibilityOff, Autorenew } from '@mui/icons-material';
import { Question, QuestionOption, LikertConfig, ValidationRules } from '../../../api/surveys';

interface QuestionEditorProps {
  question: Question;
  onChange: (question: Question) => void;
  onDelete: () => void;
  onSave?: () => void;
  onToggleHide?: () => void;
  isNew?: boolean; // 새로 생성된 문항인지 (아직 DB에 저장 안됨)
}

const QUESTION_TYPES = [
  { value: 'single_choice', label: '단일 선택' },
  { value: 'multiple_choice', label: '다중 선택' },
  { value: 'dropdown', label: '드롭다운' },
  { value: 'short_text', label: '단답형' },
  { value: 'long_text', label: '장문형' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'likert', label: '리커트 척도' },
];

export default function QuestionEditor({
  question,
  onChange,
  onDelete,
  onSave,
  onToggleHide,
  isNew = false,
}: QuestionEditorProps) {
  const hasOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(question.type);
  const isLikert = question.type === 'likert';
  const isText = ['short_text', 'long_text'].includes(question.type);
  const isNumber = question.type === 'number';
  
  // 리커트 척도 레이블 템플릿
  const getLikertLabelTemplates = (min: number, max: number): { value: string; label: string }[] => {
    const templates: { value: string; label: string }[] = [];
    const range = max - min + 1;
    
    if (range === 2) {
      templates.push({ value: '예, 아니오', label: '예, 아니오' });
      templates.push({ value: '동의, 비동의', label: '동의, 비동의' });
    } else if (range === 3) {
      templates.push({ value: '불만족, 보통, 만족', label: '불만족, 보통, 만족' });
      templates.push({ value: '낮음, 보통, 높음', label: '낮음, 보통, 높음' });
      templates.push({ value: '아니오, 보통, 예', label: '아니오, 보통, 예' });
    } else if (range === 4) {
      templates.push({ value: '전혀 아니다, 아니다, 그렇다, 매우 그렇다', label: '전혀 아니다, 아니다, 그렇다, 매우 그렇다' });
      templates.push({ value: '매우 낮음, 낮음, 높음, 매우 높음', label: '매우 낮음, 낮음, 높음, 매우 높음' });
    } else if (range === 5) {
      templates.push({ value: '매우 불만족, 불만족, 보통, 만족, 매우 만족', label: '매우 불만족, 불만족, 보통, 만족, 매우 만족' });
      templates.push({ value: '전혀 아니다, 아니다, 보통, 그렇다, 매우 그렇다', label: '전혀 아니다, 아니다, 보통, 그렇다, 매우 그렇다' });
      templates.push({ value: '매우 낮음, 낮음, 보통, 높음, 매우 높음', label: '매우 낮음, 낮음, 보통, 높음, 매우 높음' });
    } else if (range === 6) {
      templates.push({ value: '전혀 아니다, 아니다, 약간 아니다, 약간 그렇다, 그렇다, 매우 그렇다', label: '전혀 아니다, 아니다, 약간 아니다, 약간 그렇다, 그렇다, 매우 그렇다' });
    } else if (range === 7) {
      templates.push({ value: '전혀 아니다, 매우 아니다, 아니다, 보통, 그렇다, 매우 그렇다, 완전히 그렇다', label: '전혀 아니다, 매우 아니다, 아니다, 보통, 그렇다, 매우 그렇다, 완전히 그렇다' });
    }
    
    templates.push({ value: '', label: '직접 입력' });
    return templates;
  };
  
  const handleChange = (field: keyof Question, value: any) => {
    onChange({ ...question, [field]: value });
  };
  
  const handleOptionChange = (index: number, field: keyof QuestionOption, value: any) => {
    const newOptions = [...question.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onChange({ ...question, options: newOptions });
  };
  
  const addOption = () => {
    const newOption: QuestionOption = {
      label: '',
      value: `option_${question.options.length + 1}`,
      order_index: question.options.length,
      allow_other: false,
    };
    onChange({ ...question, options: [...question.options, newOption] });
  };
  
  const removeOption = (index: number) => {
    const newOptions = question.options.filter((_, i) => i !== index);
    onChange({ ...question, options: newOptions });
  };
  
  const handleValidationChange = (field: keyof ValidationRules, value: any) => {
    const newRules = { ...question.validation_rules, [field]: value };
    onChange({ ...question, validation_rules: newRules });
  };
  
  const handleLikertChange = (field: keyof LikertConfig, value: any) => {
    const newConfig = { ...question.likert_config, [field]: value };
    onChange({ ...question, likert_config: newConfig });
  };
  
  const addLikertRow = () => {
    const rows = question.likert_config?.rows || [];
    handleLikertChange('rows', [...rows, `항목 ${rows.length + 1}`]);
  };
  
  const removeLikertRow = (index: number) => {
    const rows = question.likert_config?.rows || [];
    handleLikertChange('rows', rows.filter((_, i) => i !== index));
  };
  
  const updateLikertRow = (index: number, value: string) => {
    const rows = [...(question.likert_config?.rows || [])];
    rows[index] = value;
    handleLikertChange('rows', rows);
  };
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 2,
        borderRadius: 2,
        border: '1px solid #E5E7EB',
        opacity: question.is_hidden ? 0.6 : 1,
        backgroundColor: question.is_hidden ? '#F9FAFB' : 'white',
        position: 'relative',
        '&:hover': {
          borderColor: 'primary.light',
        },
      }}
    >
      {question.is_hidden && (
        <Chip
          label="숨김"
          size="small"
          color="warning"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        />
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <IconButton size="small" sx={{ cursor: 'grab', mt: 1 }}>
          <DragIndicator />
        </IconButton>
        
        <Box sx={{ flex: 1 }}>
          {/* 문항 제목 */}
          <TextField
            fullWidth
            label="문항 제목"
            placeholder="문항 제목을 입력하세요"
            value={question.title === '새 문항' ? '' : question.title}
            onChange={(e) => handleChange('title', e.target.value)}
            sx={{ mb: 2 }}
          />
          
          {/* 문항 설명 */}
          <TextField
            fullWidth
            label="설명 (선택사항)"
            value={question.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            size="small"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {/* 문항 유형 */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>문항 유형</InputLabel>
              <Select
                value={question.type}
                label="문항 유형"
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {QUESTION_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* 필수 여부 */}
            <FormControlLabel
              control={
                <Switch
                  checked={question.required}
                  onChange={(e) => handleChange('required', e.target.checked)}
                />
              }
              label="필수"
            />
          </Box>
          
          {/* 선택지 옵션 (단일/다중선택, 드롭다운) */}
          {hasOptions && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                선택지
              </Typography>
              {question.options.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    value={option.label || ''}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    placeholder="선택지 텍스트를 입력하세요"
                    sx={{ flex: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={option.allow_other}
                        onChange={(e) => handleOptionChange(index, 'allow_other', e.target.checked)}
                      />
                    }
                    label="기타"
                  />
                  <IconButton size="small" onClick={() => removeOption(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<Add />}
                onClick={addOption}
                size="small"
                sx={{ mt: 1 }}
              >
                선택지 추가
              </Button>
            </Box>
          )}
          
          {/* 리커트 설정 */}
          {isLikert && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                리커트 척도 설정
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  size="small"
                  type="number"
                  label="최소값"
                  value={question.likert_config?.scale_min || 1}
                  onChange={(e) => handleLikertChange('scale_min', parseInt(e.target.value))}
                  sx={{ width: 100 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="최대값"
                  value={question.likert_config?.scale_max || 5}
                  onChange={(e) => handleLikertChange('scale_max', parseInt(e.target.value))}
                  sx={{ width: 100 }}
                />
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                척도 레이블
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 250 }}>
                  <InputLabel>템플릿 선택</InputLabel>
                  <Select
                    value=""
                    label="템플릿 선택"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLikertChange('labels', e.target.value.split(',').map(s => s.trim()));
                      }
                    }}
                  >
                    {getLikertLabelTemplates(
                      question.likert_config?.scale_min || 1,
                      question.likert_config?.scale_max || 5
                    ).map((template, idx) => (
                      <MenuItem key={idx} value={template.value}>
                        {template.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={() => {
                    const templates = getLikertLabelTemplates(
                      question.likert_config?.scale_min || 1,
                      question.likert_config?.scale_max || 5
                    );
                    const defaultTemplate = templates.find(t => t.value && t.value !== '');
                    if (defaultTemplate) {
                      handleLikertChange('labels', defaultTemplate.value.split(',').map(s => s.trim()));
                    }
                  }}
                  title="기본 템플릿 적용"
                  sx={{ border: '1px solid #E5E7EB', borderRadius: 1 }}
                >
                  <Autorenew fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                size="small"
                value={(question.likert_config?.labels || []).join(', ')}
                onChange={(e) => handleLikertChange('labels', e.target.value.split(',').map(s => s.trim()))}
                placeholder="매우 불만족, 불만족, 보통, 만족, 매우 만족 (쉼표로 구분)"
                helperText={`최소값 ${question.likert_config?.scale_min || 1}부터 최대값 ${question.likert_config?.scale_max || 5}까지 ${(question.likert_config?.scale_max || 5) - (question.likert_config?.scale_min || 1) + 1}개의 레이블이 필요합니다.`}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                평가 항목
              </Typography>
              {(question.likert_config?.rows || []).map((row, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={row}
                    onChange={(e) => updateLikertRow(index, e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeLikertRow(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<Add />}
                onClick={addLikertRow}
                size="small"
              >
                항목 추가
              </Button>
            </Box>
          )}
          
          {/* 텍스트 검증 옵션 */}
          {isText && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                type="number"
                label="최소 글자수"
                value={question.validation_rules?.min_length || ''}
                onChange={(e) => handleValidationChange('min_length', e.target.value ? parseInt(e.target.value) : null)}
                sx={{ width: 120 }}
              />
              <TextField
                size="small"
                type="number"
                label="최대 글자수"
                value={question.validation_rules?.max_length || ''}
                onChange={(e) => handleValidationChange('max_length', e.target.value ? parseInt(e.target.value) : null)}
                sx={{ width: 120 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>패턴 검증</InputLabel>
                <Select
                  value={question.validation_rules?.pattern || ''}
                  label="패턴 검증"
                  onChange={(e) => handleValidationChange('pattern', e.target.value || null)}
                >
                  <MenuItem value="">없음</MenuItem>
                  <MenuItem value="email">이메일</MenuItem>
                  <MenuItem value="phone">전화번호</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          
          {/* 숫자 검증 옵션 */}
          {isNumber && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="number"
                label="최소값"
                value={question.validation_rules?.min_value ?? ''}
                onChange={(e) => handleValidationChange('min_value', e.target.value ? parseFloat(e.target.value) : null)}
                sx={{ width: 120 }}
              />
              <TextField
                size="small"
                type="number"
                label="최대값"
                value={question.validation_rules?.max_value ?? ''}
                onChange={(e) => handleValidationChange('max_value', e.target.value ? parseFloat(e.target.value) : null)}
                sx={{ width: 120 }}
              />
            </Box>
          )}
        </Box>
        
        {/* 액션 버튼들 */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isNew && onSave && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Save />}
              onClick={onSave}
              sx={{ borderRadius: 2 }}
            >
              저장
            </Button>
          )}
          
          {onToggleHide && (
            <IconButton
              size="small"
              onClick={onToggleHide}
              color={question.is_hidden ? 'default' : 'primary'}
              title={question.is_hidden ? '표시하기' : '숨기기'}
            >
              {question.is_hidden ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          )}
          
          <IconButton 
            color="error" 
            onClick={onDelete}
            size="small"
            title="삭제"
          >
            <Delete />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

