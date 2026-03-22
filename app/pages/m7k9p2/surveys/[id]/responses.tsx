// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Avatar,
  Chip,
  Divider,
  Tooltip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  People,
  CheckCircle,
  Assignment,
  TrendingUp,
  AccessTime,
  BarChart,
  PieChart,
  Refresh,
  Delete,
  TableChart,
  ViewList,
} from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import ExcelStyleFilter from '../../../../components/survey/admin/ExcelStyleFilter';

// AG Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule]);
import {
  Survey,
  SurveyResponse,
  ResponseStatistics,
  getSurvey,
  getSurveyResponses,
  getResponseStatistics,
  downloadResponses,
  deleteResponse,
} from '../../../../api/surveys';

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

// Status Cell Renderer for ag-grid
const StatusCellRenderer = (params: any) => {
  const isComplete = params.value;
  return React.createElement(
    Chip,
    {
      size: 'small',
      label: isComplete ? '완료' : '진행 중',
      sx: {
        backgroundColor: isComplete ? '#D1FAE5' : '#FEF3C7',
        color: isComplete ? '#059669' : '#D97706',
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 24,
      },
    }
  );
};

function StatCard({ title, value, subtitle, icon, gradient, iconBg }: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        background: gradient,
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)',
        },
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 3,
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            color: 'white',
            mb: 0.5,
            fontSize: { xs: '1.75rem', md: '2rem' },
          }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResponseDashboardPage() {
  const router = useRouter();
  const { id } = router.query;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [statistics, setStatistics] = useState<ResponseStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'stats' | 'spreadsheet'>('stats');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);
  
  useEffect(() => {
    if (id && typeof id === 'string') {
      loadData(id);
    }
  }, [id]);
  
  const loadData = async (surveyId: string) => {
    try {
      const [surveyData, responsesData, statsData] = await Promise.all([
        getSurvey(surveyId),
        getSurveyResponses(surveyId, true), // include_items=true로 변경
        getResponseStatistics(surveyId),
      ]);
      setSurvey(surveyData);
      setResponses(responsesData);
      setStatistics(statsData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!id || typeof id !== 'string') return;
    setRefreshing(true);
    await loadData(id);
    setRefreshing(false);
    setSelectedRows(new Set());
  };
  
  const handleDownload = async (format: 'csv' | 'xlsx') => {
    if (!survey) return;
    
    try {
      const blob = await downloadResponses(survey.id!, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${survey.title || 'survey'}_responses.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // 스프레드시트 데이터 변환
  const spreadsheetData = useMemo(() => {
    if (!survey || !responses.length) return { columns: [], rows: [] };

    const questions = survey.sections.flatMap(s => s.questions).filter(q => !q.is_hidden);

    // 공통 포맷터 (백엔드 generate_csv/xlsx와 동일한 규칙)
    const normalizeOptionCode = (raw: any): any => {
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') {
        if (raw.startsWith('option_')) {
          const suffix = raw.split('_', 2)[1];
          if (/^\d+$/.test(suffix)) return suffix;
        }
      }
      return raw;
    };

    const formatAnswerForExport = (q: Question, item: ResponseItem | undefined): string => {
      if (!item) return '';
      if (item.answer_text) return item.answer_text;

      const value = item.answer_value;
      if (value === null || value === undefined) return '';

      if (Array.isArray(value)) {
        return value.map(v => String(normalizeOptionCode(v))).join(', ');
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(normalizeOptionCode(value));
    };

    const extractRepeatableFieldValue = (
      item: ResponseItem | undefined,
      fieldKey: string | undefined | null,
      rowIndex: number
    ): string => {
      if (!item || !fieldKey) return '';
      const value = item.answer_value;
      if (value === null || value === undefined) return '';

      if (Array.isArray(value) && value.length > 0) {
        const idx = rowIndex - 1;
        if (idx >= 0 && idx < value.length && typeof value[idx] === 'object' && value[idx] !== null) {
          const v = (value[idx] as any)[fieldKey];
          return v == null ? '' : String(v);
        }
        return '';
      }
      if (typeof value === 'object') {
        const v = (value as any)[fieldKey];
        return v == null ? '' : String(v);
      }
      return String(value);
    };

    type ExportColumnMeta =
      | { kind: 'question'; question: Question }
      | { kind: 'repeatable_input'; question: Question; fieldKey?: string | null; rowIndex: number; colIndex: number };

    const exportColumns: ExportColumnMeta[] = [];

    // 컬럼 정의
    const columns = [
      {
        field: 'response_id',
        headerName: '응답 ID',
        width: 150,
        pinned: 'left',
        lockPosition: true,
        suppressMovable: true,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'submitted_at',
        headerName: '제출 시간',
        width: 180,
        pinned: 'left',
        lockPosition: true,
        suppressMovable: true,
        filter: 'agDateColumnFilter',
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
      },
      {
        field: 'is_complete',
        headerName: '상태',
        width: 100,
        pinned: 'left',
        lockPosition: true,
        suppressMovable: true,
        filter: 'agTextColumnFilter',
        cellRenderer: StatusCellRenderer,
      },
    ];

    const getQuestionCode = (q: Question): string => {
      if (q.question_number) {
        return q.question_number.replace(/-/g, '_');
      }
      return `Q_${q.id}`;
    };

    // 질문 컬럼 및 반복 입력 분해
    questions.forEach((q) => {
      if (q.type === 'repeatable_inputs' && q.repeatable_config && Array.isArray(q.repeatable_config.parts)) {
        const parts = q.repeatable_config.parts;
        const fieldKeys = parts
          .filter((part) => part && ((part as any).type === 'input' || (part as any).type === 'select'))
          .map((part) => (part as any).key);

        if (fieldKeys.length === 0) {
          const questionNumber = q.question_number || '';
          const headerName = questionNumber ? `${questionNumber}. ${q.title}` : q.title;
          const field = `question_${q.id}`;
          columns.push({
            field,
            headerName,
            width: 200,
            filter: ExcelStyleFilter,
            tooltipValueGetter: (params: any) => params.value || '',
          });
          exportColumns.push({ kind: 'question', question: q });
          return;
        }

        // 이 질문에 대해 응답 중 최대 행 수 계산
        let maxRows = 1;
        responses.forEach((resp) => {
          resp.items.forEach((item) => {
            if (item.question_id === q.id && Array.isArray(item.answer_value)) {
              if (item.answer_value.length > maxRows) {
                maxRows = item.answer_value.length;
              }
            }
          });
        });

        for (let rowIndex = 1; rowIndex <= maxRows; rowIndex++) {
          fieldKeys.forEach((fieldKey, colIndex) => {
            const suffix = `${rowIndex}${colIndex + 1}`;
            const baseCode = getQuestionCode(q);
            const headerName = `${baseCode}_${suffix}`;
            const field = `question_${q.id}_r${rowIndex}_c${colIndex + 1}`;
            columns.push({
              field,
              headerName,
              width: 200,
              filter: ExcelStyleFilter,
              tooltipValueGetter: (params: any) => params.value || '',
            });
            exportColumns.push({
              kind: 'repeatable_input',
              question: q,
              fieldKey,
              rowIndex,
              colIndex: colIndex + 1,
            });
          });
        }
      } else {
        const baseCode = getQuestionCode(q);
        const headerName = baseCode;
        const field = `question_${q.id}`;
        columns.push({
          field,
          headerName,
          width: 200,
          filter: ExcelStyleFilter,
          tooltipValueGetter: (params: any) => params.value || '',
        });
        exportColumns.push({ kind: 'question', question: q });
      }
    });

    // 행 데이터 생성
    const rows = responses.map((response) => {
      const row: any = {
        response_id: response.id?.substring(0, 8) + '...',
        response_id_full: response.id,
        submitted_at: response.submitted_at,
        is_complete: response.is_complete,
      };

      // 각 문항별 응답 데이터 매핑
      const itemMap = new Map(response.items.map(item => [item.question_id, item]));
      
      exportColumns.forEach((col) => {
        if (col.kind === 'question') {
          const q = col.question;
          const item = itemMap.get(q.id!);
          row[`question_${q.id}`] = formatAnswerForExport(q, item);
        } else if (col.kind === 'repeatable_input') {
          const q = col.question;
          const item = itemMap.get(q.id!);
          const fieldName = `question_${q.id}_r${col.rowIndex}_c${col.colIndex}`;
          row[fieldName] = extractRepeatableFieldValue(item, col.fieldKey, col.rowIndex);
        }
      });

      return row;
    });

    return { columns, rows };
  }, [survey, responses]);

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    
    setDeleting(true);
    try {
      const deletePromises = Array.from(selectedRows).map(responseId => 
        deleteResponse(responseId)
      );
      await Promise.all(deletePromises);
      
      setSnackbarMessage(`${selectedRows.size}개 응답이 삭제되었습니다.`);
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
      setSelectedRows(new Set());
      
      // 데이터 다시 로드
      if (id && typeof id === 'string') {
        await loadData(id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !survey) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error || '설문을 찾을 수 없습니다.'}</Alert>
      </Container>
    );
  }
  
  const questions = survey.sections.flatMap(s => s.questions);
  const completeCount = responses.filter(r => r.is_complete).length;
  
  return (
    <>
      <Head>
        <title>응답 현황: {survey.title} | SurveyMachine</title>
      </Head>
      
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            color: 'white',
            pt: 4,
            pb: 6,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => router.push('/m7k9p2/surveys')}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    mb: 2,
                    '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  목록으로
                </Button>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                  응답 현황
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.7 }}>
                  {survey.title || '제목 없음'}
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Tooltip title="새로고침">
                  <IconButton
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <Refresh
                      sx={{
                        animation: refreshing ? 'spin 1s linear infinite' : 'none',
                      }}
                    />
                  </IconButton>
                </Tooltip>
                <Button
                  variant={viewMode === 'stats' ? 'contained' : 'outlined'}
                  startIcon={<ViewList />}
                  onClick={() => setViewMode('stats')}
                  sx={{
                    color: viewMode === 'stats' ? 'white' : 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: viewMode === 'stats' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  통계
                </Button>
                <Button
                  variant={viewMode === 'spreadsheet' ? 'contained' : 'outlined'}
                  startIcon={<TableChart />}
                  onClick={() => setViewMode('spreadsheet')}
                  sx={{
                    color: viewMode === 'spreadsheet' ? 'white' : 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: viewMode === 'spreadsheet' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  스프레드시트
                </Button>
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 1 }} />
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownload('xlsx')}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  XLSX
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleDownload('csv')}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  CSV
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>
        
        <Container maxWidth="xl" sx={{ mt: -4, pb: 6, position: 'relative', zIndex: 2 }}>
          {/* Stats Cards */}
          {viewMode === 'stats' && (
            <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="총 응답"
                value={statistics?.total_responses || 0}
                icon={<People sx={{ fontSize: 26, color: 'white' }} />}
                gradient="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="완료됨"
                value={completeCount}
                subtitle={`${statistics?.total_responses ? Math.round((completeCount / statistics.total_responses) * 100) : 0}%`}
                icon={<CheckCircle sx={{ fontSize: 26, color: 'white' }} />}
                gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="문항 수"
                value={questions.length}
                icon={<Assignment sx={{ fontSize: 26, color: 'white' }} />}
                gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="섹션 수"
                value={survey.sections.length}
                icon={<BarChart sx={{ fontSize: 26, color: 'white' }} />}
                gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
          </Grid>
          
          {/* Question Statistics */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'grey.200',
              overflow: 'hidden',
              mb: 4,
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.100' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ backgroundColor: 'primary.50', width: 40, height: 40 }}>
                  <PieChart sx={{ fontSize: 20, color: 'primary.main' }} />
                </Avatar>
                <Typography variant="h6" fontWeight={700} color="grey.800">
                  문항별 통계
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ p: 0 }}>
              {questions.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography color="grey.500">문항이 없습니다.</Typography>
                </Box>
              ) : (
                questions.map((question, idx) => {
                  const qStats = statistics?.question_stats[question.id!];
                  const totalResponses = qStats?.response_count || 0;
                  
                  return (
                    <Box
                      key={question.id}
                      sx={{
                        p: 3,
                        borderBottom: idx < questions.length - 1 ? '1px solid' : 'none',
                        borderColor: 'grey.100',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Chip
                            size="small"
                            label={`Q${idx + 1}`}
                            sx={{
                              backgroundColor: 'primary.50',
                              color: 'primary.main',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 24,
                              mb: 1,
                            }}
                          />
                          <Typography variant="subtitle1" fontWeight={600} color="grey.800">
                            {question.title}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${totalResponses}개 응답`}
                          sx={{
                            backgroundColor: 'grey.100',
                            color: 'grey.600',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                      
                      {qStats ? (
                        <Box>
                          {qStats.average != null && typeof qStats.average === 'number' && (
                            <Typography variant="body2" color="grey.500" sx={{ mb: 2 }}>
                              평균: <strong>{qStats.average.toFixed(2)}</strong>
                            </Typography>
                          )}
                          
                          {Object.keys(qStats.value_counts).length > 0 && (
                            <Stack spacing={1.5}>
                              {Object.entries(qStats.value_counts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 8)
                                .map(([value, count]) => {
                                  const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                                  return (
                                    <Box key={value}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" color="grey.700" sx={{ maxWidth: '70%' }} noWrap>
                                          {value}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600} color="grey.800">
                                          {count} ({percentage.toFixed(1)}%)
                                        </Typography>
                                      </Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={percentage}
                                        sx={{
                                          height: 8,
                                          borderRadius: 4,
                                          backgroundColor: 'grey.100',
                                          '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                            background: `linear-gradient(90deg, #3B82F6 0%, #8B5CF6 ${Math.min(percentage, 100)}%)`,
                                          },
                                        }}
                                      />
                                    </Box>
                                  );
                                })}
                              {Object.keys(qStats.value_counts).length > 8 && (
                                <Typography variant="caption" color="grey.500">
                                  ... 외 {Object.keys(qStats.value_counts).length - 8}개 옵션
                                </Typography>
                              )}
                            </Stack>
                          )}
                          
                          {qStats.text_responses.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" fontWeight={600} color="grey.700" sx={{ mb: 1.5 }}>
                                텍스트 응답
                              </Typography>
                              <Stack spacing={1}>
                                {qStats.text_responses.slice(0, 5).map((text, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      p: 1.5,
                                      backgroundColor: 'grey.50',
                                      borderRadius: 2,
                                      borderLeft: '3px solid',
                                      borderColor: 'primary.main',
                                    }}
                                  >
                                    <Typography variant="body2" color="grey.700">
                                      {text}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                              {qStats.text_responses.length > 5 && (
                                <Typography variant="caption" color="grey.500" sx={{ mt: 1, display: 'block' }}>
                                  ... 외 {qStats.text_responses.length - 5}개 응답
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="grey.400">
                          아직 응답이 없습니다.
                        </Typography>
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
          
          {/* Responses List */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'grey.200',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.100' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ backgroundColor: 'secondary.50', width: 40, height: 40 }}>
                  <AccessTime sx={{ fontSize: 20, color: 'secondary.main' }} />
                </Avatar>
                <Typography variant="h6" fontWeight={700} color="grey.800">
                  응답 목록
                </Typography>
              </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: 'grey.700' }}>응답 ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'grey.700' }}>제출 시간</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'grey.700' }}>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            backgroundColor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                          }}
                        >
                          <People sx={{ fontSize: 28, color: 'grey.400' }} />
                        </Box>
                        <Typography color="grey.500" fontWeight={500}>
                          아직 응답이 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    responses.map((response) => (
                      <TableRow
                        key={response.id}
                        sx={{
                          transition: 'background-color 0.2s',
                          '&:hover': { backgroundColor: 'grey.50' },
                        }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              backgroundColor: 'grey.100',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              display: 'inline-block',
                              fontSize: '0.75rem',
                            }}
                          >
                            {response.id?.substring(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="grey.700">
                            {response.submitted_at
                              ? new Date(response.submitted_at).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {response.is_complete ? (
                            <Chip
                              size="small"
                              label="완료"
                              sx={{
                                backgroundColor: '#D1FAE5',
                                color: '#059669',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="진행 중"
                              sx={{
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
            </>
          )}

          {/* Spreadsheet View */}
          {viewMode === 'spreadsheet' && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'grey.200',
                overflow: 'hidden',
                height: 'calc(100vh - 300px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.100', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ backgroundColor: 'primary.50', width: 40, height: 40 }}>
                    <TableChart sx={{ fontSize: 20, color: 'primary.main' }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} color="grey.800">
                    응답 스프레드시트
                  </Typography>
                  {selectedRows.size > 0 && (
                    <Chip
                      label={`${selectedRows.size}개 선택됨`}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Box>
                {selectedRows.size > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    선택 삭제
                  </Button>
                )}
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {spreadsheetData.rows.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: 'center' }}>
                    <People sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                    <Typography color="grey.500" fontWeight={500}>
                      아직 응답이 없습니다
                    </Typography>
                  </Box>
                ) : (
                  <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
                    <AgGridReact
                      rowData={spreadsheetData.rows}
                      columnDefs={spreadsheetData.columns}
                      theme="legacy"
                      defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                        floatingFilter: true,
                      }}
                      rowSelection={{
                        mode: 'multiRow',
                        checkboxes: true,
                        headerCheckbox: true,
                        enableClickSelection: false,
                        copySelectedRows: true,
                      }}
                      onSelectionChanged={(params) => {
                        const selectedIds = new Set<string>();
                        params.api.getSelectedRows().forEach((row: any) => {
                          if (row.response_id_full) {
                            selectedIds.add(row.response_id_full);
                          }
                        });
                        setSelectedRows(selectedIds);
                      }}
                      pagination={true}
                      paginationPageSize={50}
                      animateRows={true}
                    />
                  </div>
                )}
              </Box>
            </Paper>
          )}
        </Container>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>응답 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            선택한 {selectedRows.size}개의 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            취소
          </Button>
          <Button
            onClick={handleDeleteSelected}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ag-theme-alpine {
          --ag-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          --ag-font-size: 13px;
        }
      `}</style>
    </>
  );
}
