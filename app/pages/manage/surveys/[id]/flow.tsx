// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Divider,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Delete,
  Settings,
  AccountTree,
  DragIndicator,
  Undo,
  Redo,
} from '@mui/icons-material';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
  EdgeTypes,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Survey, Question, ConditionalLogic, getSurvey, updateQuestion, updateSection } from '../../../../api/surveys';
import QuestionEditor from '../../../../components/survey/admin/QuestionEditor';

// window에 커스텀 핸들러 타입 선언
declare global {
  interface Window {
    deleteNodeHandler?: (nodeId: string) => void;
    editBranchHandler?: (nodeId: string) => void;
    deleteEdgeHandler?: (edgeId: string) => void;
  }
}

// 질문 노드 컴포넌트
const QuestionNode = ({ data, selected, id }: { data: any; selected: boolean; id: string }) => {
  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 부모 컴포넌트에서 노드 삭제 처리
    if (window.deleteNodeHandler) {
      window.deleteNodeHandler(id);
    }
  };

  return (
    <Paper
      elevation={selected ? 8 : 2}
      sx={{
        p: 2,
        minWidth: 200,
        borderRadius: 3,
        border: selected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
        backgroundColor: 'white',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {/* 상하좌우 핸들 */}
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Top} id="source-top" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Left} id="source-left" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: '#555', width: 12, height: 12 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DragIndicator sx={{ color: 'grey.400', fontSize: 18 }} />
          <Chip
            size="small"
            label="질문"
            sx={{
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
          {data.question_number && (
            <Chip
              size="small"
              label={data.question_number}
              sx={{
                backgroundColor: '#F3F4F6',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Box>
        {id !== 'start' && id !== 'end' && (
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{
              width: 24,
              height: 24,
              color: 'error.main',
              '&:hover': { backgroundColor: 'error.50' },
            }}
          >
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        {data.question_number && `${data.question_number}. `}
        {data.title || '제목 없음'}
      </Typography>
      {data.type && (
        <Typography variant="caption" color="grey.500">
          {data.type}
        </Typography>
      )}
    </Paper>
  );
};

// 분기 노드 컴포넌트
const BranchNode = ({ data, selected, id }: { data: any; selected: boolean; id: string }) => {
  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.deleteNodeHandler) {
      window.deleteNodeHandler(id);
    }
  };

  const onSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.editBranchHandler) {
      window.editBranchHandler(id);
    }
  };

  return (
    <Paper
      elevation={selected ? 8 : 2}
      sx={{
        p: 2,
        minWidth: 240,
        borderRadius: 3,
        border: selected ? '2px solid #10B981' : '1px solid #E5E7EB',
        backgroundColor: '#F0FDF4',
        cursor: 'move',
        transition: 'all 0.2s',
        position: 'relative',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {/* 상하좌우 핸들 */}
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Top} id="source-top" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Left} id="source-left" style={{ background: '#555', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ background: '#555', width: 12, height: 12 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTree sx={{ color: '#10B981', fontSize: 18 }} />
          <Chip
            size="small"
            label="분기"
            sx={{
              backgroundColor: '#D1FAE5',
              color: '#059669',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={onSettings}
            sx={{
              width: 24,
              height: 24,
              color: 'primary.main',
              '&:hover': { backgroundColor: 'primary.50' },
            }}
          >
            <Settings sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{
              width: 24,
              height: 24,
              color: 'error.main',
              '&:hover': { backgroundColor: 'error.50' },
            }}
          >
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        {data.question_number && `${data.question_number}: `}
        {data.condition || data.questionTitle || '분기 조건'}
      </Typography>
      {data.branches && data.branches.length > 0 && (
        <Box 
          sx={{ 
            mt: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'relative',
            pb: 3, // 핸들을 위한 공간 확보
            gap: 0.5,
          }}
        >
          {data.branches.map((branch: any, idx: number) => {
            const handlePosition = `${((idx + 0.5) * 100) / data.branches.length}%`;
            return (
              <Box
                key={branch.value}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  minWidth: 0, // 텍스트 오버플로우 방지
                }}
              >
                <Chip
                  size="small"
                  label={branch.label}
                  sx={{
                    fontSize: '0.65rem',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    maxWidth: '100%',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    mb: 1,
                  }}
                />
                {/* 각 선택지 아래에 해당하는 핸들 배치 */}
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={branch.value}
                  style={{
                    background: '#10B981',
                    width: 12,
                    height: 12,
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}
      {/* 기본 핸들 (branches가 없는 경우) */}
      {(!data.branches || data.branches.length === 0) && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          style={{ background: '#555', width: 12, height: 12, left: '50%' }}
        />
      )}
    </Paper>
  );
};

// 커스텀 엣지 컴포넌트 (클릭 가능, 재배치 가능)
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  source,
  target,
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });


  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: selected ? '#3B82F6' : '#555',
          strokeWidth: selected ? 3 : 2,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <Box
          sx={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onClick={(e) => {
            e.stopPropagation();
            // 엣지 삭제
            if (window.deleteEdgeHandler) {
              window.deleteEdgeHandler(id);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Paper
            data-edge-delete-button
            elevation={selected ? 4 : 2}
            sx={{
              p: 0.5,
              borderRadius: 1,
              backgroundColor: selected ? '#3B82F6' : 'grey.600',
              color: 'white',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#EF4444',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s',
            }}
            title="클릭하여 연결 삭제"
          >
            <Delete sx={{ fontSize: 14 }} />
          </Paper>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};

// 시작 노드 컴포넌트
const StartNode = () => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 150,
        borderRadius: 3,
        border: '2px solid #10B981',
        backgroundColor: '#ECFDF5',
        textAlign: 'center',
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} color="#059669">
        시작
      </Typography>
      {/* 상하좌우 소스 핸들 */}
      <Handle type="source" position={Position.Top} id="source-top" style={{ background: '#10B981', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Left} id="source-left" style={{ background: '#10B981', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ background: '#10B981', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: '#10B981', width: 12, height: 12 }} />
    </Paper>
  );
};

// 종료 노드 컴포넌트
const EndNode = () => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 150,
        borderRadius: 3,
        border: '2px solid #EF4444',
        backgroundColor: '#FEF2F2',
        textAlign: 'center',
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} color="#DC2626">
        종료
      </Typography>
      {/* 상하좌우 타겟 핸들 */}
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#EF4444', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#EF4444', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#EF4444', width: 12, height: 12 }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#EF4444', width: 12, height: 12 }} />
    </Paper>
  );
};

const nodeTypes: NodeTypes = {
  question: (props: any) => <QuestionNode {...props} />,
  branch: (props: any) => <BranchNode {...props} />,
  start: StartNode,
  end: EndNode,
};

const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  smoothstep: CustomEdge,
  straight: CustomEdge,
  step: CustomEdge,
  bezier: CustomEdge,
};

export default function SurveyFlowPage() {
  const router = useRouter();
  const { id } = router.query;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ node: Node; question: Question } | null>(null);
  const [branchConfig, setBranchConfig] = useState({
    questionId: '',
    optionValue: '',
    branches: [] as Array<{ label: string; value: string; nextQuestionId?: string }>,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Undo/Redo 히스토리 관리
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);
  const maxHistorySize = 50;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 히스토리에 상태 저장
  const saveToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const currentState = {
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
    };

    // 현재 인덱스 이후의 히스토리 제거 (새로운 변경이 있을 때)
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // 히스토리에 추가
    historyRef.current.push(currentState);

    // 최대 크기 제한
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }

    // 버튼 상태 업데이트
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current -= 1;
      const previousState = historyRef.current[historyIndexRef.current];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      
      // 버튼 상태 업데이트
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current += 1;
      const nextState = historyRef.current[historyIndexRef.current];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      
      // 버튼 상태 업데이트
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [setNodes, setEdges]);

  // 선택된 노드와 엣지 삭제
  const handleDeleteSelected = useCallback(() => {
    // 시작/종료 노드는 삭제 불가
    const nodesToDelete = selectedNodes.filter(
      (nodeId) => nodeId !== 'start' && nodeId !== 'end'
    );

    if (nodesToDelete.length > 0) {
      setNodes((nds) => nds.filter((node) => !nodesToDelete.includes(node.id)));
      // 삭제된 노드와 연결된 엣지도 제거
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target)
        )
      );
      setSelectedNodes([]);
    }

    if (selectedEdges.length > 0) {
      setEdges((eds) => eds.filter((edge) => !selectedEdges.includes(edge.id)));
      setSelectedEdges([]);
    }
  }, [selectedNodes, selectedEdges, setNodes, setEdges]);

  // 선택 변경 핸들러
  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(params.nodes.map((node) => node.id));
    setSelectedEdges(params.edges.map((edge) => edge.id));
  }, []);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // 선택된 노드나 엣지가 있을 때만 삭제
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedNodes, selectedEdges]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadSurvey(id);
    }
  }, [id]);

  const loadSurvey = async (surveyId: string) => {
    try {
      const data = await getSurvey(surveyId);
      setSurvey(data);
      
      // 기존 설문 구조를 노드와 엣지로 변환
      const initialNodes: Node[] = [
        {
          id: 'start',
          type: 'start',
          position: { x: 100, y: 300 },
          data: {},
        },
      ];
      
      const initialEdges: Edge[] = [];
      
      // 모든 질문을 평탄화하여 조건문 관계 파악
      const allQuestions: Array<{ question: Question; sectionIndex: number; questionIndex: number }> = [];
      data.sections.forEach((section, sIdx) => {
        section.questions.forEach((question, qIdx) => {
          allQuestions.push({ question, sectionIndex: sIdx, questionIndex: qIdx });
        });
      });
      
      // 조건문이 있는 질문들을 찾아서 맵핑 (조건 질문 ID -> 조건을 만족하는 경우 표시되는 질문들)
      // 각 조건 질문의 conditional_logic을 그대로 보존
      const conditionalQuestionsMap = new Map<string, Question[]>();
      allQuestions.forEach(({ question }) => {
        if (question.conditional_logic && question.conditional_logic.question_id) {
          const conditionQuestionId = question.conditional_logic.question_id;
          if (!conditionalQuestionsMap.has(conditionQuestionId)) {
            conditionalQuestionsMap.set(conditionQuestionId, []);
          }
          conditionalQuestionsMap.get(conditionQuestionId)!.push(question);
        }
      });
      
      // 각 조건 질문 ID별로 선택지 값 -> 조건 질문들 맵핑
      // (조건 질문 ID -> (선택지 값 -> 조건 질문들))
      const questionIdToOptionMap = new Map<string, Map<string, Question[]>>();
      conditionalQuestionsMap.forEach((condQuestions, conditionQuestionId) => {
        const optionMap = new Map<string, Question[]>();
        
        condQuestions.forEach((condQuestion) => {
          const conditionValues = condQuestion.conditional_logic?.value;
          const conditionValueArray = Array.isArray(conditionValues) ? conditionValues : (conditionValues ? [conditionValues] : []);
          
          conditionValueArray.forEach((val: any) => {
            // 값이 문자열이든 숫자든 모두 문자열로 변환하여 비교
            const valueStr = String(val);
            if (!optionMap.has(valueStr)) {
              optionMap.set(valueStr, []);
            }
            optionMap.get(valueStr)!.push(condQuestion);
          });
        });
        
        questionIdToOptionMap.set(conditionQuestionId, optionMap);
      });
      
      // 노드 너비 추정 함수
      const estimateNodeWidth = (nodeType: string, data: any): number => {
        const baseWidths: { [key: string]: number } = {
          'start': 150,
          'end': 150,
          'question': 200,
          'branch': 240,
        };
        const baseWidth = baseWidths[nodeType] || 200;
        
        // 텍스트 길이에 따른 추가 너비 계산
        let textWidth = 0;
        if (nodeType === 'question') {
          const title = data.title || '';
          const questionNumber = data.question_number || '';
          textWidth = Math.max(title.length * 8, questionNumber.length * 8);
        } else if (nodeType === 'branch') {
          const condition = data.condition || data.questionTitle || '';
          textWidth = condition.length * 8;
        }
        
        // 최소 너비와 텍스트 기반 너비 중 큰 값 사용, 최대 너비 제한
        return Math.min(Math.max(baseWidth, textWidth + 40), 400);
      };
      
      // 노드와 엣지 생성 (수평 배치)
      const baseYPos = 300; // 기본 Y 위치 (수평 배치)
      let currentXPos = 100; // 현재 X 위치 (시작점)
      const minSpacing = 150; // 노드 간 최소 간격 (양끝점 기준)
      const questionNodeMap = new Map<string, string>(); // question.id -> node.id
      const processedQuestions = new Set<string>(); // 이미 처리된 질문 ID
      
      // 시작 노드 너비 계산
      const startNodeWidth = estimateNodeWidth('start', {});
      currentXPos += startNodeWidth + minSpacing;
      
      allQuestions.forEach(({ question, sectionIndex, questionIndex }) => {
        // 이미 조건문으로 처리된 질문은 스킵
        if (processedQuestions.has(question.id || '')) {
          return;
        }
        
        const nodeId = `question-${question.id || `${sectionIndex}-${questionIndex}`}`;
        questionNodeMap.set(question.id || '', nodeId);
        
        // 질문 노드 너비 추정
        const questionNodeWidth = estimateNodeWidth('question', question);
        
        // 질문 노드 생성 (수평 배치, 양끝점 기준 간격)
        initialNodes.push({
          id: nodeId,
          type: 'question',
          position: { x: currentXPos, y: baseYPos },
          data: {
            ...question,
            sectionTitle: data.sections[sectionIndex].title,
          },
        });
        
        // 다음 노드를 위해 현재 노드의 오른쪽 끝 + 간격으로 이동
        currentXPos += questionNodeWidth + minSpacing;
        
        // 이 질문을 조건으로 사용하는 질문들이 있는지 확인
        const conditionalQuestions = conditionalQuestionsMap.get(question.id || '');
        
        if (conditionalQuestions && conditionalQuestions.length > 0) {
          // 분기 노드 생성
          const branchNodeId = `branch-${question.id || `${sectionIndex}-${questionIndex}`}`;
          
          // 조건 질문의 모든 선택지를 브랜치로 생성
          const conditionOptions = question.options || [];
          
          // 모든 선택지를 브랜치로 생성
          // 각 선택지가 어떤 조건 질문으로 연결되는지 확인
          // 현재 질문(question.id)을 기준으로 하는 조건 질문들만 확인
          const currentQuestionOptionMap = questionIdToOptionMap.get(question.id || '') || new Map();
          
          const branches = conditionOptions.map((opt: any) => {
            // 선택지의 value를 문자열로 변환하여 비교
            const optValue = String(opt.value);
            // 현재 질문을 기준으로 하는 조건 질문들 중에서 이 선택지 값과 일치하는 것들 찾기
            const connectedConditionalQuestions = currentQuestionOptionMap.get(optValue) || [];
            return {
              label: opt.label,
              value: opt.value,
              connectedConditionalQuestions, // 이 선택지로 연결되는 조건 질문들
            };
          });
          
          // 분기 노드 너비 추정
          const branchNodeWidth = estimateNodeWidth('branch', {
            condition: `${question.question_number || question.title}의 응답`,
            questionTitle: question.title,
            branches,
          });
          
          // 분기 노드 생성 (수평 배치, 양끝점 기준 간격)
          // branches에서 isConditionMet 정보 제거 (표시용)
          const branchesForDisplay = branches.map((b: any) => ({
            label: b.label,
            value: b.value,
          }));
          
          initialNodes.push({
            id: branchNodeId,
            type: 'branch',
            position: { x: currentXPos, y: baseYPos },
            data: {
              questionId: question.id,
              questionTitle: question.title,
              questionNumber: question.question_number,
              condition: `${question.question_number || question.title}의 응답`,
              branches: branchesForDisplay, // isConditionMet 정보 제거된 버전
              conditional_logic: conditionalQuestions[0].conditional_logic,
            },
          });
          
          // 다음 노드를 위해 현재 노드의 오른쪽 끝 + 간격으로 이동
          currentXPos += branchNodeWidth + minSpacing;
          
          // 질문 노드에서 분기 노드로 연결 (수평 연결)
          initialEdges.push({
            id: `${nodeId}-to-${branchNodeId}`,
            source: nodeId,
            target: branchNodeId,
            sourceHandle: 'source-right',
            targetHandle: 'target-left',
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          });
          
          // 다음 일반 질문 찾기 (조건 질문이 아닌 첫 번째 질문, 예: A5)
          let nextQuestionIndex = questionIndex + 1;
          let nextQuestion: Question | null = null;
          
          // 같은 섹션에서 다음 질문 찾기
          while (nextQuestionIndex < data.sections[sectionIndex].questions.length) {
            const candidate = data.sections[sectionIndex].questions[nextQuestionIndex];
            if (!processedQuestions.has(candidate.id || '')) {
              nextQuestion = candidate;
              break;
            }
            nextQuestionIndex++;
          }
          
          // 같은 섹션에 없으면 다음 섹션에서 찾기
          if (!nextQuestion) {
            for (let sIdx = sectionIndex + 1; sIdx < data.sections.length; sIdx++) {
              if (data.sections[sIdx].questions.length > 0) {
                const candidate = data.sections[sIdx].questions[0];
                if (!processedQuestions.has(candidate.id || '')) {
                  nextQuestion = candidate;
                  break;
                }
              }
            }
          }
          
          // 조건 질문 노드들을 먼저 생성하고 맵핑
          const conditionalQuestionNodeMap = new Map<string, string>(); // question.id -> node.id
          conditionalQuestions.forEach((condQuestion, condIdx) => {
            const condNodeId = `question-${condQuestion.id || `cond-${condIdx}`}`;
            questionNodeMap.set(condQuestion.id || '', condNodeId);
            conditionalQuestionNodeMap.set(condQuestion.id || '', condNodeId);
            processedQuestions.add(condQuestion.id || '');
            
            // 조건 질문 노드 너비 추정
            const condNodeWidth = estimateNodeWidth('question', condQuestion);
            
            // 조건 질문 노드는 분기 노드의 X 위치에서 시작 (아래쪽으로 배치)
            initialNodes.push({
              id: condNodeId,
              type: 'question',
              position: { x: currentXPos - branchNodeWidth - minSpacing, y: baseYPos + 250 }, // 아래쪽으로 배치
              data: {
                ...condQuestion,
                sectionTitle: data.sections[sectionIndex].title,
              },
            });
          });
          
          // 각 선택지마다 연결 처리
          branches.forEach((branch: any) => {
            const branchValue = String(branch.value);
            const connectedCondQuestions = branch.connectedConditionalQuestions || [];
            
            if (connectedCondQuestions.length > 0) {
              // 이 선택지가 조건 질문으로 연결되는 경우
              connectedCondQuestions.forEach((condQuestion: Question) => {
                const condNodeId = conditionalQuestionNodeMap.get(condQuestion.id || '');
                if (condNodeId) {
                  initialEdges.push({
                    id: `${branchNodeId}-to-${condNodeId}-${branch.value}`,
                    source: branchNodeId,
                    target: condNodeId,
                    sourceHandle: branch.value,
                    targetHandle: 'target-top',
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed },
                    label: branch.label,
                    style: { stroke: '#10B981', strokeWidth: 2 },
                  });
                }
              });
            } else if (nextQuestion) {
              // 이 선택지가 조건 질문으로 연결되지 않는 경우, 다음 일반 질문으로 연결
              const nextNodeId = `question-${nextQuestion.id || `next-${nextQuestionIndex}`}`;
              
              // 다음 질문 노드가 아직 생성되지 않았다면 생성
              if (!initialNodes.find(n => n.id === nextNodeId)) {
                const nextNodeWidth = estimateNodeWidth('question', nextQuestion);
                initialNodes.push({
                  id: nextNodeId,
                  type: 'question',
                  position: { x: currentXPos, y: baseYPos }, // 수평 배치
                  data: {
                    ...nextQuestion,
                    sectionTitle: data.sections[sectionIndex].title,
                  },
                });
              }
              
              initialEdges.push({
                id: `${branchNodeId}-to-${nextNodeId}-${branch.value}`,
                source: branchNodeId,
                target: nextNodeId,
                sourceHandle: branch.value,
                targetHandle: 'target-left',
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                label: branch.label,
                style: { stroke: '#3B82F6', strokeWidth: 2 },
              });
            }
          });
          
          // 조건 질문들(A4-1)에서 다음 일반 질문(A5)으로 연결
          if (nextQuestion) {
            const nextNodeId = `question-${nextQuestion.id || `next-${nextQuestionIndex}`}`;
            
            conditionalQuestions.forEach((condQuestion) => {
              const condNodeId = conditionalQuestionNodeMap.get(condQuestion.id || '');
              if (condNodeId) {
                initialEdges.push({
                  id: `${condNodeId}-to-${nextNodeId}`,
                  source: condNodeId,
                  target: nextNodeId,
                  sourceHandle: 'source-bottom',
                  targetHandle: 'target-top',
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed },
                });
              }
            });
          }
        }
      });
      
      // 시작 노드에서 첫 번째 질문으로 연결 (수평 연결)
      if (initialNodes.length > 1) {
        const firstQuestionNode = initialNodes.find(n => n.type === 'question' && n.id !== 'start' && n.id !== 'end');
        if (firstQuestionNode) {
          initialEdges.push({
            id: 'start-to-first',
            source: 'start',
            target: firstQuestionNode.id,
            sourceHandle: 'source-right',
            targetHandle: 'target-left',
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        }
      }
      
      // 질문들을 순서대로 연결 (조건문으로 연결되지 않은 경우만, 수평 연결)
      const questionNodes = initialNodes.filter(n => n.type === 'question' && n.id !== 'start' && n.id !== 'end');
      for (let i = 0; i < questionNodes.length - 1; i++) {
        const currentNode = questionNodes[i];
        const nextNode = questionNodes[i + 1];
        
        // 이미 연결된 엣지가 있는지 확인
        const existingEdge = initialEdges.find(
          e => e.source === currentNode.id && e.target === nextNode.id
        );
        
        if (!existingEdge) {
          // 현재 노드가 분기 노드의 타겟이 아닌 경우에만 연결
          const isCurrentTargetOfBranch = initialEdges.some(
            e => e.target === currentNode.id && initialNodes.find(n => n.id === e.source)?.type === 'branch'
          );
          
          // 다음 노드가 분기 노드의 타겟인 경우 연결하지 않음 (분기를 통해서만 연결되어야 함)
          const isNextTargetOfBranch = initialEdges.some(
            e => e.target === nextNode.id && initialNodes.find(n => n.id === e.source)?.type === 'branch'
          );
          
          // 둘 다 분기 노드의 타겟이 아닌 경우에만 연결
          if (!isCurrentTargetOfBranch && !isNextTargetOfBranch) {
            initialEdges.push({
              id: `edge-${currentNode.id}-to-${nextNode.id}`,
              source: currentNode.id,
              target: nextNode.id,
              sourceHandle: 'source-right',
              targetHandle: 'target-left',
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
            });
          }
        }
      }
      
      // 종료 노드 추가 (수평 배치, 양끝점 기준 간격)
      if (initialNodes.length > 1) {
        const endNodeWidth = estimateNodeWidth('end', {});
        initialNodes.push({
          id: 'end',
          type: 'end',
          position: { x: currentXPos, y: baseYPos },
          data: {},
        });
        
        // 마지막 질문 노드나 분기 노드를 찾아서 종료 노드에 연결 (수평 연결)
        const lastQuestionNode = questionNodes[questionNodes.length - 1];
        if (lastQuestionNode) {
          initialEdges.push({
            id: 'last-to-end',
            source: lastQuestionNode.id,
            target: 'end',
            sourceHandle: 'source-right',
            targetHandle: 'target-left',
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        }
        
        // 분기 노드의 조건 불만족 경로도 종료 노드에 연결 (마지막 질문이 조건 질문인 경우)
        const branchNodes = initialNodes.filter(n => n.type === 'branch');
        branchNodes.forEach(branchNode => {
          // 분기 노드에서 조건 불만족 경로가 다음 질문으로 연결되지 않은 경우 종료 노드에 연결
          const hasOtherEdge = initialEdges.some(
            e => e.source === branchNode.id && e.sourceHandle === '__other__' && e.target !== 'end'
          );
          if (!hasOtherEdge) {
            initialEdges.push({
              id: `${branchNode.id}-to-end`,
              source: branchNode.id,
              target: 'end',
              sourceHandle: '__other__',
              targetHandle: 'target-left',
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              label: '조건 불만족',
              style: { stroke: '#EF4444', strokeWidth: 2 },
            });
          }
        });
      }
      
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      // 초기 상태를 히스토리에 저장
      saveToHistory(initialNodes, initialEdges);
      
      // 초기 버튼 상태 설정
      setCanUndo(false);
      setCanRedo(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isInitialLoadRef = useRef<boolean>(true);

  // 노드와 엣지 변경 감지하여 히스토리에 저장
  useEffect(() => {
    // 초기 로드는 제외
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (!isUndoRedoRef.current && nodes.length > 0) {
      // 디바운싱: 연속된 변경을 하나로 묶기
      const timeoutId = setTimeout(() => {
        if (!isUndoRedoRef.current) {
          saveToHistory(nodes, edges);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, saveToHistory]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            // sourceHandle과 targetHandle을 명시적으로 저장하여 클릭한 핸들에서 연결되도록 함
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // 엣지 끝 부분을 드래그하여 재연결
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => {
        // 기존 엣지 제거
        const filtered = eds.filter((e) => e.id !== oldEdge.id);
        // 새로운 연결 추가
        return addEdge(
          {
            ...newConnection,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            id: oldEdge.id,
            data: oldEdge.data,
            // sourceHandle은 기존 것을 유지하고, targetHandle만 업데이트
            sourceHandle: oldEdge.sourceHandle || newConnection.sourceHandle,
            targetHandle: newConnection.targetHandle,
          },
          filtered
        );
      });
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      if (type === 'question') {
        const questionId = event.dataTransfer.getData('questionId');
        const question = survey?.sections
          .flatMap((s) => s.questions)
          .find((q) => q.id === questionId);

        if (question) {
          const newNode: Node = {
            id: `question-${question.id}-${Date.now()}`,
            type: 'question',
            position,
            data: {
              ...question,
            },
          };
          setNodes((nds) => nds.concat(newNode));
        }
      } else if (type === 'branch') {
        const newNode: Node = {
          id: `branch-${Date.now()}`,
          type: 'branch',
          position,
          data: {
            condition: '분기 조건',
            branches: [],
          },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNode(newNode);
        setBranchDialogOpen(true);
      }
    },
    [reactFlowInstance, survey, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'branch') {
      setSelectedNode(node);
      const questionId = node.data.questionId || '';
      const question = survey?.sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === questionId);

      // 기존 엣지 정보를 가져와서 각 branch의 nextQuestionId 설정
      const existingBranches = (node.data.branches || []) as any[];
      const existingEdges = edges.filter((e) => e.source === node.id);
      
      const branchesWithNext = existingBranches.map((branch: any) => {
        const existingEdge = existingEdges.find((e) => e.sourceHandle === branch.value);
        const targetNode = existingEdge 
          ? nodes.find((n) => n.id === existingEdge.target)
          : null;
        
        return {
          ...branch,
          nextQuestionId: targetNode?.data?.id || branch.nextQuestionId || '',
        };
      });

      setBranchConfig({
        questionId,
        optionValue: node.data.optionValue || '',
        branches: branchesWithNext,
      });
      setBranchDialogOpen(true);
    }
  }, [survey, edges, nodes]);
  
  // 분기 노드 더블 클릭 핸들러
  const onBranchNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'branch') {
      setSelectedNode(node);
      const questionId = node.data.questionId || '';
      const question = survey?.sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === questionId);

      // 기존 엣지 정보를 가져와서 각 branch의 nextQuestionId 설정
      const existingBranches = (node.data.branches || []) as any[];
      const existingEdges = edges.filter((e) => e.source === node.id);
      
      const branchesWithNext = existingBranches.map((branch: any) => {
        const existingEdge = existingEdges.find((e) => e.sourceHandle === branch.value);
        const targetNode = existingEdge 
          ? nodes.find((n) => n.id === existingEdge.target)
          : null;
        
        return {
          ...branch,
          nextQuestionId: targetNode?.data?.id || branch.nextQuestionId || '',
        };
      });

      setBranchConfig({
        questionId,
        optionValue: node.data.optionValue || '',
        branches: branchesWithNext,
      });
      setBranchDialogOpen(true);
    }
  }, [survey, edges, nodes]);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'question') {
      // 질문 노드를 더블 클릭하면 편집 사이드바 열기
      const question: Question = {
        id: node.data.id,
        section_id: node.data.section_id,
        type: node.data.type,
        title: node.data.title,
        description: node.data.description,
        required: node.data.required,
        order_index: node.data.order_index || 0,
        is_hidden: node.data.is_hidden || false,
        question_number: node.data.question_number,
        validation_rules: node.data.validation_rules,
        conditional_logic: node.data.conditional_logic,
        likert_config: node.data.likert_config,
        ranking_config: node.data.ranking_config,
        options: node.data.options || [],
      };
      setEditingQuestion({ node, question });
      setLeftSidebarOpen(true);
    } else if (node.type === 'branch') {
      // 분기 노드를 더블 클릭하면 분기 설정 다이얼로그 열기
      setSelectedNode(node);
      const questionId = node.data.questionId || '';
      const question = survey?.sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === questionId);

      // 기존 엣지 정보를 가져와서 각 branch의 nextQuestionId 설정
      const existingBranches = (node.data.branches || []) as any[];
      const existingEdges = edges.filter((e) => e.source === node.id);
      
      const branchesWithNext = existingBranches.map((branch: any) => {
        const existingEdge = existingEdges.find((e) => e.sourceHandle === branch.value);
        const targetNode = existingEdge 
          ? nodes.find((n) => n.id === existingEdge.target)
          : null;
        
        return {
          ...branch,
          nextQuestionId: targetNode?.data?.id || branch.nextQuestionId || '',
        };
      });

      setBranchConfig({
        questionId,
        optionValue: node.data.optionValue || '',
        branches: branchesWithNext,
      });
      setBranchDialogOpen(true);
    }
  }, [survey, edges, nodes]);


  const handleSaveBranch = () => {
    if (!selectedNode || !branchConfig.questionId) {
      alert('기준 질문을 선택해주세요.');
      return;
    }

    const question = survey?.sections
      .flatMap((s) => s.questions)
      .find((q) => q.id === branchConfig.questionId);

    if (!question || !question.options || question.options.length === 0) {
      alert('선택한 질문에 선택지가 없습니다.');
      return;
    }

    // 분기 노드 데이터 업데이트
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              questionId: branchConfig.questionId,
              questionTitle: question.title,
              question_number: question.question_number,
              condition: question.question_number 
                ? `${question.question_number}: ${question.title}` 
                : question.title,
              branches: branchConfig.branches,
            },
          };
        }
        return node;
      })
    );

    // 각 분기 옵션에 대해 엣지 생성/업데이트
    setEdges((eds) => {
      // 기존 분기 노드에서 나가는 엣지 제거
      const filteredEdges = eds.filter((edge) => edge.source !== selectedNode.id);
      
      // 새로운 엣지 추가
      const newEdges: Edge[] = [];
      branchConfig.branches.forEach((branch) => {
        if (branch.nextQuestionId) {
          const targetNode = nodes.find((n) => {
            if (n.type === 'question') {
              return n.data.id === branch.nextQuestionId;
            }
            return false;
          });
          
          if (targetNode) {
            newEdges.push({
              id: `${selectedNode.id}-to-${targetNode.id}-${branch.value}`,
              source: selectedNode.id,
              target: targetNode.id,
              sourceHandle: branch.value,
              targetHandle: 'target-top',
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              label: branch.label,
              style: { stroke: '#10B981', strokeWidth: 2 },
            });
          }
        }
      });
      
      return [...filteredEdges, ...newEdges];
    });

    setBranchDialogOpen(false);
    setSelectedNode(null);
    setBranchConfig({ questionId: '', optionValue: '', branches: [] });
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const handleEditBranch = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node && node.type === 'branch') {
      setSelectedNode(node);
      
      // 기존 엣지 정보를 가져와서 각 branch의 nextQuestionId 설정
      const existingBranches = (node.data.branches || []) as any[];
      const existingEdges = edges.filter((e) => e.source === node.id);
      
      const branchesWithNext = existingBranches.map((branch: any) => {
        const existingEdge = existingEdges.find((e) => e.sourceHandle === branch.value);
        const targetNode = existingEdge 
          ? nodes.find((n) => n.id === existingEdge.target)
          : null;
        
        return {
          ...branch,
          nextQuestionId: targetNode?.data?.id || branch.nextQuestionId || '',
        };
      });
      
      setBranchConfig({
        questionId: node.data.questionId || '',
        optionValue: node.data.optionValue || '',
        branches: branchesWithNext,
      });
      setBranchDialogOpen(true);
    }
  };

  const handleDeleteEdge = (edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  };

  // 질문 편집 핸들러들
  const handleQuestionChange = useCallback((updatedQuestion: Question) => {
    if (!editingQuestion) return;

    // 노드 데이터 업데이트
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingQuestion.node.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedQuestion,
            },
          };
        }
        return node;
      })
    );

    // 편집 중인 질문 상태 업데이트
    setEditingQuestion({
      ...editingQuestion,
      question: updatedQuestion,
    });
  }, [editingQuestion]);

  const handleQuestionSave = useCallback(async () => {
    if (!editingQuestion || !survey) return;

    const question = editingQuestion.question;
    const node = editingQuestion.node;

    // 문항 제목 검증
    if (!question.title || question.title.trim() === '') {
      alert('문항 제목을 입력해주세요.');
      return;
    }

    try {
      // 노드에서 원본 질문 ID 추출
      const questionId = node.data.id;

      if (questionId) {
        // 기존 질문 업데이트
        await updateQuestion(questionId, {
          type: question.type,
          title: question.title,
          description: question.description,
          required: question.required,
          order_index: question.order_index,
          is_hidden: question.is_hidden,
          question_number: question.question_number,
          validation_rules: question.validation_rules,
          conditional_logic: question.conditional_logic,
          likert_config: question.likert_config,
          options: question.options,
        });

        // 노드 데이터 업데이트
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return {
                ...n,
                data: {
                  ...n.data,
                  ...question,
                },
              };
            }
            return n;
          })
        );

        alert('문항이 저장되었습니다.');
      } else {
        // 새 질문 생성 (섹션 ID가 필요한데, 노드에서 추출 불가능하므로 경고)
        alert('새 질문은 먼저 편집 페이지에서 생성해주세요.');
      }
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  }, [editingQuestion, survey, setNodes]);

  const handleQuestionDelete = useCallback(() => {
    if (!editingQuestion) return;

    if (confirm('이 질문을 삭제하시겠습니까?')) {
      const nodeId = editingQuestion.node.id;
      
      // 노드 삭제
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      // 연결된 엣지 삭제
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      
      // DB에서도 삭제 (질문 ID가 있는 경우)
      if (editingQuestion.question.id) {
        // TODO: deleteQuestion API 호출
      }

      // 사이드바 닫기
      setLeftSidebarOpen(false);
      setEditingQuestion(null);
    }
  }, [editingQuestion, setNodes, setEdges]);

  // 전역 핸들러 등록
  useEffect(() => {
    (window as any).deleteNodeHandler = handleDeleteNode;
    (window as any).editBranchHandler = handleEditBranch;
    (window as any).deleteEdgeHandler = handleDeleteEdge;
    return () => {
      delete (window as any).deleteNodeHandler;
      delete (window as any).editBranchHandler;
      delete (window as any).deleteEdgeHandler;
    };
  }, [nodes, edges]);

  const handleSave = async () => {
    if (!survey) return;
    setSaving(true);

    try {
      // ====== 1. 질문 노드들을 x 위치 순으로 정렬하여 순서 결정 ======
      const questionNodes = nodes
        .filter((n) => n.type === 'question' && n.data.id)
        .sort((a, b) => a.position.x - b.position.x);

      // ====== 2. 분기 노드와 엣지에서 conditional_logic 추출 ======
      const branchNodes = nodes.filter((n) => n.type === 'branch');

      // 질문 ID -> 새로운 conditional_logic (null이면 조건 없음)
      const conditionalLogicMap = new Map<string, ConditionalLogic | null>();

      // 기본값: 모든 질문의 conditional_logic 초기화 (분기 노드에서 재계산)
      for (const qNode of questionNodes) {
        if (qNode.data.id) {
          conditionalLogicMap.set(qNode.data.id, null);
        }
      }

      // 분기 노드에서 나가는 엣지를 분석하여 conditional_logic 계산
      for (const branchNode of branchNodes) {
        const conditionQuestionId = branchNode.data.questionId;
        if (!conditionQuestionId) continue;

        const branches = branchNode.data.branches || [];
        const branchEdges = edges.filter((e) => e.source === branchNode.id);

        // targetQuestionId -> [이 질문으로 연결되는 선택지 값들]
        const targetToValues = new Map<string, string[]>();

        for (const branch of branches) {
          // 이 선택지에서 나가는 엣지 찾기
          const edge = branchEdges.find((e) => e.sourceHandle === branch.value);
          if (!edge) continue;

          // 엣지의 타겟 질문 노드 찾기
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!targetNode || targetNode.type !== 'question') continue;

          const targetQuestionId = targetNode.data.id;
          if (!targetQuestionId) continue;

          // 조건 질문 자체를 타겟으로 하는 경우는 무시 (같은 질문으로 돌아가는 경우)
          if (targetQuestionId === conditionQuestionId) continue;

          if (!targetToValues.has(targetQuestionId)) {
            targetToValues.set(targetQuestionId, []);
          }
          targetToValues.get(targetQuestionId)!.push(String(branch.value));
        }

        // 각 타겟 질문에 대해 conditional_logic 설정
        targetToValues.forEach((values, targetQuestionId) => {
          // 조건 질문의 전체 선택지 수 확인
          const condQuestion = questionNodes.find((n) => n.data.id === conditionQuestionId);
          const allOptions = condQuestion?.data?.options || [];

          // 모든 선택지가 이 질문으로 연결되면 조건 불필요 (항상 표시)
          if (allOptions.length > 0 && values.length >= allOptions.length) {
            conditionalLogicMap.set(targetQuestionId, null);
            return;
          }

          conditionalLogicMap.set(targetQuestionId, {
            question_id: conditionQuestionId,
            operator: 'equals',
            value: values.length === 1 ? values[0] : values,
            action: 'show',
          });
        });
      }

      // ====== 3. 섹션별 질문 순서 계산 ======
      // 섹션 ID -> [{id, order}]
      const sectionOrderMap = new Map<string, Array<{ id: string; order: number }>>();

      questionNodes.forEach((qNode) => {
        const sectionId = qNode.data.section_id;
        const questionId = qNode.data.id;
        if (!sectionId || !questionId) return;

        if (!sectionOrderMap.has(sectionId)) {
          sectionOrderMap.set(sectionId, []);
        }
        sectionOrderMap.get(sectionId)!.push({
          id: questionId,
          order: sectionOrderMap.get(sectionId)!.length,
        });
      });

      // ====== 4. 모든 업데이트를 병렬로 실행 ======
      const updatePromises: Promise<any>[] = [];

      for (const qNode of questionNodes) {
        const questionId = qNode.data.id;
        if (!questionId) continue;

        const sectionId = qNode.data.section_id;
        const sectionQuestions = sectionOrderMap.get(sectionId) || [];
        const orderEntry = sectionQuestions.find((sq) => sq.id === questionId);
        const newOrderIndex = orderEntry ? orderEntry.order : qNode.data.order_index || 0;

        // 분기 노드에서 계산된 conditional_logic 적용
        const computedLogic = conditionalLogicMap.get(questionId);
        // 분기 노드에서 재계산되지 않은 질문은 기존 값 유지
        const finalConditionalLogic = conditionalLogicMap.has(questionId)
          ? computedLogic
          : qNode.data.conditional_logic || null;

        updatePromises.push(
          updateQuestion(questionId, {
            type: qNode.data.type,
            title: qNode.data.title,
            description: qNode.data.description,
            required: qNode.data.required,
            order_index: newOrderIndex,
            is_hidden: qNode.data.is_hidden,
            question_number: qNode.data.question_number,
            validation_rules: qNode.data.validation_rules,
            conditional_logic: finalConditionalLogic,
            likert_config: qNode.data.likert_config,
            ranking_config: qNode.data.ranking_config,
            options: qNode.data.options,
          })
        );
      }

      // ====== 5. 섹션 순서도 업데이트 (x 위치 기준) ======
      // 각 섹션의 첫 번째 질문 노드의 x 위치를 기준으로 섹션 순서 결정
      const sectionFirstXPos = new Map<string, number>();
      questionNodes.forEach((qNode) => {
        const sectionId = qNode.data.section_id;
        if (!sectionId) return;
        if (!sectionFirstXPos.has(sectionId) || qNode.position.x < sectionFirstXPos.get(sectionId)!) {
          sectionFirstXPos.set(sectionId, qNode.position.x);
        }
      });

      const sortedSections = Array.from(sectionFirstXPos.entries())
        .sort((a, b) => a[1] - b[1]);

      sortedSections.forEach(([sectionId, _], index) => {
        const section = survey.sections.find((s) => s.id === sectionId);
        if (section && section.id) {
          updatePromises.push(
            updateSection(section.id, {
              title: section.title,
              description: section.description,
              order_index: index,
            })
          );
        }
      });

      await Promise.all(updatePromises);

      // ====== 6. 설문 데이터 다시 로드하여 survey 상태 동기화 ======
      const updatedSurvey = await getSurvey(survey.id!);
      setSurvey(updatedSurvey);

      setSnackbar({ open: true, message: '저장되었습니다. 모든 편집 페이지에 동일하게 반영됩니다.', severity: 'success' });
    } catch (e: any) {
      console.error('흐름 저장 실패:', e);
      setSnackbar({ open: true, message: `저장 실패: ${e.message}`, severity: 'error' });
    } finally {
      setSaving(false);
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
        <Alert severity="error">{error || '설문을 찾을 수 없습니다.'}</Alert>
      </Container>
    );
  }

  const allQuestions = survey.sections.flatMap((s) => s.questions);

  return (
    <>
      <Head>
        <title>설문 흐름 편집: {survey.title} | SurveyMachine</title>
      </Head>

      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
        {/* 왼쪽 사이드바 - 질문 편집 */}
        <Drawer
          anchor="left"
          open={leftSidebarOpen}
          variant="temporary"
          onClose={() => {
            setLeftSidebarOpen(false);
            setEditingQuestion(null);
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 500,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'grey.200',
              overflowY: 'auto',
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.200' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={700}>
                질문 편집
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setLeftSidebarOpen(false);
                  setEditingQuestion(null);
                }}
              >
                <ArrowBack />
              </IconButton>
            </Box>
          </Box>

          {editingQuestion && (
            <Box sx={{ p: 2 }}>
              <QuestionEditor
                question={editingQuestion.question}
                onChange={handleQuestionChange}
                onDelete={handleQuestionDelete}
                onSave={handleQuestionSave}
                isNew={!editingQuestion.question.id}
                allQuestions={allQuestions}
                currentQuestionId={editingQuestion.question.id}
              />
            </Box>
          )}
        </Drawer>

        {/* 메인 편집 영역 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* 헤더 */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'grey.200',
              backgroundColor: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => router.push(`/manage/surveys/${id}/edit`)}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                설문 흐름 편집
              </Typography>
              <Typography variant="body2" color="grey.500">
                {survey.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="되돌리기 (Ctrl+Z)">
                <span>
                  <IconButton
                    onClick={handleUndo}
                    disabled={!canUndo}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      '&:disabled': {
                        opacity: 0.3,
                      },
                    }}
                  >
                    <Undo />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="다시 실행 (Ctrl+Y)">
                <span>
                  <IconButton
                    onClick={handleRedo}
                    disabled={!canRedo}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      '&:disabled': {
                        opacity: 0.3,
                      },
                    }}
                  >
                    <Redo />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                onClick={handleSave}
                disabled={saving}
                sx={{ borderRadius: 2, ml: 1 }}
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </Box>
          </Box>

          {/* React Flow 캔버스 */}
          <Box ref={reactFlowWrapper} sx={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeUpdate={onEdgeUpdate}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onPaneClick={() => {
                // 빈 영역 클릭 시 사이드바 닫기
                if (leftSidebarOpen) {
                  setLeftSidebarOpen(false);
                  setEditingQuestion(null);
                }
              }}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionMode="loose"
              fitView
              deleteKeyCode={null}
              multiSelectionKeyCode={['Meta', 'Control']}
            >
              <Controls />
              <Background />
              <MiniMap />
            </ReactFlow>
          </Box>
        </Box>

        {/* 오른쪽 사이드바 */}
        <Drawer
          anchor="right"
          open={rightSidebarOpen}
          variant="persistent"
          sx={{
            width: rightSidebarOpen ? 320 : 0,
            flexShrink: 0,
            position: 'relative',
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              borderLeft: '1px solid',
              borderColor: 'grey.200',
              position: 'relative',
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="h6" fontWeight={700}>
              질문 목록
            </Typography>
            <Typography variant="caption" color="grey.500">
              드래그하여 캔버스에 추가
            </Typography>
          </Box>

          <List sx={{ p: 1 }}>
            {/* 분기 블록 */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <Paper
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', 'branch');
                }}
                sx={{
                  width: '100%',
                  p: 2,
                  cursor: 'grab',
                  border: '1px dashed',
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  backgroundColor: '#F0FDF4',
                  '&:hover': {
                    borderColor: '#10B981',
                    backgroundColor: '#ECFDF5',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTree sx={{ color: '#10B981' }} />
                  <Typography variant="body2" fontWeight={600}>
                    분기 블록 추가
                  </Typography>
                </Box>
                <Typography variant="caption" color="grey.500">
                  질문 선택지를 기반으로 분기
                </Typography>
              </Paper>
            </ListItem>

            <Divider sx={{ my: 2 }} />

            {/* 질문 목록 */}
            {allQuestions.map((question) => (
              <ListItem key={question.id} disablePadding sx={{ mb: 1 }}>
                <Paper
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', 'question');
                    e.dataTransfer.setData('questionId', question.id || '');
                  }}
                  sx={{
                    width: '100%',
                    p: 2,
                    cursor: 'grab',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#3B82F6',
                      backgroundColor: '#EFF6FF',
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {question.question_number && `${question.question_number}. `}
                    {question.title || '제목 없음'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {question.question_number && (
                      <Chip
                        size="small"
                        label={question.question_number}
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                        }}
                      />
                    )}
                    <Chip
                      size="small"
                      label={question.type}
                      sx={{
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  </Box>
                </Paper>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* 분기 설정 다이얼로그 */}
        <Dialog
          open={branchDialogOpen}
          onClose={() => {
            setBranchDialogOpen(false);
            setSelectedNode(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>분기 설정</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>기준 질문</InputLabel>
              <Select
                value={branchConfig.questionId}
                onChange={(e) => {
                  const qId = e.target.value;
                  const question = allQuestions.find((q) => q.id === qId);
                  
                  // 기존 분기 노드에서 연결된 엣지 정보 가져오기
                  const existingBranches = selectedNode?.data?.branches || [];
                  const existingEdges = edges.filter((e) => e.source === selectedNode?.id);
                  
                  setBranchConfig({
                    questionId: qId,
                    optionValue: '',
                    branches: question?.options.map((opt) => {
                      // 기존에 설정된 nextQuestionId가 있으면 유지
                      const existingBranch = existingBranches.find((b: any) => b.value === opt.value);
                      const existingEdge = existingEdges.find((e) => e.sourceHandle === opt.value);
                      const existingTargetNode = existingEdge 
                        ? nodes.find((n) => n.id === existingEdge.target)
                        : null;
                      
                      return {
                        label: opt.label,
                        value: opt.value,
                        nextQuestionId: existingTargetNode?.data?.id || existingBranch?.nextQuestionId || '',
                      };
                    }) || [],
                  });
                }}
                label="기준 질문"
              >
                {allQuestions
                  .filter((q) => q.options && q.options.length > 0)
                  .map((question) => (
                    <MenuItem key={question.id} value={question.id}>
                      {question.question_number && `${question.question_number}. `}
                      {question.title || '제목 없음'}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {branchConfig.branches.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
                  분기 옵션 (각 옵션마다 다음 질문 선택):
                </Typography>
                <Stack spacing={2}>
                  {branchConfig.branches.map((branch, idx) => (
                    <Paper
                      key={branch.value}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 2,
                        backgroundColor: 'white',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                        {branch.label}
                      </Typography>
                      <FormControl fullWidth size="small">
                        <InputLabel>다음 질문 선택</InputLabel>
                        <Select
                          value={branch.nextQuestionId || ''}
                          onChange={(e) => {
                            const updatedBranches = [...branchConfig.branches];
                            updatedBranches[idx] = {
                              ...branch,
                              nextQuestionId: e.target.value,
                            };
                            setBranchConfig({
                              ...branchConfig,
                              branches: updatedBranches,
                            });
                          }}
                          label="다음 질문 선택"
                        >
                          <MenuItem value="">
                            <em>연결 안 함</em>
                          </MenuItem>
                          {allQuestions
                            .filter((q) => q.id !== branchConfig.questionId) // 기준 질문 제외
                            .map((q) => (
                              <MenuItem key={q.id} value={q.id}>
                                {q.question_number && `${q.question_number}. `}
                                {q.title || '제목 없음'}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setBranchDialogOpen(false);
              setSelectedNode(null);
            }}>
              취소
            </Button>
            <Button variant="contained" onClick={handleSaveBranch}>
              저장
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* 저장 상태 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
