import React, { useState, memo } from 'react';
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
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormLabel,
  Checkbox,
  Collapse,
  Stack,
} from '@mui/material';
import { Add, Delete, DragIndicator, Save, Visibility, VisibilityOff, Autorenew, Code, Settings, Bookmark, BookmarkBorder, ExpandMore, ExpandLess } from '@mui/icons-material';
import { Question, QuestionOption, LikertConfig, ValidationRules, RankingConfig, ConditionalLogic, RepeatableInputPart, RepeatableInputsConfig } from '../../../api/surveys';
import MarkdownEditor from './MarkdownEditor';

interface QuestionEditorProps {
  question: Question;
  onChange: (question: Question) => void;
  onDelete: () => void;
  onSave?: () => void;
  onToggleHide?: () => void;
  isNew?: boolean; // 새로 생성된 문항인지 (아직 DB에 저장 안됨)
  allQuestions?: Question[]; // 모든 질문 목록 (변수 삽입용)
  currentQuestionId?: string; // 현재 질문 ID (자기 자신 제외용)
  collapsible?: boolean; // 접기/펼치기 지원
  questionIndex?: number; // 문항 순서 (헤더 표시용)
}

const QUESTION_TYPES = [
  { value: 'single_choice', label: '단일 선택' },
  { value: 'single_scale', label: '단일 척도' },
  { value: 'multiple_choice', label: '다중 선택' },
  { value: 'dropdown', label: '드롭다운' },
  { value: 'short_text', label: '단답형' },
  { value: 'long_text', label: '장문형' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'likert', label: '리커트 척도' },
  { value: 'ranking', label: '순위 선택' },
  { value: 'repeatable_inputs', label: '반복 입력 (주소 등)' },
];

