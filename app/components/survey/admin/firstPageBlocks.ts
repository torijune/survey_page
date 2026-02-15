/**
 * 설문지 첫 페이지 블록 형식.
 * - markdown: 기존 마크다운 텍스트
 * - table: 표 블록 (셀 배경색, 볼드, 텍스트 색, 행/열 추가·삭제 지원)
 */

export type TableCellTextAlign = 'left' | 'center' | 'right';
export type TableCellVerticalAlign = 'top' | 'middle' | 'bottom';

export interface TableCell {
  content: string;
  bold?: boolean;
  textColor?: string;
  backgroundColor?: string;
  /** 가로 정렬 */
  textAlign?: TableCellTextAlign;
  /** 세로 정렬 */
  verticalAlign?: TableCellVerticalAlign;
}

export interface TableBlockData {
  rows: TableCell[][];
  /** 열 너비(px). 없으면 균등 분할 */
  columnWidths?: number[];
  /** 행 높이(px). 없으면 자동 */
  rowHeights?: number[];
}

export type FirstPageBlock =
  | { type: 'markdown'; content: string }
  | { type: 'table'; data: TableBlockData };

export interface FirstPageContent {
  blocks: FirstPageBlock[];
}

const BLOCKS_PREFIX = '{"blocks":';

export function parseFirstPageContent(raw: string | null | undefined): FirstPageContent {
  const s = (raw ?? '').trim();
  if (!s) return { blocks: [] };
  if (s.startsWith(BLOCKS_PREFIX) || s.startsWith('{')) {
    try {
      const parsed = JSON.parse(s) as FirstPageContent;
      if (parsed?.blocks && Array.isArray(parsed.blocks)) return parsed;
    } catch {
      /* fallback to legacy */
    }
  }
  return { blocks: [{ type: 'markdown', content: s }] };
}

export function serializeFirstPageContent(content: FirstPageContent): string {
  if (content.blocks.length === 0) return '';
  return JSON.stringify(content);
}

const DEFAULT_COL_WIDTH = 140;
const DEFAULT_ROW_HEIGHT = 44;

export function createEmptyTable(rowsCount = 2, colsCount = 2): TableBlockData {
  return {
    rows: Array.from({ length: rowsCount }, () =>
      Array.from({ length: colsCount }, (): TableCell => ({ content: '' }))
    ),
    columnWidths: Array.from({ length: colsCount }, () => DEFAULT_COL_WIDTH),
    rowHeights: Array.from({ length: rowsCount }, () => DEFAULT_ROW_HEIGHT),
  };
}
