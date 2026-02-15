import React, { useCallback } from 'react';
import { Box, Button, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import { Add, Delete, TableChart, TextFields, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import MarkdownEditor from './MarkdownEditor';
import TableBlockEditor from './TableBlockEditor';
import {
  parseFirstPageContent,
  serializeFirstPageContent,
  createEmptyTable,
  type FirstPageContent,
  type FirstPageBlock,
} from './firstPageBlocks';

interface FirstPageEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 표 블록 기본 행/열 수 */
  defaultTableRows?: number;
  defaultTableCols?: number;
}

export default function FirstPageEditor({
  value,
  onChange,
  placeholder = '설문 시작 시 표시할 내용을 입력하세요.',
  defaultTableRows = 2,
  defaultTableCols = 2,
}: FirstPageEditorProps) {
  const content = parseFirstPageContent(value);

  const updateBlocks = useCallback(
    (blocks: FirstPageBlock[]) => {
      onChange(serializeFirstPageContent({ blocks }));
    },
    [onChange]
  );

  const addMarkdownBlock = () => {
    updateBlocks([...content.blocks, { type: 'markdown', content: '' }]);
  };

  const addTableBlock = () => {
    updateBlocks([
      ...content.blocks,
      { type: 'table', data: createEmptyTable(defaultTableRows, defaultTableCols) },
    ]);
  };

  const updateBlock = (index: number, block: FirstPageBlock) => {
    const next = [...content.blocks];
    next[index] = block;
    updateBlocks(next);
  };

  const removeBlock = (index: number) => {
    const next = content.blocks.filter((_, i) => i !== index);
    updateBlocks(next);
  };

  const moveBlock = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= content.blocks.length) return;
    const next = [...content.blocks];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    updateBlocks(next);
  };

  if (content.blocks.length === 0) {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          블록을 추가하여 첫 페이지를 구성하세요. 텍스트(마크다운·이미지) 또는 표를 넣을 수 있습니다.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button startIcon={<TextFields />} onClick={addMarkdownBlock} variant="outlined" size="small">
            텍스트 블록 추가
          </Button>
          <Button startIcon={<TableChart />} onClick={addTableBlock} variant="outlined" size="small">
            표 추가
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {content.blocks.map((block, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={{
            p: 2,
            border: '1px solid #E5E7EB',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {block.type === 'markdown' ? '텍스트 (마크다운)' : '표'} · 순서 {index + 1}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="위로 이동">
                <span>
                  <IconButton size="small" onClick={() => moveBlock(index, 'up')} disabled={index === 0}>
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="아래로 이동">
                <span>
                  <IconButton size="small" onClick={() => moveBlock(index, 'down')} disabled={index === content.blocks.length - 1}>
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="삭제">
                <IconButton size="small" onClick={() => removeBlock(index)} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          {block.type === 'markdown' ? (
            <MarkdownEditor
              value={block.content}
              onChange={(c) => updateBlock(index, { type: 'markdown', content: c })}
              label=""
              placeholder={placeholder}
              rows={6}
              showLivePreview={true}
            />
          ) : (
            <TableBlockEditor
              data={block.data}
              onChange={(data) => updateBlock(index, { type: 'table', data })}
            />
          )}
        </Paper>
      ))}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button startIcon={<TextFields />} onClick={addMarkdownBlock} variant="outlined" size="small">
          텍스트 블록 추가
        </Button>
        <Button startIcon={<TableChart />} onClick={addTableBlock} variant="outlined" size="small">
          표 추가
        </Button>
      </Box>
    </Box>
  );
}
