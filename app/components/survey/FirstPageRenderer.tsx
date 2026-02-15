import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableRow, TableContainer } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkPreserveNewlines } from '../../lib/remarkPreserveNewlines';
import { parseFirstPageContent, type FirstPageBlock } from './admin/firstPageBlocks';

const markdownPlugins = [remarkGfm, remarkBreaks, remarkPreserveNewlines()];

interface FirstPageRendererProps {
  content: string | null | undefined;
  /** 글씨 크기 (body1 등) */
  fontSizeBody?: string;
  fontSizeH1?: string;
  fontSizeH2?: string;
  fontSizeH3?: string;
  /** 콘텐츠 이미지 배율 */
  imageSizeMultiplier?: number;
  /** 마크다운 img 커스텀 렌더 */
  renderMarkdownImage?: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.ReactNode;
}

export default function FirstPageRenderer({
  content,
  fontSizeBody = '1rem',
  fontSizeH1,
  fontSizeH2,
  fontSizeH3,
  imageSizeMultiplier = 1,
  renderMarkdownImage,
}: FirstPageRendererProps) {
  const parsed = parseFirstPageContent(content);

  const defaultImgRender = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      <Paper elevation={0} sx={{ display: 'inline-block', p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid #E5E7EB', maxWidth: `${100 * imageSizeMultiplier}%` }}>
        <Box component="img" {...props} sx={{ maxWidth: '100%', width: 'auto', height: 'auto', borderRadius: 1, display: 'block' }} />
      </Paper>
    </Box>
  );

  const imgComponent = renderMarkdownImage
    ? { img: ({ node, ...props }: any) => renderMarkdownImage(props) }
    : { img: ({ node, ...props }: any) => defaultImgRender(props) };

  const markdownSx = {
    '& p': { mb: 2, lineHeight: 1.8, fontSize: fontSizeBody, color: '#374151' },
    '& ul, & ol': { pl: 3, mb: 2 },
    '& li': { mb: 1, lineHeight: 1.8, color: '#374151', fontSize: fontSizeBody },
    '& h1': { fontSize: fontSizeH1 ?? '2rem', fontWeight: 700, mb: 2, mt: 3 },
    '& h2': { fontSize: fontSizeH2 ?? '1.5rem', fontWeight: 600, mb: 1.5, mt: 2.5 },
    '& h3': { fontSize: fontSizeH3 ?? '1.25rem', fontWeight: 600, mb: 1, mt: 2 },
  };

  return (
    <Box sx={{ '& > *': { mb: 3 }, '& > *:last-child': { mb: 0 } }}>
      {parsed.blocks.map((block: FirstPageBlock, index: number) => {
        if (block.type === 'markdown') {
          const text = (block.content ?? '').trim();
          if (!text) return <Box key={index} />;
          return (
            <Box key={index} sx={markdownSx}>
              <ReactMarkdown remarkPlugins={markdownPlugins} components={imgComponent}>
                {block.content}
              </ReactMarkdown>
            </Box>
          );
        }
        if (block.type === 'table' && block.data?.rows?.length) {
          const tableData = block.data;
          const colCount = Math.max(...tableData.rows.map((r) => r.length), 1);
          const DEFAULT_COL = 140;
          const DEFAULT_ROW = 44;
          const colWidths = tableData.columnWidths ?? Array.from({ length: colCount }, () => DEFAULT_COL);
          const rowHeights = tableData.rowHeights ?? Array.from({ length: tableData.rows.length }, () => DEFAULT_ROW);
          const CELL_BORDER = '1px solid #D1D5DB';
          return (
            <TableContainer key={index} component={Paper} variant="outlined" sx={{ overflow: 'auto' }}>
              <Table
                size="small"
                sx={{
                  minWidth: 280,
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  '& td, & th': { border: CELL_BORDER, boxSizing: 'border-box' },
                }}
              >
                <colgroup>
                  {Array.from({ length: colCount }).map((_, ci) => (
                    <col key={ci} style={{ width: colWidths[ci] ?? DEFAULT_COL }} />
                  ))}
                </colgroup>
                <TableBody>
                  {tableData.rows.map((row, ri) => (
                    <TableRow
                      key={ri}
                      sx={{
                        height: rowHeights[ri] ?? DEFAULT_ROW,
                        '& > td': { border: CELL_BORDER },
                      }}
                    >
                      {row.map((cell, ci) => (
                        <TableCell
                          key={ci}
                          align={cell.textAlign ?? 'left'}
                          sx={{
                            border: CELL_BORDER,
                            backgroundColor: cell.backgroundColor ?? '#FFFFFF',
                            color: cell.textColor ?? 'inherit',
                            fontWeight: cell.bold ? 700 : 400,
                            fontSize: fontSizeBody,
                            py: 1.5,
                            px: 2,
                            verticalAlign: cell.verticalAlign ?? 'top',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {cell.content || '\u00A0'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }
        return null;
      })}
    </Box>
  );
}
