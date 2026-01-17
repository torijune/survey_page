import React, { useEffect, useState, useRef } from 'react';
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
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
  Stack,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  BarChart,
  Link as LinkIcon,
  Download,
  PictureAsPdf,
  CheckCircle,
  Search,
  Refresh,
  PlayArrow,
  Stop,
  ContentCopy,
  ArrowBack,
  FolderOpen,
  People,
  Assignment,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Survey,
  getSurveys,
  createSurvey,
  deleteSurvey,
  downloadResponses,
  publishSurvey,
  closeSurvey,
  importSurveyFromPDF,
  PDFImportResponse,
} from '../../../api/surveys';

export default function SurveyListPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; survey: Survey } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // PDF 업로드 관련 상태
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState<PDFImportResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadSurveys();
  }, []);
  
  const loadSurveys = async () => {
    try {
      const data = await getSurveys();
      setSurveys(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSurveys();
    setRefreshing(false);
  };
  
  const handleCreate = async () => {
    setCreating(true);
    try {
      const survey = await createSurvey({ title: '' });
      router.push(`/admin/surveys/${survey.id}/edit`);
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  };
  
  const handleDelete = async (survey: Survey) => {
    if (!confirm(`"${survey.title || '제목 없음'}" 설문을 삭제하시겠습니까?`)) return;
    
    try {
      await deleteSurvey(survey.id!);
      setSurveys(surveys.filter(s => s.id !== survey.id));
    } catch (e: any) {
      setError(e.message);
    }
    setMenuAnchor(null);
  };

  const handlePublish = async (survey: Survey) => {
    try {
      const updated = await publishSurvey(survey.id!);
      setSurveys(surveys.map((s) => (s.id === survey.id ? updated : s)));
    } catch (e: any) {
      setError(e.message);
    }
    setMenuAnchor(null);
  };

  const handleClose = async (survey: Survey) => {
    try {
      const updated = await closeSurvey(survey.id!);
      setSurveys(surveys.map((s) => (s.id === survey.id ? updated : s)));
    } catch (e: any) {
      setError(e.message);
    }
    setMenuAnchor(null);
  };
  
  const handleDownload = async (survey: Survey, format: 'csv' | 'xlsx') => {
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
    setMenuAnchor(null);
  };
  
  const handleCopyLink = (survey: Survey) => {
    const url = `${window.location.origin}/survey/${survey.share_id}`;
    navigator.clipboard.writeText(url);
    alert('링크가 복사되었습니다.');
    setMenuAnchor(null);
  };
  
  // PDF handlers
  const handlePdfDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handlePdfDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handlePdfDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const pdf = files.find((f) => f.type === 'application/pdf');
    if (pdf) setPdfFile(pdf);
  };
  
  const handlePdfImport = async () => {
    if (!pdfFile) return;
    
    setPdfUploading(true);
    setError(null);
    
    try {
      const result = await importSurveyFromPDF(pdfFile);
      setPdfResult(result);
      
      if (result.success && result.survey_id) {
        setTimeout(() => {
          router.push(`/admin/surveys/${result.survey_id}/edit`);
        }, 1500);
      }
    } catch (e: any) {
      setError(e.message || 'PDF 설문 가져오기 실패');
    } finally {
      setPdfUploading(false);
    }
  };
  
  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setPdfFile(null);
    setPdfResult(null);
  };

  // Stats
  const stats = {
    total: surveys.length,
    active: surveys.filter((s) => s.status === 'published').length,
    draft: surveys.filter((s) => s.status === 'draft').length,
    closed: surveys.filter((s) => s.status === 'closed').length,
  };

  // Filtering
  const filteredSurveys = surveys
    .filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery && !s.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published':
        return { label: '진행 중', color: '#10B981', bg: '#D1FAE5' };
      case 'closed':
        return { label: '마감', color: '#6B7280', bg: '#F3F4F6' };
      default:
        return { label: '초안', color: '#F59E0B', bg: '#FEF3C7' };
    }
  };
  
  return (
    <>
      <Head>
        <title>설문 관리 | SurveyMachine</title>
      </Head>
      
      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            color: 'white',
            py: 4,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => router.push('/')}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <ArrowBack />
                </IconButton>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    설문 관리
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    설문을 생성하고 응답을 관리하세요
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={() => setPdfDialogOpen(true)}
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
                  PDF 가져오기
                </Button>
                <Button
                  variant="contained"
                  startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <Add />}
                  onClick={handleCreate}
                  disabled={creating}
                  sx={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    },
                  }}
                >
                  새 설문 만들기
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>
        
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Stats */}
          <Stack direction="row" spacing={2} sx={{ mb: 4, overflowX: 'auto', pb: 1 }}>
            {[
              { key: 'all', label: '전체', value: stats.total, color: '#3B82F6' },
              { key: 'published', label: '진행 중', value: stats.active, color: '#10B981' },
              { key: 'draft', label: '초안', value: stats.draft, color: '#F59E0B' },
              { key: 'closed', label: '마감', value: stats.closed, color: '#6B7280' },
            ].map((stat) => (
              <Paper
                key={stat.key}
                elevation={0}
                onClick={() => setStatusFilter(stat.key)}
                sx={{
                  px: 3,
                  py: 2,
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: statusFilter === stat.key ? stat.color : 'transparent',
                  backgroundColor: statusFilter === stat.key ? `${stat.color}10` : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: 120,
                  '&:hover': {
                    borderColor: stat.color,
                  },
                }}
              >
                <Typography variant="h4" fontWeight={800} sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="grey.600" fontWeight={500}>
                  {stat.label}
                </Typography>
              </Paper>
            ))}
          </Stack>
          
          {/* Survey List */}
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
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <TextField
                  size="small"
                  placeholder="설문 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'grey.400', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: 300,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      backgroundColor: 'grey.50',
                      '& fieldset': { borderColor: 'transparent' },
                      '&:hover fieldset': { borderColor: 'grey.300' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                    },
                  }}
                />
                <Tooltip title="새로고침">
                  <IconButton
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{
                      backgroundColor: 'grey.100',
                      '&:hover': { backgroundColor: 'grey.200' },
                    }}
                  >
                    <Refresh
                      sx={{
                        fontSize: 20,
                        animation: refreshing ? 'spin 1s linear infinite' : 'none',
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredSurveys.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <FolderOpen sx={{ fontSize: 40, color: 'grey.400' }} />
                </Box>
                <Typography variant="h6" color="grey.600" gutterBottom>
                  {searchQuery ? '검색 결과가 없습니다' : '설문이 없습니다'}
                </Typography>
                <Typography variant="body2" color="grey.500" sx={{ mb: 3 }}>
                  {searchQuery ? '다른 검색어를 시도해보세요' : '첫 번째 설문을 만들어보세요!'}
                </Typography>
                {!searchQuery && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreate}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}
                  >
                    새 설문 만들기
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'grey.700' }}>설문</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'grey.700' }}>상태</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'grey.700' }} align="center">응답</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'grey.700' }}>생성일</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'grey.700' }} align="right">작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSurveys.map((survey) => {
                      const status = getStatusConfig(survey.status);
                      const questionCount = survey.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0;
                      
                      return (
                        <TableRow
                          key={survey.id}
                          sx={{
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            '&:hover': { backgroundColor: 'grey.50' },
                          }}
                          onClick={() => router.push(`/admin/surveys/${survey.id}/edit`)}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  width: 44,
                                  height: 44,
                                  backgroundColor: 'primary.50',
                                  color: 'primary.main',
                                }}
                              >
                                <Assignment />
                              </Avatar>
                              <Box>
                                <Typography fontWeight={600} color="grey.800">
                                  {survey.title || '제목 없음'}
                                </Typography>
                                <Typography variant="caption" color="grey.500">
                                  {questionCount}개 문항
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Chip
                              size="small"
                              label={status.label}
                              sx={{
                                backgroundColor: status.bg,
                                color: status.color,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <People sx={{ fontSize: 16, color: 'grey.400' }} />
                              <Typography fontWeight={600}>{survey.response_count || 0}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Typography variant="body2" color="grey.600">
                              {survey.created_at
                                ? new Date(survey.created_at).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="편집">
                                <IconButton
                                  size="small"
                                  onClick={() => router.push(`/admin/surveys/${survey.id}/edit`)}
                                  sx={{ color: 'grey.500', '&:hover': { color: 'primary.main' } }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="응답 현황">
                                <IconButton
                                  size="small"
                                  onClick={() => router.push(`/admin/surveys/${survey.id}/responses`)}
                                  sx={{ color: 'grey.500', '&:hover': { color: 'primary.main' } }}
                                >
                                  <BarChart fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="더보기">
                                <IconButton
                                  size="small"
                                  onClick={(e) => setMenuAnchor({ el: e.currentTarget, survey })}
                                  sx={{ color: 'grey.500', '&:hover': { color: 'grey.700' } }}
                                >
                                  <MoreVert fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Container>
      </Box>
      
      {/* Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            minWidth: 200,
          },
        }}
      >
        <MenuItem onClick={() => router.push(`/admin/surveys/${menuAnchor?.survey.id}/preview`)}>
          <Visibility fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> 미리보기
        </MenuItem>
        {menuAnchor?.survey.status === 'published' && (
          <MenuItem onClick={() => handleCopyLink(menuAnchor.survey)}>
            <ContentCopy fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> 링크 복사
          </MenuItem>
        )}
        <Divider sx={{ my: 1 }} />
        {menuAnchor?.survey.status === 'draft' && (
          <MenuItem onClick={() => handlePublish(menuAnchor.survey)} sx={{ color: 'success.main' }}>
            <PlayArrow fontSize="small" sx={{ mr: 1.5 }} /> 배포하기
          </MenuItem>
        )}
        {menuAnchor?.survey.status === 'published' && (
          <MenuItem onClick={() => handleClose(menuAnchor.survey)} sx={{ color: 'warning.main' }}>
            <Stop fontSize="small" sx={{ mr: 1.5 }} /> 마감하기
          </MenuItem>
        )}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => handleDownload(menuAnchor!.survey, 'xlsx')}>
          <Download fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> XLSX 다운로드
        </MenuItem>
        <MenuItem onClick={() => handleDownload(menuAnchor!.survey, 'csv')}>
          <Download fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> CSV 다운로드
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => handleDelete(menuAnchor!.survey)} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1.5 }} /> 삭제
        </MenuItem>
      </Menu>
      
      {/* PDF Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={handleClosePdfDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          PDF에서 설문 가져오기
        </DialogTitle>
        <DialogContent>
          {pdfResult ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                }}
              >
                <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                설문이 생성되었습니다!
              </Typography>
              <Typography color="grey.600" sx={{ mb: 1 }}>
                {pdfResult.survey_title}
              </Typography>
              <Typography variant="body2" color="grey.500">
                섹션 {pdfResult.sections_count}개, 문항 {pdfResult.questions_count}개
              </Typography>
              <Typography variant="caption" color="grey.400" sx={{ display: 'block', mt: 3 }}>
                편집 페이지로 이동합니다...
              </Typography>
            </Box>
          ) : (
            <Box
              onDragEnter={handlePdfDragEnter}
              onDragLeave={handlePdfDragLeave}
              onDragOver={handlePdfDragOver}
              onDrop={handlePdfDrop}
              onClick={() => pdfInputRef.current?.click()}
              sx={{
                p: 5,
                border: '2px dashed',
                borderColor: isDragging ? 'primary.main' : 'grey.300',
                borderRadius: 4,
                backgroundColor: isDragging ? 'primary.50' : 'grey.50',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.50',
                },
              }}
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPdfFile(file);
                }}
              />
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  backgroundColor: isDragging ? 'primary.100' : 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <PictureAsPdf sx={{ fontSize: 32, color: isDragging ? 'primary.main' : 'grey.500' }} />
              </Box>
              {pdfFile ? (
                <>
                  <Typography variant="body1" fontWeight={600} color="grey.800">
                    {pdfFile.name}
                  </Typography>
                  <Typography variant="caption" color="grey.500">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body1" fontWeight={600} color="grey.700">
                    PDF 파일을 드래그하거나 클릭
                  </Typography>
                  <Typography variant="caption" color="grey.500">
                    설문지 PDF를 업로드하면 자동으로 설문이 생성됩니다
                  </Typography>
                </>
              )}
            </Box>
          )}
          {pdfUploading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClosePdfDialog}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            취소
          </Button>
          {!pdfResult && (
            <Button
              variant="contained"
              onClick={handlePdfImport}
              disabled={!pdfFile || pdfUploading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {pdfUploading ? '분석 중...' : '가져오기'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
