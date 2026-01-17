import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  Skeleton,
  Badge,
  Stack,
} from '@mui/material';
import {
  Add,
  Assignment,
  BarChart,
  Edit,
  Visibility,
  Delete,
  TrendingUp,
  People,
  CheckCircle,
  PictureAsPdf,
  Search,
  MoreVert,
  Link as LinkIcon,
  PlayArrow,
  Stop,
  Refresh,
  FolderOpen,
  ArrowForward,
  ContentCopy,
  Launch,
  Analytics,
  AutoGraph,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Survey,
  getSurveys,
  createSurvey,
  deleteSurvey,
  publishSurvey,
  closeSurvey,
  importSurveyFromPDF,
  PDFImportResponse,
} from '../api/surveys';

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

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
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 150,
          height: 150,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)',
        },
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5,
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
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
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          {value}
        </Typography>
        <Typography
          variant="body1"
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
              display: 'block',
              mt: 0.5,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// 설문 카드 컴포넌트
interface SurveyCardProps {
  survey: Survey;
  onEdit: () => void;
  onPreview: () => void;
  onResponses: () => void;
  onPublish: () => void;
  onClose: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

function SurveyCard({ survey, onEdit, onPreview, onResponses, onPublish, onClose, onDelete, onCopyLink }: SurveyCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published':
        return {
          bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: 'white',
          label: '진행 중',
          dot: '#10B981',
        };
      case 'closed':
        return {
          bg: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
          color: 'white',
          label: '마감',
          dot: '#6B7280',
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          color: 'white',
          label: '초안',
          dot: '#F59E0B',
        };
    }
  };

  const status = getStatusConfig(survey.status);
  const questionCount = survey.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'grey.200',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 12px 40px rgba(59, 130, 246, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 3, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Chip
            size="small"
            label={status.label}
            sx={{
              background: status.bg,
              color: status.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
              px: 0.5,
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{
              color: 'grey.400',
              '&:hover': { color: 'grey.600', backgroundColor: 'grey.100' },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            PaperProps={{
              elevation: 0,
              sx: {
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                minWidth: 180,
              },
            }}
          >
            <MenuItem onClick={() => { setMenuAnchor(null); onEdit(); }}>
              <Edit fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> 편집
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); onPreview(); }}>
              <Visibility fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> 미리보기
            </MenuItem>
            {survey.status === 'published' && (
              <MenuItem onClick={() => { setMenuAnchor(null); onCopyLink(); }}>
                <ContentCopy fontSize="small" sx={{ mr: 1.5, color: 'grey.600' }} /> 링크 복사
              </MenuItem>
            )}
            <Divider sx={{ my: 1 }} />
            {survey.status === 'draft' && (
              <MenuItem onClick={() => { setMenuAnchor(null); onPublish(); }} sx={{ color: 'success.main' }}>
                <PlayArrow fontSize="small" sx={{ mr: 1.5 }} /> 배포하기
              </MenuItem>
            )}
            {survey.status === 'published' && (
              <MenuItem onClick={() => { setMenuAnchor(null); onClose(); }} sx={{ color: 'warning.main' }}>
                <Stop fontSize="small" sx={{ mr: 1.5 }} /> 마감하기
              </MenuItem>
            )}
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={() => { setMenuAnchor(null); onDelete(); }} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1.5 }} /> 삭제
            </MenuItem>
          </Menu>
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 2,
            minHeight: 56,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            color: 'grey.800',
            lineHeight: 1.4,
          }}
        >
          {survey.title || '제목 없음'}
        </Typography>

        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, backgroundColor: 'primary.50' }}>
              <People sx={{ fontSize: 14, color: 'primary.main' }} />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={700} color="grey.800">
                {survey.response_count || 0}
              </Typography>
              <Typography variant="caption" color="grey.500">
                응답
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, backgroundColor: 'secondary.50' }}>
              <Assignment sx={{ fontSize: 14, color: 'secondary.main' }} />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={700} color="grey.800">
                {questionCount}
              </Typography>
              <Typography variant="caption" color="grey.500">
                문항
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Typography variant="caption" color="grey.400">
          {survey.created_at ? new Date(survey.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : ''} 생성
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5 }}>
        <Button
          size="medium"
          variant="outlined"
          startIcon={<Edit />}
          onClick={onEdit}
          sx={{
            flex: 1,
            borderRadius: 2.5,
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            borderWidth: 1.5,
            '&:hover': { borderWidth: 1.5 },
          }}
        >
          편집
        </Button>
        <Button
          size="medium"
          variant="contained"
          startIcon={<Analytics />}
          onClick={onResponses}
          sx={{
            flex: 1,
            borderRadius: 2.5,
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' },
          }}
        >
          응답 보기
        </Button>
      </CardActions>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
      setSurveys(surveys.filter((s) => s.id !== survey.id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePublish = async (survey: Survey) => {
    try {
      const updated = await publishSurvey(survey.id!);
      setSurveys(surveys.map((s) => (s.id === survey.id ? updated : s)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleClose = async (survey: Survey) => {
    try {
      const updated = await closeSurvey(survey.id!);
      setSurveys(surveys.map((s) => (s.id === survey.id ? updated : s)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCopyLink = (survey: Survey) => {
    const url = `${window.location.origin}/survey/${survey.share_id}`;
    navigator.clipboard.writeText(url);
    alert('설문 링크가 복사되었습니다.');
  };

  // PDF 핸들러들
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

  const handlePdfUpload = async () => {
    if (!pdfFile) return;
    setPdfUploading(true);
    try {
      const result = await importSurveyFromPDF(pdfFile);
      setPdfResult(result);
      if (result.success && result.survey_id) {
        setTimeout(() => {
          router.push(`/admin/surveys/${result.survey_id}/edit`);
        }, 1500);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPdfUploading(false);
    }
  };

  const handlePdfDialogClose = () => {
    setPdfDialogOpen(false);
    setPdfFile(null);
    setPdfResult(null);
  };

  // 통계
  const stats = {
    total: surveys.length,
    active: surveys.filter((s) => s.status === 'published').length,
    draft: surveys.filter((s) => s.status === 'draft').length,
    closed: surveys.filter((s) => s.status === 'closed').length,
    totalResponses: surveys.reduce((acc, s) => acc + (s.response_count || 0), 0),
  };

  // 필터링
  const filteredSurveys = surveys
    .filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery && !s.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const recentSurveys = [...surveys]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 5);

  return (
    <>
      <Head>
        <title>설문 관리 대시보드 | SurveyMachine</title>
      </Head>

      <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        {/* 헤더 */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            color: 'white',
            pt: 5,
            pb: 8,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.5,
            },
          }}
        >
          <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    <AutoGraph sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                      SurveyMachine
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      설문 관리 대시보드
                    </Typography>
                  </Box>
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
                    borderWidth: 1.5,
                    borderRadius: 2.5,
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1.5,
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
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
                    },
                  }}
                >
                  새 설문 만들기
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        {/* 통계 카드 영역 (헤더와 겹침) */}
        <Container maxWidth="xl" sx={{ mt: -5, position: 'relative', zIndex: 2 }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="전체 설문"
                value={stats.total}
                icon={<FolderOpen sx={{ fontSize: 28, color: 'white' }} />}
                gradient="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="진행 중"
                value={stats.active}
                subtitle={`초안 ${stats.draft}개`}
                icon={<PlayArrow sx={{ fontSize: 28, color: 'white' }} />}
                gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="총 응답"
                value={stats.totalResponses}
                icon={<People sx={{ fontSize: 28, color: 'white' }} />}
                gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="마감"
                value={stats.closed}
                icon={<CheckCircle sx={{ fontSize: 28, color: 'white' }} />}
                gradient="linear-gradient(135deg, #6B7280 0%, #4B5563 100%)"
                iconBg="rgba(255,255,255,0.2)"
              />
            </Grid>
          </Grid>

          {/* 메인 콘텐츠 */}
          <Grid container spacing={4}>
            {/* 설문 목록 */}
            <Grid item xs={12} lg={8}>
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700} color="grey.800">
                      설문 목록
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="검색..."
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
                          width: 220,
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

                  <Tabs
                    value={statusFilter}
                    onChange={(_, v) => setStatusFilter(v)}
                    sx={{
                      minHeight: 40,
                      '& .MuiTab-root': {
                        minHeight: 40,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        px: 2,
                      },
                      '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                      },
                    }}
                  >
                    <Tab label={`전체 (${stats.total})`} value="all" />
                    <Tab label={`진행 중 (${stats.active})`} value="published" />
                    <Tab label={`초안 (${stats.draft})`} value="draft" />
                    <Tab label={`마감 (${stats.closed})`} value="closed" />
                  </Tabs>
                </Box>

                <Box sx={{ p: 3 }}>
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
                    <Grid container spacing={3}>
                      {filteredSurveys.map((survey) => (
                        <Grid item xs={12} sm={6} key={survey.id}>
                          <SurveyCard
                            survey={survey}
                            onEdit={() => router.push(`/admin/surveys/${survey.id}/edit`)}
                            onPreview={() => router.push(`/admin/surveys/${survey.id}/preview`)}
                            onResponses={() => router.push(`/admin/surveys/${survey.id}/responses`)}
                            onPublish={() => handlePublish(survey)}
                            onClose={() => handleClose(survey)}
                            onDelete={() => handleDelete(survey)}
                            onCopyLink={() => handleCopyLink(survey)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* 사이드바 */}
            <Grid item xs={12} lg={4}>
              {/* 빠른 작업 */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  mb: 3,
                }}
              >
                <Typography variant="h6" fontWeight={700} color="grey.800" sx={{ mb: 2.5 }}>
                  빠른 작업
                </Typography>
                <Stack spacing={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Add />}
                    endIcon={<KeyboardArrowRight />}
                    onClick={handleCreate}
                    disabled={creating}
                    sx={{
                      justifyContent: 'space-between',
                      py: 1.5,
                      px: 2.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderWidth: 1.5,
                      borderColor: 'grey.200',
                      color: 'grey.700',
                      '&:hover': {
                        borderWidth: 1.5,
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.50',
                      },
                    }}
                  >
                    새 설문 만들기
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PictureAsPdf />}
                    endIcon={<KeyboardArrowRight />}
                    onClick={() => setPdfDialogOpen(true)}
                    sx={{
                      justifyContent: 'space-between',
                      py: 1.5,
                      px: 2.5,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderWidth: 1.5,
                      borderColor: 'grey.200',
                      color: 'grey.700',
                      '&:hover': {
                        borderWidth: 1.5,
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.50',
                      },
                    }}
                  >
                    PDF에서 가져오기
                  </Button>
                </Stack>
              </Paper>

              {/* 최근 설문 */}
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
                  <Typography variant="h6" fontWeight={700} color="grey.800">
                    최근 업데이트
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  {loading ? (
                    <Stack spacing={1}>
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 2 }} />
                      ))}
                    </Stack>
                  ) : recentSurveys.length === 0 ? (
                    <Typography variant="body2" color="grey.500" sx={{ py: 4, textAlign: 'center' }}>
                      최근 활동이 없습니다
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {recentSurveys.map((survey, index) => {
                        const statusColor = survey.status === 'published' ? '#10B981' : survey.status === 'closed' ? '#6B7280' : '#F59E0B';
                        return (
                          <ListItem
                            key={survey.id}
                            sx={{
                              px: 2,
                              py: 1.5,
                              cursor: 'pointer',
                              borderRadius: 2,
                              mb: index < recentSurveys.length - 1 ? 0.5 : 0,
                              '&:hover': { backgroundColor: 'grey.50' },
                            }}
                            onClick={() => router.push(`/admin/surveys/${survey.id}/edit`)}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: statusColor,
                                mr: 2,
                                flexShrink: 0,
                              }}
                            />
                            <ListItemText
                              primary={survey.title || '제목 없음'}
                              secondary={`${survey.response_count || 0}개 응답`}
                              primaryTypographyProps={{
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: 'grey.800',
                                noWrap: true,
                              }}
                              secondaryTypographyProps={{
                                fontSize: '0.75rem',
                                color: 'grey.500',
                              }}
                            />
                            <ArrowForward sx={{ fontSize: 16, color: 'grey.400' }} />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* PDF 다이얼로그 */}
        <Dialog
          open={pdfDialogOpen}
          onClose={handlePdfDialogClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 4 },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>PDF에서 설문 가져오기</DialogTitle>
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
              onClick={handlePdfDialogClose}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              취소
            </Button>
            {!pdfResult && (
              <Button
                variant="contained"
                onClick={handlePdfUpload}
                disabled={!pdfFile || pdfUploading}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {pdfUploading ? '분석 중...' : '가져오기'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* 푸터 */}
        <Box sx={{ textAlign: 'center', py: 4, mt: 6 }}>
          <Typography variant="body2" color="grey.500">
            © 2025 SurveyMachine. All rights reserved.
          </Typography>
        </Box>

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Box>
    </>
  );
}
