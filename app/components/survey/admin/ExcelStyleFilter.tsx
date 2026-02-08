import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Divider,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Search,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { IFilterParams, IDoesFilterPassParams, IFilterComp } from 'ag-grid-community';
import { createRoot, Root } from 'react-dom/client';

interface ExcelStyleFilterProps extends IFilterParams {
  values?: () => string[];
}

// AG Grid 필터 클래스
class ExcelStyleFilterClass implements IFilterComp {
  private params: IFilterParams;
  private selectedItems: Set<string> = new Set();
  private allValues: string[] = [];
  private root: Root | null = null;
  private container: HTMLElement | null = null;

  init(params: IFilterParams): void {
    this.params = params;
    
    // 모든 고유 값 수집
    const values = new Set<string>();
    params.api.forEachNode((node) => {
      const value = node.data?.[params.colDef?.field || ''];
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value));
      }
    });
    this.allValues = Array.from(values).sort();
    this.selectedItems = new Set(this.allValues);
  }

  getGui(): HTMLElement {
    const container = document.createElement('div');
    this.container = container;
    this.root = createRoot(container);
    this.root.render(<ExcelStyleFilterUI params={this.params} filterClass={this} />);
    return container;
  }

  isFilterActive(): boolean {
    // 필터가 활성화되어 있는지 확인 (모든 항목이 선택되지 않았고, 아무것도 선택되지 않지 않은 경우)
    return this.selectedItems.size > 0 && this.selectedItems.size < this.allValues.length;
  }

  doesFilterPass(params: IDoesFilterPassParams): boolean {
    if (!this.isFilterActive()) {
      return true;
    }
    const value = String(params.data[this.params.colDef?.field || ''] || '');
    return this.selectedItems.has(value);
  }

  getModel(): any {
    if (this.selectedItems.size === 0 || this.selectedItems.size === this.allValues.length) {
      return null;
    }
    return {
      filterType: 'excel',
      values: Array.from(this.selectedItems),
    };
  }

  setModel(model: any): void {
    if (model && model.values) {
      this.selectedItems = new Set(model.values);
      this.updateUI();
    } else {
      this.selectedItems = new Set(this.allValues);
      this.updateUI();
    }
  }

  setSelectedItems(items: Set<string>): void {
    this.selectedItems = items;
    this.params.filterChangedCallback();
  }

  getAllValues(): string[] {
    return this.allValues;
  }

  getSelectedItems(): Set<string> {
    return this.selectedItems;
  }

  private updateUI(): void {
    if (this.root && this.container) {
      this.root.render(<ExcelStyleFilterUI params={this.params} filterClass={this} />);
    }
  }

  destroy(): void {
    if (this.root) {
      this.root.unmount();
    }
  }
}

