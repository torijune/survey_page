import React, { useState, useRef } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Radio,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  Delete,
  Image as ImageIcon,
  Edit,
  Close,
} from '@mui/icons-material';
import { LikertConfig, LikertRowItem } from '../../../api/surveys';
import { uploadImage } from '../../../api/surveys';
import RichTextEditor, { RichTextDisplay } from './RichTextEditor';

interface EditableLikertProps {
  config: LikertConfig;
  onChange: (config: LikertConfig) => void;
}

export default function EditableLikert({ config, onChange }: EditableLikertProps) {
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [labelValue, setLabelValue] = useState('');
  const [rowValue, setRowValue] = useState('');
  const [uploadingRow, setUploadingRow] = useState<number | null>(null);
  const [dragOverRow, setDragOverRow] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRowForImage, setSelectedRowForImage] = useState<number | null>(null);

  const { scale_min, scale_max, labels, rows } = config;
  const scaleRange = Array.from(
    { length: scale_max - scale_min + 1 },
    (_, i) => scale_min + i
  );

  // rows를 LikertRowItem 배열로 정규화
  const normalizedRows: LikertRowItem[] = rows.map((row) => {
    if (typeof row === 'string') {
      return { text: row };
    }
    return row;
  });

  // 레이블 편집 시작
  const handleLabelClick = (index: number) => {
    setEditingLabel(index);
    setLabelValue(labels[index] || '');
  };

  // 레이블 저장
  const handleLabelSave = (value: string) => {
    if (editingLabel === null) return;
    const newLabels = [...labels];
    newLabels[editingLabel] = value;
    onChange({ ...config, labels: newLabels });
  };

  const handleLabelClose = () => {
    setEditingLabel(null);
  };

  // Row 텍스트 편집 시작
  const handleRowClick = (index: number) => {
    setEditingRow(index);
    setRowValue(normalizedRows[index].text);
  };

  // Row 텍스트 저장
  const handleRowSave = (value: string) => {
    if (editingRow === null) return;
    const newRows = [...normalizedRows];
    newRows[editingRow] = { ...newRows[editingRow], text: value };
    onChange({ ...config, rows: newRows });
  };

  const handleRowClose = () => {
    setEditingRow(null);
  };

  // Row 추가
  const handleAddRow = () => {
    const newRows = [...normalizedRows, { text: '새 항목' }];
    onChange({ ...config, rows: newRows });
  };

  // Row 삭제
  const handleDeleteRow = (index: number) => {
    const newRows = normalizedRows.filter((_, i) => i !== index);
    onChange({ ...config, rows: newRows });
  };

  // 이미지 업로드 처리
  const handleImageUpload = async (file: File, rowIndex: number) => {
    setUploadingRow(rowIndex);
    try {
      const imageUrl = await uploadImage(file);
      const newRows = [...normalizedRows];
      newRows[rowIndex] = { ...newRows[rowIndex], image_url: imageUrl };
      onChange({ ...config, rows: newRows });
    } catch (e: any) {
      console.error('이미지 업로드 실패:', e);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingRow(null);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedRowForImage !== null) {
      handleImageUpload(file, selectedRowForImage);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedRowForImage(null);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent, rowIndex: number) => {
    e.preventDefault();
    setDragOverRow(rowIndex);
  };

  const handleDragLeave = () => {
    setDragOverRow(null);
  };

  const handleDrop = (e: React.DragEvent, rowIndex: number) => {
    e.preventDefault();
    setDragOverRow(null);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) =>
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
    );
    if (imageFile) {
      handleImageUpload(imageFile, rowIndex);
    }
  };

  // 이미지 삭제
  const handleDeleteImage = (rowIndex: number) => {
    const newRows = [...normalizedRows];
    newRows[rowIndex] = { ...newRows[rowIndex], image_url: undefined };
    onChange({ ...config, rows: newRows });
  };

  return (
    <Box>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid #E5E7EB',
          borderRadius: 2,
          overflow: 'auto',
          backgroundColor: 'white',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 600, minWidth: 250, borderBottom: '1px solid #E5E7EB' }}>
                평가 항목
              </TableCell>
              {scaleRange.map((scale, idx) => (
                <TableCell
                  key={scale}
                  align="center"
                  sx={{
                    fontWeight: 500,
                    minWidth: 100,
                    borderBottom: '1px solid #E5E7EB',
                    py: 2,
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: '#EFF6FF',
                    },
                    '&:hover .edit-icon': {
                      opacity: 1,
                    },
                  }}
                  onClick={() => handleLabelClick(idx)}
                >
                  <IconButton
                    size="small"
                    className="edit-icon"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      backgroundColor: 'white',
                      boxShadow: 1,
                      width: 24,
                      height: 24,
                    }}
                  >
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {scale}
                  </Typography>
                  <Box
                    sx={{
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                      color: 'text.secondary',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <RichTextDisplay html={labels[idx] || '클릭하여 입력'} />
                  </Box>
                </TableCell>
              ))}
              <TableCell sx={{ width: 80, borderBottom: '1px solid #E5E7EB' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {normalizedRows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                onDragOver={(e) => handleDragOver(e, rowIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rowIndex)}
                sx={{
                  '&:hover': { backgroundColor: '#F9FAFB' },
                  backgroundColor: dragOverRow === rowIndex ? '#EFF6FF' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <TableCell
                  sx={{
                    borderBottom: '1px solid #E5E7EB',
                    position: 'relative',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      {/* Row 텍스트 */}
                      <Box
                        onClick={() => handleRowClick(rowIndex)}
                        sx={{
                          cursor: 'pointer',
                          p: 1,
                          borderRadius: 1,
                          minHeight: 32,
                          display: 'flex',
                          alignItems: 'center',
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          },
                        }}
                      >
                        <RichTextDisplay
                          html={row.text}
                          style={{ fontWeight: 500, color: '#374151', whiteSpace: 'pre-wrap' }}
                        />
                      </Box>

                      {/* 이미지 표시 */}
                      {row.image_url && (
                        <Box sx={{ mt: 1, position: 'relative', display: 'inline-block' }}>
                          <img
                            src={row.image_url}
                            alt="첨부 이미지"
                            style={{
                              maxWidth: 200,
                              maxHeight: 150,
                              borderRadius: 8,
                              border: '1px solid #E5E7EB',
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteImage(rowIndex)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: '#EF4444',
                              color: 'white',
                              '&:hover': { backgroundColor: '#DC2626' },
                              width: 24,
                              height: 24,
                            }}
                          >
                            <Close sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      )}

                      {/* 업로딩 표시 */}
                      {uploadingRow === rowIndex && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} />
                          <Typography variant="caption" color="text.secondary">
                            이미지 업로드 중...
                          </Typography>
                        </Box>
                      )}

                      {/* 드래그 앤 드롭 안내 */}
                      {dragOverRow === rowIndex && (
                        <Box
                          sx={{
                            mt: 1,
                            p: 2,
                            border: '2px dashed #3B82F6',
                            borderRadius: 2,
                            backgroundColor: '#EFF6FF',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" color="primary">
                            이미지를 여기에 놓으세요
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* 버튼들 */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title="텍스트 편집">
                        <IconButton
                          size="small"
                          onClick={() => handleRowClick(rowIndex)}
                          sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="이미지 첨부">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedRowForImage(rowIndex);
                            fileInputRef.current?.click();
                          }}
                          sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                        >
                          <ImageIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </TableCell>

                {scaleRange.map((scale) => (
                  <TableCell
                    key={scale}
                    align="center"
                    padding="checkbox"
                    sx={{ borderBottom: '1px solid #E5E7EB' }}
                  >
                    <Radio
                      disabled
                      size="small"
                      sx={{
                        color: '#D1D5DB',
                      }}
                    />
                  </TableCell>
                ))}

                <TableCell sx={{ borderBottom: '1px solid #E5E7EB' }}>
                  <Tooltip title="삭제">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRow(rowIndex)}
                      sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: '#EF4444' } }}
                    >
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Row 추가 버튼 */}
      <Button
        startIcon={<Add />}
        onClick={handleAddRow}
        size="small"
        sx={{ mt: 1 }}
      >
        평가 항목 추가
      </Button>

      {/* 파일 input (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* 레이블 편집 다이얼로그 */}
      <Dialog
        open={editingLabel !== null}
        onClose={handleLabelClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          척도 레이블 편집
          <Typography variant="caption" display="block" color="text.secondary">
            굵게, 기울임, 밑줄, 색상을 적용하고 줄바꿈(Enter)을 사용할 수 있습니다.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <RichTextEditor
              value={labelValue}
              onChange={setLabelValue}
              placeholder="척도 레이블을 입력하세요"
              minHeight={60}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLabelClose}>취소</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleLabelSave(labelValue);
              handleLabelClose();
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* Row 텍스트 편집 다이얼로그 */}
      <Dialog
        open={editingRow !== null}
        onClose={handleRowClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          평가 항목 편집
          <Typography variant="caption" display="block" color="text.secondary">
            굵게, 기울임, 밑줄, 색상을 적용하고 줄바꿈(Enter)을 사용할 수 있습니다.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <RichTextEditor
              value={rowValue}
              onChange={setRowValue}
              placeholder="평가 항목 텍스트를 입력하세요"
              minHeight={80}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRowClose}>취소</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleRowSave(rowValue);
              handleRowClose();
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
