import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Popover,
  Typography,
} from '@mui/material';
import {
  Add,
  Delete,
  FormatBold,
  FormatPaint,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  VerticalAlignTop,
  VerticalAlignCenter,
  VerticalAlignBottom,
  DragIndicator,
} from '@mui/icons-material';
import type { TableBlockData, TableCell as TableCellType } from './firstPageBlocks';

const PRESET_BG_COLORS = ['#FFFFFF', '#F3F4F6', '#E5E7EB', '#DBEAFE', '#FEF3C7', '#D1FAE5'];
const PRESET_TEXT_COLORS = ['#000000', '#374151', '#1F2937', '#3B82F6', '#059669', '#DC2626'];
const CELL_BORDER = '1px solid #D1D5DB';
const DEFAULT_COL_WIDTH = 140;
const DEFAULT_ROW_HEIGHT = 44;
const RESIZE_HANDLE_SIZE = 6;

function CellEditor({
  cell,
  onChange,
  onClose,
  anchorEl,
}: {
  cell: TableCellType;
  onChange: (cell: TableCellType) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { p: 2, minWidth: 260 } }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>셀 서식</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Tooltip title="굵게">
          <IconButton
            size="small"
            onClick={() => onChange({ ...cell, bold: !cell.bold })}
            sx={{ bgcolor: cell.bold ? 'action.selected' : 'transparent' }}
          >
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" sx={{ alignSelf: 'center', mr: 0.5 }}>글자색</Typography>
        {PRESET_TEXT_COLORS.map((c) => (
          <Box
            key={c}
            onClick={() => onChange({ ...cell, textColor: cell.textColor === c ? undefined : c })}
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1,
              bgcolor: c,
              border: cell.textColor === c ? '2px solid #3B82F6' : '1px solid #E5E7EB',
              cursor: 'pointer',
            }}
          />
        ))}
        <Typography variant="caption" sx={{ alignSelf: 'center', width: '100%', mt: 0.5 }}>배경색</Typography>
        {PRESET_BG_COLORS.map((c) => (
          <Box
            key={c}
            onClick={() => onChange({ ...cell, backgroundColor: cell.backgroundColor === c ? undefined : c })}
            sx={{
              width: 24,
              height: 24,
              borderRadius: 1,
              bgcolor: c,
              border: cell.backgroundColor === c ? '2px solid #3B82F6' : '1px solid #E5E7EB',
              cursor: 'pointer',
            }}
          />
        ))}
        <Typography variant="caption" sx={{ alignSelf: 'center', width: '100%', mt: 1 }}>가로 정렬</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="왼쪽">
            <IconButton size="small" onClick={() => onChange({ ...cell, textAlign: 'left' })} sx={{ bgcolor: cell.textAlign === 'left' || !cell.textAlign ? 'action.selected' : 'transparent' }}>
              <FormatAlignLeft fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="가운데">
            <IconButton size="small" onClick={() => onChange({ ...cell, textAlign: 'center' })} sx={{ bgcolor: cell.textAlign === 'center' ? 'action.selected' : 'transparent' }}>
              <FormatAlignCenter fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="오른쪽">
            <IconButton size="small" onClick={() => onChange({ ...cell, textAlign: 'right' })} sx={{ bgcolor: cell.textAlign === 'right' ? 'action.selected' : 'transparent' }}>
              <FormatAlignRight fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" sx={{ alignSelf: 'center', width: '100%', mt: 0.5 }}>세로 정렬</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="상단">
            <IconButton size="small" onClick={() => onChange({ ...cell, verticalAlign: 'top' })} sx={{ bgcolor: cell.verticalAlign === 'top' || !cell.verticalAlign ? 'action.selected' : 'transparent' }}>
              <VerticalAlignTop fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="가운데">
            <IconButton size="small" onClick={() => onChange({ ...cell, verticalAlign: 'middle' })} sx={{ bgcolor: cell.verticalAlign === 'middle' ? 'action.selected' : 'transparent' }}>
              <VerticalAlignCenter fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="하단">
            <IconButton size="small" onClick={() => onChange({ ...cell, verticalAlign: 'bottom' })} sx={{ bgcolor: cell.verticalAlign === 'bottom' ? 'action.selected' : 'transparent' }}>
              <VerticalAlignBottom fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Button size="small" onClick={onClose}>적용</Button>
    </Popover>
  );
}