// 필터 UI 컴포넌트
function ExcelStyleFilterUI({ params, filterClass }: { params: IFilterParams; filterClass: ExcelStyleFilterClass }) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [searchText, setSearchText] = useState('');
  const [autoApply, setAutoApply] = useState(true);

  const allValues = filterClass.getAllValues();
  const selectedItems = filterClass.getSelectedItems();

  // 검색 필터링된 값
  const filteredValues = useMemo(() => {
    if (!searchText) return allValues;
    const lowerSearch = searchText.toLowerCase();
    return allValues.filter((val) => val.toLowerCase().includes(lowerSearch));
  }, [allValues, searchText]);


  // 모두 선택/해제
  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? new Set(filteredValues) : new Set();
    filterClass.setSelectedItems(newSelected);
    if (!autoApply) {
      filterClass.params.filterChangedCallback();
    }
  };

  // 개별 항목 선택/해제
  const handleItemToggle = (value: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(value);
    } else {
      newSelected.delete(value);
    }
    filterClass.setSelectedItems(newSelected);
    if (!autoApply) {
      filterClass.params.filterChangedCallback();
    }
  };

  // 필터 적용
  const applyFilter = () => {
    filterClass.params.filterChangedCallback();
  };

  // 필터 해제
  const clearFilter = () => {
    filterClass.setSelectedItems(new Set(allValues));
    setSearchText('');
    setSortOrder(null);
    filterClass.params.api.destroyFilter(filterClass.params.colDef?.field || '');
  };

  const allFilteredSelected = filteredValues.length > 0 && filteredValues.every((val) => selectedItems.has(val));
  const someFilteredSelected = filteredValues.some((val) => selectedItems.has(val));

  return (
    <Paper
      elevation={8}
      sx={{
        width: 300,
        maxHeight: 500,
        overflow: 'auto',
        p: 2,
        backgroundColor: '#2d2d2d',
        color: 'white',
      }}
    >
      {/* 정렬 섹션 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
          정렬
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button
            variant={sortOrder === 'asc' ? 'contained' : 'outlined'}
            onClick={() => {
              const newOrder = sortOrder === 'asc' ? null : 'asc';
              setSortOrder(newOrder);
              // 정렬 적용은 AG Grid API 사용
              if (newOrder) {
                filterClass.params.api.applyColumnState({
                  state: [{ colId: filterClass.params.colDef?.field || '', sort: newOrder }],
                  defaultState: { sort: null },
                });
              }
            }}
            sx={{
              flex: 1,
              backgroundColor: sortOrder === 'asc' ? '#4caf50' : 'transparent',
              color: sortOrder === 'asc' ? 'white' : '#888',
              borderColor: sortOrder === 'asc' ? '#4caf50' : '#555',
              '&:hover': {
                backgroundColor: sortOrder === 'asc' ? '#45a049' : '#444',
                borderColor: sortOrder === 'asc' ? '#45a049' : '#666',
              },
            }}
          >
            <ArrowUpward sx={{ fontSize: 16, mr: 0.5 }} />
            오름차순
          </Button>
            <Button
            variant={sortOrder === 'desc' ? 'contained' : 'outlined'}
            onClick={() => {
              const newOrder = sortOrder === 'desc' ? null : 'desc';
              setSortOrder(newOrder);
              if (newOrder) {
                filterClass.params.api.applyColumnState({
                  state: [{ colId: filterClass.params.colDef?.field || '', sort: newOrder }],
                  defaultState: { sort: null },
                });
              }
            }}
            sx={{
              flex: 1,
              backgroundColor: sortOrder === 'desc' ? '#4caf50' : 'transparent',
              color: sortOrder === 'desc' ? 'white' : '#888',
              borderColor: sortOrder === 'desc' ? '#4caf50' : '#555',
              '&:hover': {
                backgroundColor: sortOrder === 'desc' ? '#45a049' : '#444',
                borderColor: sortOrder === 'desc' ? '#45a049' : '#666',
              },
            }}
          >
            <ArrowDownward sx={{ fontSize: 16, mr: 0.5 }} />
            내림차순
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#aaa' }}>
            색상 기준:
          </Typography>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value="none"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#555',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#666',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value="none">없음</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#555', my: 2 }} />

      {/* 필터 섹션 */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
          필터
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#aaa' }}>
            색상 기준:
          </Typography>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value="none"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#555',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#666',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value="none">없음</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#aaa' }}>
            항목 선택
          </Typography>
        </Box>
        
        {/* 검색 바 */}
        <TextField
          fullWidth
          size="small"
          placeholder="검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#4caf50', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 1.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#1e1e1e',
              borderColor: '#4caf50',
              '& fieldset': {
                borderColor: '#4caf50',
              },
              '&:hover fieldset': {
                borderColor: '#4caf50',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#4caf50',
              },
            },
            '& .MuiInputBase-input': {
              color: 'white',
            },
          }}
        />

        {/* 체크박스 리스트 */}
        <Box
          sx={{
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #555',
            borderRadius: 1,
            p: 1,
            backgroundColor: '#1e1e1e',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: 0.5,
              borderBottom: '1px solid #333',
              mb: 0.5,
            }}
          >
            <Checkbox
              checked={allFilteredSelected}
              indeterminate={someFilteredSelected && !allFilteredSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              sx={{
                color: '#4caf50',
                '&.Mui-checked': {
                  color: '#4caf50',
                },
                '&.MuiCheckbox-indeterminate': {
                  color: '#4caf50',
                },
              }}
            />
            <Typography variant="body2" sx={{ color: 'white' }}>
              (모두 선택)
            </Typography>
          </Box>
          {filteredValues.map((value) => (
            <Box
              key={value}
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 0.5,
              }}
            >
              <Checkbox
                checked={selectedItems.has(value)}
                onChange={(e) => handleItemToggle(value, e.target.checked)}
                sx={{
                  color: '#4caf50',
                  '&.Mui-checked': {
                    color: '#4caf50',
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: 'white', flex: 1 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#555', my: 2 }} />

      {/* 하단 버튼 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={autoApply}
            onChange={(e) => setAutoApply(e.target.checked)}
            sx={{
              color: '#4caf50',
              '&.Mui-checked': {
                color: '#4caf50',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: '#aaa' }}>
            자동 적용
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => applyFilter()}
            disabled={autoApply}
            sx={{
              backgroundColor: '#555',
              color: 'white',
              '&:hover': {
                backgroundColor: '#666',
              },
              '&:disabled': {
                backgroundColor: '#333',
                color: '#666',
              },
            }}
          >
            필터 적용
          </Button>
          <Button
            size="small"
            onClick={clearFilter}
            sx={{
              backgroundColor: '#555',
              color: 'white',
              '&:hover': {
                backgroundColor: '#666',
              },
            }}
          >
            필터 해제
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

// AG Grid 필터로 사용하기 위한 export
export default ExcelStyleFilterClass;