function QuestionEditor({
  question,
  onChange,
  onDelete,
  onSave,
  onToggleHide,
  isNew = false,
  allQuestions = [],
  currentQuestionId,
  collapsible = false,
  questionIndex = 0,
}: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const hasOptions = ['single_choice', 'single_scale', 'multiple_choice', 'dropdown', 'ranking'].includes(question.type);
  const isLikert = question.type === 'likert';
  const isRanking = question.type === 'ranking';
  const isRepeatableInputs = question.type === 'repeatable_inputs';
  const isText = ['short_text', 'long_text'].includes(question.type);
  const isNumber = question.type === 'number';
  
  // 각 선택지별 변수 삽입 메뉴 anchor 상태 관리
  const [variableMenuAnchor, setVariableMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});
  
  // 조건문 설정 다이얼로그 상태 (여러 조건 지원)
  const [conditionalDialogOpen, setConditionalDialogOpen] = useState(false);
  const [conditions, setConditions] = useState<ConditionalLogic[]>([]);
  
  // 사용자 정의 템플릿 다이얼로그 상태
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateLabels, setNewTemplateLabels] = useState('');
  
  // 로컬 스토리지에서 사용자 정의 템플릿 불러오기
  const getUserTemplates = (range: number): Array<{ value: string; label: string; id: string }> => {
    try {
      const stored = localStorage.getItem(`likert_templates_${range}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('템플릿 불러오기 실패:', e);
    }
    return [];
  };
  
  // 사용자 정의 템플릿 저장
  const saveUserTemplate = (range: number, name: string, labels: string) => {
    try {
      const templates = getUserTemplates(range);
      const newTemplate = {
        id: `user_${Date.now()}`,
        value: labels,
        label: name,
      };
      templates.push(newTemplate);
      localStorage.setItem(`likert_templates_${range}`, JSON.stringify(templates));
      return true;
    } catch (e) {
      console.error('템플릿 저장 실패:', e);
      return false;
    }
  };
  
  // 사용자 정의 템플릿 삭제
  const deleteUserTemplate = (range: number, templateId: string) => {
    try {
      const templates = getUserTemplates(range);
      const filtered = templates.filter(t => t.id !== templateId);
      localStorage.setItem(`likert_templates_${range}`, JSON.stringify(filtered));
      // 강제 리렌더링을 위해 현재 레이블을 다시 설정
      const currentLabels = question.likert_config?.labels || [];
      handleLikertChange('labels', [...currentLabels]);
      return true;
    } catch (e) {
      console.error('템플릿 삭제 실패:', e);
      return false;
    }
  };
  
  // 리커트 척도 레이블 템플릿
  const getLikertLabelTemplates = (min: number, max: number): { value: string; label: string; id?: string }[] => {
    const templates: { value: string; label: string; id?: string }[] = [];
    const range = max - min + 1;
    
    // 기본 템플릿
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
    
    // 사용자 정의 템플릿 추가
    const userTemplates = getUserTemplates(range);
    templates.push(...userTemplates);
    
    templates.push({ value: '', label: '직접 입력' });
    return templates;
  };
  
  // 템플릿 추가 핸들러
  const handleAddTemplate = () => {
    const range = (question.likert_config?.scale_max || 5) - (question.likert_config?.scale_min || 1) + 1;
    const labels = (question.likert_config?.labels || []).join(', ');
    
    if (!labels || labels.trim() === '') {
      alert('현재 입력된 레이블이 없습니다. 먼저 레이블을 입력해주세요.');
      return;
    }
    
    setNewTemplateLabels(labels);
    setNewTemplateName('');
    setTemplateDialogOpen(true);
  };
  
  // 템플릿 저장 핸들러
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }
    
    const range = (question.likert_config?.scale_max || 5) - (question.likert_config?.scale_min || 1) + 1;
    const labels = newTemplateLabels.split(',').map(s => s.trim()).filter(s => s);
    
    if (labels.length !== range) {
      alert(`레이블 개수가 맞지 않습니다. ${range}개의 레이블이 필요합니다. (현재: ${labels.length}개)`);
      return;
    }
    
    if (saveUserTemplate(range, newTemplateName.trim(), newTemplateLabels)) {
      alert('템플릿이 저장되었습니다.');
      setTemplateDialogOpen(false);
      setNewTemplateName('');
      setNewTemplateLabels('');
      // 강제 리렌더링을 위해 현재 레이블을 다시 설정
      const currentLabels = question.likert_config?.labels || [];
      handleLikertChange('labels', [...currentLabels]);
    } else {
      alert('템플릿 저장에 실패했습니다.');
    }
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
  
  const handleRankingChange = (field: keyof RankingConfig, value: any) => {
    const currentConfig = question.ranking_config || { max_ranks: 2, rank_labels: ['1순위', '2순위'] };
    const newConfig = { ...currentConfig, [field]: value };
    
    // max_ranks가 변경되면 rank_labels도 자동 업데이트
    if (field === 'max_ranks') {
      const newMaxRanks = value as number;
      const currentLabels = currentConfig.rank_labels || [];
      const newLabels = Array.from({ length: newMaxRanks }, (_, i) => 
        currentLabels[i] || `${i + 1}순위`
      );
      newConfig.rank_labels = newLabels;
    }
    
    onChange({ ...question, ranking_config: newConfig });
  };
  
  const handleRankLabelChange = (index: number, value: string) => {
    const currentConfig = question.ranking_config || { max_ranks: 2, rank_labels: ['1순위', '2순위'] };
    const newLabels = [...(currentConfig.rank_labels || [])];
    newLabels[index] = value;
    handleRankingChange('rank_labels', newLabels);
  };
  
  // 반복 입력 (주소 등) 설정
  const repeatableConfig = question.repeatable_config || { parts: [] };
  const handleRepeatablePartsChange = (parts: RepeatableInputPart[]) => {
    onChange({ ...question, repeatable_config: { ...repeatableConfig, parts } });
  };
  const setRepeatableConfigOption = (key: keyof RepeatableInputsConfig, value: boolean) => {
    onChange({ ...question, repeatable_config: { ...repeatableConfig, [key]: value } });
  };
  const addRepeatablePart = (type: 'text' | 'input' | 'select' | 'line_break') => {
    const parts = [...(repeatableConfig.parts || [])];
    if (type === 'text') {
      parts.push({ type: 'text', value: '' });
    } else if (type === 'input') {
      parts.push({ type: 'input', key: `field_${parts.filter(p => p.type === 'input').length + 1}` });
    } else if (type === 'line_break') {
      parts.push({ type: 'line_break' });
    } else {
      parts.push({
        type: 'select',
        key: 'asset_type',
        label: '유형',
        options: [
          { label: '토지', value: 'land' },
          { label: '건축물', value: 'building' },
        ],
      });
    }
    handleRepeatablePartsChange(parts);
  };
  const updateRepeatablePart = (index: number, updates: Partial<RepeatableInputPart>) => {
    const parts = [...(repeatableConfig.parts || [])];
    parts[index] = { ...parts[index], ...updates };
    onChange({ ...question, repeatable_config: { ...repeatableConfig, parts } });
  };
  const removeRepeatablePart = (index: number) => {
    const parts = (repeatableConfig.parts || []).filter((_, i) => i !== index);
    onChange({ ...question, repeatable_config: { ...repeatableConfig, parts } });
  };
  
  // 조건문 설정 관련 함수들
  const openConditionalDialog = () => {
    const raw = question.conditional_logic;
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    setConditions(list.length > 0 ? list.map(c => ({
      ...c,
      value: Array.isArray(c.value) ? c.value : (c.value != null && c.value !== '' ? [String(c.value)] : []),
    })) : [{ question_id: '', operator: 'equals', value: [] as string[], action: 'show' }]);
    setConditionalDialogOpen(true);
  };

  const closeConditionalDialog = () => {
    setConditionalDialogOpen(false);
  };

  const saveConditionalLogic = () => {
    const valid = conditions.filter(c => {
      if (!c.question_id) return false;
      const v = c.value;
      if (Array.isArray(v)) return v.length > 0;
      return v != null && v !== '';
    }).map(c => ({
      question_id: c.question_id,
      operator: c.operator,
      value: Array.isArray(c.value) ? (c.value.length === 1 ? c.value[0] : c.value) : c.value,
      action: c.action,
      target_section_id: c.target_section_id,
    }));
    onChange({ ...question, conditional_logic: valid.length > 0 ? valid : undefined });
    closeConditionalDialog();
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { question_id: '', operator: 'equals', value: [] as string[], action: 'show' }]);
  };

  const removeConditionAt = (index: number) => {
    setConditions(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ question_id: '', operator: 'equals', value: [] as string[], action: 'show' }]);
  };

  const updateConditionAt = (index: number, patch: Partial<ConditionalLogic>) => {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c));
  };

  const setConditionValueAt = (index: number, value: string[] | string) => {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, value } : c));
  };

  const handleValueToggleAt = (index: number, value: string) => {
    setConditions(prev => prev.map((c, i) => {
      if (i !== index) return c;
      const arr = Array.isArray(c.value) ? c.value : (c.value != null ? [String(c.value)] : []);
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...c, value: next };
    }));
  };

  const removeConditionalLogic = () => {
    onChange({ ...question, conditional_logic: undefined });
    closeConditionalDialog();
  };

  // 조건으로 사용할 수 있는 문항 목록 (자기 자신 제외, question_number가 있는 것만)
  const availableConditionQuestions = allQuestions.filter(
    q => q.id !== currentQuestionId && q.id && q.question_number
  );

  // questionId에 해당하는 문항의 조건 값 옵션 목록
  const getConditionOptionsByQuestionId = (questionId: string): { label: string; value: string }[] => {
    const q = availableConditionQuestions.find(x => x.id === questionId);
    if (!q) return [];
    if (['single_choice', 'multiple_choice', 'dropdown'].includes(q.type)) {
      return (q.options || []).map(o => ({ label: o.label, value: o.value }));
    }
    if (q.type === 'likert' && q.likert_config?.labels) {
      return q.likert_config.labels.map((label, index) => ({
        label,
        value: String(q.likert_config!.scale_min + index),
      }));
    }
    if (q.type === 'ranking' && q.ranking_config?.rank_labels) {
      return q.ranking_config.rank_labels.map((label, index) => ({
        label,
        value: String(index),
      }));
    }
    return [];
  };
  
  const typeLabel = QUESTION_TYPES.find(t => t.value === question.type)?.label || question.type;
  const headerTitle = question.question_number || question.title || `문항 ${questionIndex + 1}`;
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: collapsible ? 0 : 3,
        pt: collapsible ? 0 : 3,
        mb: 2,
        borderRadius: 2,
        border: '1px solid #E5E7EB',
        opacity: question.is_hidden ? 0.6 : 1,
        backgroundColor: question.is_hidden ? '#F9FAFB' : 'white',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.light',
        },
      }}
    >
      {collapsible && (
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            p: 2,
            backgroundColor: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            cursor: 'pointer',
            borderBottom: expanded ? '1px solid #E5E7EB' : 'none',
          }}
        >
          <IconButton size="small" sx={{ cursor: 'grab' }}>
            <DragIndicator />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {headerTitle || '제목 없음'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {typeLabel}
            </Typography>
          </Box>
          <Chip label={typeLabel} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
          {question.is_hidden && <Chip label="숨김" size="small" color="warning" />}
          {(() => {
            const condList = Array.isArray(question.conditional_logic) ? question.conditional_logic : (question.conditional_logic ? [question.conditional_logic] : []);
            if (condList.length === 0) return null;
            const label = condList.length === 1
              ? `조건: ${availableConditionQuestions.find(q => q.id === condList[0].question_id)?.question_number || '?'}`
              : `조건: ${condList.length}개`;
            return (
              <Chip
                icon={<Settings sx={{ fontSize: 14 }} />}
                label={label}
                size="small"
                color="primary"
                variant="outlined"
              />
            );
          })()}
          {onSave && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              color="primary"
              title="저장"
            >
              <Save />
            </IconButton>
          )}
          {onToggleHide && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onToggleHide(); }}
              title={question.is_hidden ? '표시' : '숨김'}
            >
              {question.is_hidden ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            color="error"
            title="삭제"
          >
            <Delete />
          </IconButton>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      )}
      <Collapse in={!collapsible || expanded}>
        <Box sx={{ p: collapsible ? 3 : 0, pt: collapsible ? 2 : 0, position: 'relative' }}>
      {!collapsible && (
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', gap: 1 }}>
        {question.is_hidden && (
          <Chip
            label="숨김"
            size="small"
            color="warning"
          />
        )}
        {(() => {
          const condList = Array.isArray(question.conditional_logic) ? question.conditional_logic : (question.conditional_logic ? [question.conditional_logic] : []);
          if (condList.length === 0) return null;
          const label = condList.length === 1
            ? `조건: ${availableConditionQuestions.find(q => q.id === condList[0].question_id)?.question_number || '?'}`
            : `조건: ${condList.length}개`;
          return (
            <Chip
              icon={<Settings sx={{ fontSize: 14 }} />}
              label={label}
              size="small"
              color="primary"
              variant="outlined"
            />
          );
        })()}
      </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <IconButton size="small" sx={{ cursor: 'grab', mt: 1 }}>
          <DragIndicator />
        </IconButton>
        
        <Box sx={{ flex: 1 }}>
          {/* 질문 넘버링 */}
          <TextField
            fullWidth
            label="질문 넘버링 (예: SQ1, SQ2, A1, A2, B1, B2)"
            placeholder="SQ1, SQ2, A1, A2, B1, B2 등"
            value={question.question_number || ''}
            onChange={(e) => handleChange('question_number', e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            helperText="PDF에서 추출된 넘버링 또는 수동으로 입력"
          />
          
          {/* 문항 제목 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                문항 제목
              </Typography>
              {allQuestions.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value=""
                    displayEmpty
                    onChange={(e) => {
                      const selectedQuestionId = e.target.value;
                      if (selectedQuestionId) {
                        const selectedQ = allQuestions.find(q => q.id === selectedQuestionId);
                        if (selectedQ && selectedQ.question_number) {
                          // question_number가 있는 경우만 변수 삽입
                          const varText = `{{${selectedQ.question_number}}}`;
                          const currentTitle = question.title === '새 문항' ? '' : question.title;
                          handleChange('title', currentTitle + varText);
                        }
                      }
                    }}
                    sx={{ fontSize: '0.75rem', height: 28 }}
                  >
                    <MenuItem value="" disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Code sx={{ fontSize: 16 }} />
                        <span>이전 질문 응답 삽입</span>
                      </Box>
                    </MenuItem>
                    {allQuestions
                      .filter(q => q.id !== currentQuestionId && q.id && q.question_number)
                      .map((q) => (
                        <MenuItem key={q.id} value={q.id}>
                          {q.question_number} - {q.title?.substring(0, 30) || '제목 없음'}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            <TextField
              fullWidth
              placeholder="문항 제목을 입력하세요 (예: 귀하께서는 {{SQ1}} 내에 거주...)"
              value={question.title === '새 문항' ? '' : question.title}
              onChange={(e) => handleChange('title', e.target.value)}
              helperText="이전 질문 응답을 삽입하려면 위 드롭다운을 사용하거나 {{질문번호}} 형식으로 직접 입력"
            />
          </Box>
          
          {/* 문항 설명 (마크다운, 이미지 지원) - 질문과 선택지 사이에 표시 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                설명 (선택사항, 이미지 추가 가능)
              </Typography>
              {allQuestions.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value=""
                    displayEmpty
                    onChange={(e) => {
                      const selectedQuestionId = e.target.value;
                      if (selectedQuestionId) {
                        const selectedQ = allQuestions.find(q => q.id === selectedQuestionId);
                        if (selectedQ && selectedQ.question_number) {
                          const varText = `{{${selectedQ.question_number}}}`;
                          handleChange('description', (question.description || '') + varText);
                        }
                      }
                    }}
                    sx={{ fontSize: '0.75rem', height: 28 }}
                  >
                    <MenuItem value="" disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Code sx={{ fontSize: 16 }} />
                        <span>이전 질문 응답 삽입</span>
                      </Box>
                    </MenuItem>
                    {allQuestions
                      .filter(q => q.id !== currentQuestionId && q.id && q.question_number)
                      .map((q) => (
                        <MenuItem key={q.id} value={q.id}>
                          {q.question_number} - {q.title?.substring(0, 30) || '제목 없음'}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            <MarkdownEditor
              value={question.description || ''}
              onChange={(value) => handleChange('description', value)}
              label=""
              placeholder="설명을 입력하세요. Markdown·이미지(드래그 앤 드롭) 사용 가능. {{질문번호}} 로 변수 삽입."
              rows={5}
              showLivePreview={true}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {/* 문항 유형 */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>문항 유형</InputLabel>
              <Select
                value={question.type}
                label="문항 유형"
                onChange={(e) => {
                  const newType = e.target.value;
                  if (newType === 'repeatable_inputs' && !(question.repeatable_config?.parts?.length)) {
                    onChange({
                      ...question,
                      type: newType,
                      repeatable_config: {
                        parts: [
                          { type: 'text', value: '광진구 ' },
                          { type: 'input', key: 'gu' },
                          { type: 'text', value: ' 동 ' },
                          { type: 'input', key: 'dong' },
                          { type: 'text', value: ' - ' },
                          { type: 'input', key: 'middle' },
                          { type: 'text', value: ' 번지 ' },
                          { type: 'input', key: 'bunji' },
                          { type: 'text', value: ' 호(토지, 건축물)' },
                        ],
                      },
                    });
                  } else {
                    handleChange('type', newType);
                  }
                }}
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
              {question.options.map((option, index) => {
                const open = Boolean(variableMenuAnchor[index]);
                
                const handleVariableClick = (event: React.MouseEvent<HTMLElement>) => {
                  setVariableMenuAnchor({ ...variableMenuAnchor, [index]: event.currentTarget });
                };
                
                const handleVariableSelect = (selectedQuestionId: string) => {
                  const selectedQ = allQuestions.find(q => q.id === selectedQuestionId);
                  if (selectedQ && selectedQ.question_number) {
                    // question_number가 있는 경우만 변수 삽입
                    const varText = `{{${selectedQ.question_number}}}`;
                    const currentLabel = option.label || '';
                    handleOptionChange(index, 'label', currentLabel + varText);
                  }
                  setVariableMenuAnchor({ ...variableMenuAnchor, [index]: null });
                };
                
                const handleMenuClose = () => {
                  setVariableMenuAnchor({ ...variableMenuAnchor, [index]: null });
                };
                
                return (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flex: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={option.label || ''}
                        onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                        placeholder="선택지 텍스트를 입력하세요 (예: {{SQ1}} 내에서 거주)"
                        sx={{ flex: 1 }}
                      />
                      {allQuestions.length > 0 && (
                        <>
                          <IconButton
                            size="small"
                            onClick={handleVariableClick}
                            sx={{
                              border: '1px solid #E5E7EB',
                              borderRadius: 1,
                              width: 32,
                              height: 32,
                              '&:hover': {
                                backgroundColor: '#F3F4F6',
                                borderColor: '#3B82F6',
                              },
                            }}
                            title="이전 질문 응답 삽입"
                          >
                            <Code sx={{ fontSize: 16, color: '#6B7280' }} />
                          </IconButton>
                          <Menu
                            anchorEl={variableMenuAnchor[index]}
                            open={open}
                            onClose={handleMenuClose}
                            anchorOrigin={{
                              vertical: 'bottom',
                              horizontal: 'left',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'left',
                            }}
                          >
                            <MenuItem disabled>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Code sx={{ fontSize: 16 }} />
                                <span>이전 질문 응답 삽입</span>
                              </Box>
                            </MenuItem>
                            {allQuestions
                              .filter(q => q.id !== currentQuestionId && q.id && q.question_number)
                              .map((q) => (
                                <MenuItem 
                                  key={q.id}
                                  onClick={() => handleVariableSelect(q.id!)}
                                >
                                  {q.question_number} - {q.title?.substring(0, 30) || '제목 없음'}
                                </MenuItem>
                              ))}
                          </Menu>
                        </>
                      )}
                    </Box>
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
                );
              })}
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
                        handleLikertChange('labels', String(e.target.value).split(',').map(s => s.trim()));
                      }
                    }}
                  >
                    {getLikertLabelTemplates(
                      question.likert_config?.scale_min || 1,
                      question.likert_config?.scale_max || 5
                    ).map((template, idx) => (
                      <MenuItem 
                        key={template.id || idx} 
                        value={template.value}
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          {template.id && template.id.startsWith('user_') && (
                            <Bookmark sx={{ fontSize: 16, color: 'primary.main' }} />
                          )}
                          <span>{template.label}</span>
                        </Box>
                        {template.id && template.id.startsWith('user_') && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const range = (question.likert_config?.scale_max || 5) - (question.likert_config?.scale_min || 1) + 1;
                              if (confirm('이 템플릿을 삭제하시겠습니까?')) {
                                deleteUserTemplate(range, template.id!);
                              }
                            }}
                            sx={{ ml: 1, '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
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
                <IconButton
                  size="small"
                  onClick={handleAddTemplate}
                  title="현재 레이블을 템플릿으로 저장"
                  sx={{ border: '1px solid #E5E7EB', borderRadius: 1 }}
                  color="primary"
                >
                  <BookmarkBorder fontSize="small" />
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
          
          {/* 순위 선택 설정 */}
          {isRanking && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                순위 선택 설정
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  label="최대 순위 개수"
                  value={question.ranking_config?.max_ranks || 2}
                  onChange={(e) => handleRankingChange('max_ranks', parseInt(e.target.value) || 2)}
                  inputProps={{ min: 1, max: 10 }}
                  sx={{ width: 150 }}
                  helperText="1순위, 2순위 등 최대 몇 개까지 선택할 수 있는지 설정"
                />
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                순위 레이블
              </Typography>
              {(question.ranking_config?.rank_labels || ['1순위', '2순위']).map((label, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={label}
                    onChange={(e) => handleRankLabelChange(index, e.target.value)}
                    placeholder={`${index + 1}순위`}
                    sx={{ flex: 1 }}
                  />
                </Box>
              ))}
            </Box>
          )}
          
          {/* 반복 입력 (주소 등) 설정 */}
          {isRepeatableInputs && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                입력 형식 (텍스트와 입력칸을 순서대로 구성)
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={repeatableConfig.show_add_button !== false}
                    onChange={(_, checked) => setRepeatableConfigOption('show_add_button', checked)}
                    size="small"
                  />
                }
                label="응답 시 「추가」 버튼 표시"
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {repeatableConfig.show_add_button !== false
                  ? '응답 시 ① 한 행이 먼저 보이고, + 버튼으로 같은 형식의 행을 추가할 수 있습니다.'
                  : '응답 시 ① 한 행만 표시됩니다. (추가 버튼 없음)'}
              </Typography>
              {(repeatableConfig.parts || []).map((part, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={part.type === 'text' ? '텍스트' : part.type === 'select' ? '유형 선택' : part.type === 'line_break' ? '줄바꿈' : '입력칸'}
                    color={part.type === 'text' ? 'default' : part.type === 'select' ? 'secondary' : part.type === 'line_break' ? 'info' : 'primary'}
                    variant="outlined"
                  />
                  {part.type === 'line_break' ? (
                    <Typography variant="caption" color="text.secondary">응답 화면에서 여기서 줄이 바뀝니다.</Typography>
                  ) : part.type === 'text' ? (
                    <TextField
                      size="small"
                      value={part.value || ''}
                      onChange={(e) => updateRepeatablePart(index, { value: e.target.value })}
                      placeholder="예: 광진구 "
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                  ) : part.type === 'select' ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        label="필드 키"
                        value={part.key || ''}
                        onChange={(e) => updateRepeatablePart(index, { key: e.target.value })}
                        placeholder="예: asset_type"
                        sx={{ width: 120 }}
                      />
                      <TextField
                        size="small"
                        label="라벨"
                        value={part.label || ''}
                        onChange={(e) => updateRepeatablePart(index, { label: e.target.value })}
                        placeholder="예: 유형"
                        sx={{ width: 90 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>선택지:</Typography>
                      {(part.options || []).map((opt, oi) => (
                        <TextField
                          key={oi}
                          size="small"
                          value={opt.label}
                          onChange={(e) => {
                            const next = [...(part.options || [])];
                            next[oi] = { ...next[oi], label: e.target.value };
                            updateRepeatablePart(index, { options: next });
                          }}
                          placeholder={`${oi + 1} (예: ${oi === 0 ? '토지' : '건축물'})`}
                          sx={{ width: 90 }}
                        />
                      ))}
                      <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mt: 0.5 }}>
                        → 응답 시 각 행마다 「→ 라벨 : ① 선택지1 ② 선택지2」 형태로 표시됩니다. 여기서는 문구만 수정하세요.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <TextField
                        size="small"
                        value={part.key || ''}
                        onChange={(e) => updateRepeatablePart(index, { key: e.target.value })}
                        placeholder="필드 키 (영문)"
                        sx={{ width: 120 }}
                      />
                      <TextField
                        size="small"
                        value={part.placeholder || ''}
                        onChange={(e) => updateRepeatablePart(index, { placeholder: e.target.value })}
                        placeholder="placeholder"
                        sx={{ width: 100 }}
                      />
                    </>
                  )}
                  <IconButton size="small" onClick={() => removeRepeatablePart(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                <Button startIcon={<Add />} onClick={() => addRepeatablePart('text')} size="small" variant="outlined">
                  텍스트 추가
                </Button>
                <Button startIcon={<Add />} onClick={() => addRepeatablePart('input')} size="small" variant="outlined">
                  입력칸 추가
                </Button>
                <Button startIcon={<Add />} onClick={() => addRepeatablePart('select')} size="small" variant="outlined" color="secondary">
                  유형 선택 추가
                </Button>
                <Button startIcon={<Add />} onClick={() => addRepeatablePart('line_break')} size="small" variant="outlined" color="info">
                  줄바꿈 추가
                </Button>
              </Stack>
              {(repeatableConfig.parts || []).length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  예: 텍스트 "광진구 " → 입력칸(gu) → 텍스트 " 동 " → 입력칸(dong) → … → " 호(토지, 건축물)"
                </Typography>
              )}
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
            size="small"
            onClick={openConditionalDialog}
            color={question.conditional_logic ? 'primary' : 'default'}
            title="조건문 설정"
          >
            <Settings />
          </IconButton>
          
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
      
      {/* 조건문 설정 다이얼로그 */}
      <Dialog open={conditionalDialogOpen} onClose={closeConditionalDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings />
            <Typography variant="h6">조건문 설정</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 문항을 표시할 조건을 설정하세요. 여러 조건을 추가하면 모두 만족할 때(AND) 적용됩니다.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {conditions.map((cond, index) => {
              const condQuestion = availableConditionQuestions.find(q => q.id === cond.question_id);
              const options = getConditionOptionsByQuestionId(cond.question_id);
              const values = Array.isArray(cond.value) ? cond.value : (cond.value != null ? [String(cond.value)] : []);
              return (
                <Paper key={index} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">조건 {index + 1}</Typography>
                    <IconButton size="small" onClick={() => removeConditionAt(index)} title="이 조건 제거" color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>조건 문항</InputLabel>
                      <Select
                        value={cond.question_id}
                        label="조건 문항"
                        onChange={(e) => updateConditionAt(index, { question_id: e.target.value, value: [] })}
                      >
                        <MenuItem value=""><em>문항 선택</em></MenuItem>
                        {availableConditionQuestions.map((q) => (
                          <MenuItem key={q.id} value={q.id}>
                            {q.question_number} - {q.title?.substring(0, 50) || '제목 없음'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {cond.question_id && (
                      <>
                        <FormControl fullWidth size="small">
                          <InputLabel>연산자</InputLabel>
                          <Select
                            value={cond.operator}
                            label="연산자"
                            onChange={(e) => updateConditionAt(index, { operator: e.target.value })}
                          >
                            <MenuItem value="equals">같음 (equals)</MenuItem>
                            <MenuItem value="not_equals">같지 않음 (not equals)</MenuItem>
                            {(['single_choice', 'multiple_choice', 'dropdown', 'likert', 'ranking'].includes(condQuestion?.type || '')) && (
                              <>
                                <MenuItem value="contains">포함 (contains)</MenuItem>
                                <MenuItem value="not_contains">포함하지 않음 (not contains)</MenuItem>
                              </>
                            )}
                            {(['number', 'likert'].includes(condQuestion?.type || '')) && (
                              <>
                                <MenuItem value="greater_than">보다 큼</MenuItem>
                                <MenuItem value="less_than">보다 작음</MenuItem>
                              </>
                            )}
                            {(condQuestion?.type === 'short_text' || condQuestion?.type === 'long_text') && (
                              <>
                                <MenuItem value="contains">포함 (contains)</MenuItem>
                                <MenuItem value="not_contains">포함하지 않음 (not contains)</MenuItem>
                              </>
                            )}
                          </Select>
                        </FormControl>
                        {options.length > 0 ? (
                          <FormControl fullWidth size="small" component="fieldset">
                            <FormLabel component="legend">조건 값 (여러 개 선택 가능)</FormLabel>
                            <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 1, p: 1.5, maxHeight: 160, overflow: 'auto', bgcolor: 'grey.50' }}>
                              {options.map((opt) => (
                                <FormControlLabel
                                  key={opt.value}
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={values.includes(opt.value)}
                                      onChange={() => handleValueToggleAt(index, opt.value)}
                                    />
                                  }
                                  label={opt.label}
                                />
                              ))}
                            </Box>
                          </FormControl>
                        ) : condQuestion && (
                          <TextField
                            fullWidth
                            size="small"
                            label="조건 값"
                            value={values[0] || ''}
                            onChange={(e) => setConditionValueAt(index, [e.target.value])}
                            placeholder={condQuestion.type === 'number' ? '숫자 입력' : '값 입력'}
                            type={condQuestion.type === 'number' ? 'number' : 'text'}
                          />
                        )}
                        <FormControl component="fieldset" size="small">
                          <FormLabel component="legend">동작</FormLabel>
                          <RadioGroup
                            row
                            value={cond.action}
                            onChange={(e) => updateConditionAt(index, { action: e.target.value })}
                          >
                            <FormControlLabel value="show" control={<Radio size="small" />} label="표시" />
                            <FormControlLabel value="hide" control={<Radio size="small" />} label="숨김" />
                          </RadioGroup>
                        </FormControl>
                      </>
                    )}
                  </Box>
                </Paper>
              );
            })}
            <Button startIcon={<Add />} onClick={addCondition} variant="outlined" size="small">
              조건 추가
            </Button>
            {conditions.every(c => !c.question_id) && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary">
                  조건을 설정하지 않으면 이 문항은 항상 표시됩니다.
                </Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {question.conditional_logic && (
            <Button onClick={removeConditionalLogic} color="error">
              조건문 전체 제거
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={closeConditionalDialog}>취소</Button>
          <Button onClick={saveConditionalLogic} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 템플릿 추가 다이얼로그 */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bookmark />
            <Typography variant="h6">템플릿 저장</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="템플릿 이름"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="예: 만족도 조사용"
              helperText="이 템플릿을 쉽게 찾을 수 있도록 이름을 입력하세요"
            />
            <TextField
              fullWidth
              label="레이블 (쉼표로 구분)"
              value={newTemplateLabels}
              onChange={(e) => setNewTemplateLabels(e.target.value)}
              multiline
              rows={3}
              helperText={`${(question.likert_config?.scale_max || 5) - (question.likert_config?.scale_min || 1) + 1}개의 레이블이 필요합니다`}
            />
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                미리보기:
              </Typography>
              <Typography variant="body1">
                {newTemplateLabels.split(',').map((label, idx) => (
                  <Chip 
                    key={idx} 
                    label={label.trim() || `레이블 ${idx + 1}`} 
                    size="small" 
                    sx={{ mr: 0.5, mb: 0.5 }} 
                  />
                ))}
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>취소</Button>
          <Button onClick={handleSaveTemplate} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Collapse>
    </Paper>
  );
}

// React.memo로 최적화 (props가 변경되지 않으면 리렌더링 방지)
// React.memo로 최적화 (얕은 비교 사용)
export default memo(QuestionEditor);