const ROW_DRAG_TYPE = 'application/x-table-row-index';
const COL_DRAG_TYPE = 'application/x-table-col-index';

export default function TableBlockEditor({ data, onChange }: TableBlockEditorProps) {
  const [formatAnchor, setFormatAnchor] = useState<{ el: HTMLElement; ri: number; ci: number } | null>(null);
  const [resizeCol, setResizeCol] = useState<{ ci: number; startX: number; startW: number } | null>(null);
  const [resizeRow, setResizeRow] = useState<{ ri: number; startY: number; startH: number } | null>(null);
  const [dropRowIndex, setDropRowIndex] = useState<number | null>(null);
  const [dropColIndex, setDropColIndex] = useState<number | null>(null);

  const rows = data.rows.length ? data.rows : [[{ content: '' }]];
  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const rowCount = rows.length;

  const columnWidths = data.columnWidths ?? Array.from({ length: colCount }, () => DEFAULT_COL_WIDTH);
  const rowHeights = data.rowHeights ?? Array.from({ length: rowCount }, () => DEFAULT_ROW_HEIGHT);
  const colW = columnWidths.length >= colCount ? columnWidths : [...columnWidths, ...Array.from({ length: colCount - columnWidths.length }, () => DEFAULT_COL_WIDTH)];
  const rowH = rowHeights.length >= rowCount ? rowHeights : [...rowHeights, ...Array.from({ length: rowCount - rowHeights.length }, () => DEFAULT_ROW_HEIGHT)];

  const dataRef = useRef(data);
  dataRef.current = data;

  const updateData = useCallback(
    (updates: Partial<TableBlockData>) => {
      onChange({ ...data, ...updates });
    },
    [data, onChange]
  );

  const updateCell = (ri: number, ci: number, cell: TableCellType) => {
    const newRows = rows.map((r) => [...r]);
    while (newRows[ri].length <= ci) newRows[ri].push({ content: '' });
    newRows[ri][ci] = cell;
    updateData({ rows: newRows });
  };

  const addRow = () => {
    const newRow = Array.from({ length: colCount }, (): TableCellType => ({ content: '' }));
    updateData({
      rows: [...rows, newRow],
      rowHeights: [...rowH, DEFAULT_ROW_HEIGHT],
    });
  };
  const addCol = () => {
    const newRows = rows.map((r) => [...r, { content: '' }]);
    updateData({
      rows: newRows,
      columnWidths: [...colW, DEFAULT_COL_WIDTH],
    });
  };
  const removeRow = (ri: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== ri);
    const newRowHeights = rowH.filter((_, i) => i !== ri);
    updateData({ rows: newRows, rowHeights: newRowHeights });
  };
  const removeCol = (ci: number) => {
    if (colCount <= 1) return;
    const newRows = rows.map((r) => r.filter((_, j) => j !== ci));
    const newColWidths = colW.filter((_, j) => j !== ci);
    updateData({ rows: newRows, columnWidths: newColWidths });
  };

  const moveRow = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newRows = [...rows];
    const newRowH = [...rowH];
    const [removed] = newRows.splice(fromIndex, 1);
    const [removedH] = newRowH.splice(fromIndex, 1);
    newRows.splice(toIndex, 0, removed);
    newRowH.splice(toIndex, 0, removedH);
    updateData({ rows: newRows, rowHeights: newRowH });
  };

  const moveCol = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newRows = rows.map((r) => {
      const cells = [...(r as TableCellType[])];
      const [removed] = cells.splice(fromIndex, 1);
      cells.splice(toIndex, 0, removed);
      return cells;
    });
    const newColW = [...colW];
    const [removedW] = newColW.splice(fromIndex, 1);
    newColW.splice(toIndex, 0, removedW);
    updateData({ rows: newRows, columnWidths: newColW });
  };

  const handleRowDragOver = (e: React.DragEvent, ri: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (e.dataTransfer.types.includes(ROW_DRAG_TYPE)) setDropRowIndex(ri);
  };
  const handleRowDrop = (e: React.DragEvent, toRow: number) => {
    e.preventDefault();
    setDropRowIndex(null);
    const raw = e.dataTransfer.getData(ROW_DRAG_TYPE);
    if (raw === '') return;
    const fromRow = parseInt(raw, 10);
    if (!Number.isNaN(fromRow)) moveRow(fromRow, toRow);
  };
  const handleColDragOver = (e: React.DragEvent, ci: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (e.dataTransfer.types.includes(COL_DRAG_TYPE)) setDropColIndex(ci);
  };
  const handleColDrop = (e: React.DragEvent, toCol: number) => {
    e.preventDefault();
    setDropColIndex(null);
    const raw = e.dataTransfer.getData(COL_DRAG_TYPE);
    if (raw === '') return;
    const fromCol = parseInt(raw, 10);
    if (!Number.isNaN(fromCol)) moveCol(fromCol, toCol);
  };

  useEffect(() => {
    if (!resizeCol) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeCol.startX;
      const newW = Math.max(40, resizeCol.startW + delta);
      const d = dataRef.current;
      const cw = d.columnWidths ?? Array.from({ length: colCount }, () => DEFAULT_COL_WIDTH);
      const next = cw.length >= colCount ? [...cw] : [...cw, ...Array.from({ length: colCount - cw.length }, () => DEFAULT_COL_WIDTH)];
      next[resizeCol.ci] = newW;
      updateData({ columnWidths: next });
    };
    const onUp = () => setResizeCol(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeCol, colCount, updateData]);

  useEffect(() => {
    if (!resizeRow) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeRow.startY;
      const newH = Math.max(24, resizeRow.startH + delta);
      const d = dataRef.current;
      const rh = d.rowHeights ?? Array.from({ length: rowCount }, () => DEFAULT_ROW_HEIGHT);
      const next = rh.length >= rowCount ? [...rh] : [...rh, ...Array.from({ length: rowCount - rh.length }, () => DEFAULT_ROW_HEIGHT)];
      next[resizeRow.ri] = newH;
      updateData({ rowHeights: next });
    };
    const onUp = () => setResizeRow(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeRow, rowCount, updateData]);

  const editingCell = formatAnchor ? rows[formatAnchor.ri]?.[formatAnchor.ci] : null;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 1, overflow: 'auto' }}>
        <Table
          size="small"
          sx={{
            minWidth: 320,
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            '& td, & th': { border: CELL_BORDER, boxSizing: 'border-box' },
          }}
        >
          <colgroup>
            <col key="row-drag" style={{ width: 16, minWidth: 16 }} />
            {Array.from({ length: colCount }).map((_, ci) => (
              <col key={ci} style={{ width: colW[ci] ?? DEFAULT_COL_WIDTH }} />
            ))}
          </colgroup>
          <TableBody>
            {rows.map((row, ri) => (
              <TableRow
                key={ri}
                sx={{
                  height: rowH[ri] ?? DEFAULT_ROW_HEIGHT,
                  '& > td': { border: CELL_BORDER },
                  backgroundColor: dropRowIndex === ri ? 'action.hover' : undefined,
                }}
                onDragOver={(e) => handleRowDragOver(e, ri)}
                onDrop={(e) => handleRowDrop(e, ri)}
                onDragLeave={() => setDropRowIndex(null)}
                onDragEnd={() => setDropRowIndex(null)}
              >
                <TableCell
                  sx={{
                    width: 16,
                    minWidth: 16,
                    maxWidth: 16,
                    p: 0,
                    border: CELL_BORDER,
                    verticalAlign: 'middle',
                    cursor: 'grab',
                    textAlign: 'center',
                    '&:active': { cursor: 'grabbing' },
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ROW_DRAG_TYPE, String(ri));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDropRowIndex(null)}
                >
                  <DragIndicator sx={{ fontSize: 14, color: 'text.secondary' }} />
                </TableCell>
                {Array.from({ length: colCount }).map((_, ci) => {
                  const cell = row[ci] ?? { content: '' };
                  return (
                    <TableCell
                      key={ci}
                      align={cell.textAlign ?? 'left'}
                      sx={{
                        p: 0.5,
                        pt: ri === 0 ? 3 : 0.5,
                        border: CELL_BORDER,
                        backgroundColor:
                          dropColIndex === ci ? 'action.hover' : (cell.backgroundColor ?? '#FFFFFF'),
                        color: cell.textColor ?? 'inherit',
                        fontWeight: cell.bold ? 700 : 400,
                        verticalAlign: cell.verticalAlign ?? 'top',
                        position: 'relative',
                      }}
                      onDragOver={(e) => handleColDragOver(e, ci)}
                      onDrop={(e) => handleColDrop(e, ci)}
                      onDragLeave={() => setDropColIndex(null)}
                    >
                      {ri === 0 && (
                        <Box
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(COL_DRAG_TYPE, String(ci));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDropColIndex(null)}
                          sx={{
                            position: 'absolute',
                            left: '50%',
                            top: 2,
                            transform: 'translateX(-50%)',
                            cursor: 'grab',
                            zIndex: 1,
                            '&:active': { cursor: 'grabbing' },
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <DragIndicator sx={{ fontSize: 14, color: 'text.secondary' }} />
                        </Box>
                      )}
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        minRows={1}
                        value={cell.content}
                        onChange={(e) => updateCell(ri, ci, { ...cell, content: e.target.value })}
                        placeholder="내용"
                        variant="standard"
                        inputProps={{
                          style: { textAlign: (cell.textAlign ?? 'left') as React.CSSProperties['textAlign'] },
                        }}
                        InputProps={{
                          disableUnderline: true,
                          sx: {
                            fontSize: '0.875rem',
                            py: 0.5,
                            px: 0.75,
                            textAlign: cell.textAlign ?? 'left',
                            fontWeight: cell.bold ? 700 : 400,
                            color: cell.textColor ?? 'inherit',
                          },
                        }}
                        sx={{ '& .MuiInput-root': { width: '100%' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.25, mt: 0.25 }}>
                        <Tooltip title="셀 서식 (굵게, 글자색, 배경색)">
                          <IconButton
                            size="small"
                            sx={{ p: 0.25, minWidth: 0 }}
                            onClick={(e) => setFormatAnchor({ el: e.currentTarget, ri, ci })}
                          >
                            <FormatPaint sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {colCount > 1 && ri === 0 && (
                          <Tooltip title="이 열 삭제">
                            <IconButton size="small" sx={{ p: 0.25, minWidth: 0 }} onClick={() => removeCol(ci)}>
                              <Delete sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      {ci < colCount - 1 && ri === 0 && (
                        <Tooltip title="열 너비 조절 (드래그)">
                          <Box
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setResizeCol({ ci, startX: e.clientX, startW: colW[ci] ?? DEFAULT_COL_WIDTH });
                            }}
                            sx={{
                              position: 'absolute',
                              right: -RESIZE_HANDLE_SIZE / 2,
                              top: 0,
                              bottom: 0,
                              width: RESIZE_HANDLE_SIZE,
                              cursor: 'col-resize',
                              zIndex: 2,
                              '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
                            }}
                          />
                        </Tooltip>
                      )}
                      {ri < rowCount - 1 && ci === 0 && (
                        <Tooltip title="행 높이 조절 (드래그)">
                          <Box
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setResizeRow({ ri, startY: e.clientY, startH: rowH[ri] ?? DEFAULT_ROW_HEIGHT });
                            }}
                            sx={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: -RESIZE_HANDLE_SIZE / 2,
                              height: RESIZE_HANDLE_SIZE,
                              cursor: 'row-resize',
                              zIndex: 2,
                              '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
                            }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell sx={{ width: 40, border: 'none', p: 0.5, verticalAlign: 'middle' }}>
                  {rows.length > 1 && (
                    <Tooltip title="행 삭제">
                      <IconButton size="small" onClick={() => removeRow(ri)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<Add />} onClick={addRow} variant="outlined">
          행 추가
        </Button>
        <Button size="small" startIcon={<Add />} onClick={addCol} variant="outlined">
          열 추가
        </Button>
      </Box>
      {editingCell && formatAnchor && (
        <CellEditor
          cell={editingCell}
          onChange={(c) => updateCell(formatAnchor.ri, formatAnchor.ci, c)}
          onClose={() => setFormatAnchor(null)}
          anchorEl={formatAnchor.el}
        />
      )}
    </Box>
  );
}

interface TableBlockEditorProps {
  data: TableBlockData;
  onChange: (data: TableBlockData) => void;
}
