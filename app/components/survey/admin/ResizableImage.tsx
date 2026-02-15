import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

interface ResizableImageProps {
  src: string;
  width: number;
  height: number;
  onSizeChange: (width: number, height: number) => void;
  onDelete?: () => void;
  onImageClick?: () => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
}

export default function ResizableImage({
  src,
  width,
  height,
  onSizeChange,
  onDelete,
  onImageClick,
  minWidth = 24,
  minHeight = 24,
  maxWidth = 500,
  maxHeight = 500,
  maintainAspectRatio = false,
}: ResizableImageProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 리사이즈 핸들 위치 정의 (8개 방향)
  const handles = [
    { position: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
    { position: 'n', cursor: 'n-resize', x: 50, y: 0 },
    { position: 'ne', cursor: 'ne-resize', x: 100, y: 0 },
    { position: 'e', cursor: 'e-resize', x: 100, y: 50 },
    { position: 'se', cursor: 'se-resize', x: 100, y: 100 },
    { position: 's', cursor: 's-resize', x: 50, y: 100 },
    { position: 'sw', cursor: 'sw-resize', x: 0, y: 100 },
    { position: 'w', cursor: 'w-resize', x: 0, y: 50 },
  ];

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width, height });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeHandle) return;
      
      // 마우스 이동 거리 계산 (픽셀 단위)
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      let newWidth = startSize.width;
      let newHeight = startSize.height;
      const aspectRatio = startSize.width / startSize.height;

      switch (resizeHandle) {
        case 'nw':
          // 왼쪽 위: 너비와 높이 모두 감소
          newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width - deltaX));
          newHeight = maintainAspectRatio 
            ? Math.max(minHeight, Math.min(maxHeight, newWidth / aspectRatio))
            : Math.max(minHeight, Math.min(maxHeight, startSize.height - deltaY));
          if (maintainAspectRatio && newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
          break;
        case 'n':
          // 위: 높이만 감소
          newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height - deltaY));
          if (maintainAspectRatio) {
            newWidth = Math.max(minWidth, Math.min(maxWidth, newHeight * aspectRatio));
          }
          break;
        case 'ne':
          // 오른쪽 위: 너비 증가, 높이 감소
          newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width + deltaX));
          newHeight = maintainAspectRatio 
            ? Math.max(minHeight, Math.min(maxHeight, newWidth / aspectRatio))
            : Math.max(minHeight, Math.min(maxHeight, startSize.height - deltaY));
          if (maintainAspectRatio && newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
          break;
        case 'e':
          // 오른쪽: 너비만 증가
          newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width + deltaX));
          if (maintainAspectRatio) {
            newHeight = Math.max(minHeight, Math.min(maxHeight, newWidth / aspectRatio));
          }
          break;
        case 'se':
          // 오른쪽 아래: 너비와 높이 모두 증가
          newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width + deltaX));
          newHeight = maintainAspectRatio 
            ? Math.max(minHeight, Math.min(maxHeight, newWidth / aspectRatio))
            : Math.max(minHeight, Math.min(maxHeight, startSize.height + deltaY));
          if (maintainAspectRatio && newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
          break;
        case 's':
          // 아래: 높이만 증가
          newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height + deltaY));
          if (maintainAspectRatio) {
            newWidth = Math.max(minWidth, Math.min(maxWidth, newHeight * aspectRatio));
          }
          break;
        case 'sw':
          // 왼쪽 아래: 너비 감소, 높이 증가
          newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width - deltaX));
          newHeight = maintainAspectRatio 
            ? Math.max(minHeight, Math.min(maxHeight, newWidth / aspectRatio))
            : Math.max(minHeight, Math.min(maxHeight, startSize.height + deltaY));
          if (maintainAspectRatio && newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
          break;
        case 'w':
          // 왼쪽: 너비만 감소
          newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width - deltaX));
          if (maintainAspectRatio) {
            newHeight = Math.max(minHeight, Math.min(maxHeight, newWidth / aspectRatio));
          }
          break;
      }

      // 최소/최대 크기 재확인
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

      onSizeChange(Math.round(newWidth), Math.round(newHeight));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, startPos, startSize, width, height, minWidth, minHeight, maxWidth, maxHeight, maintainAspectRatio, onSizeChange]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        display: 'inline-block',
        '&:hover .resize-handle': {
          opacity: 1,
        },
        // 컨테이너 호버 시 핸들 표시
        '&:hover': {
          '& .resize-handle': {
            opacity: 1,
          },
        },
      }}
    >
      <Box
        ref={imageRef}
        component="img"
        src={src}
        alt="로고"
        onClick={onImageClick}
        sx={{
          width: `${width}px`,
          height: `${height}px`,
          objectFit: 'contain',
          borderRadius: 1,
          cursor: onImageClick ? 'pointer' : 'default',
          display: 'block',
          userSelect: 'none',
          pointerEvents: isResizing ? 'none' : 'auto',
        }}
        draggable={false}
      />
      
      {/* 리사이즈 핸들들 */}
      {handles.map((handle) => (
        <Box
          key={handle.position}
          className="resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseDown(e, handle.position);
          }}
          sx={{
            position: 'absolute',
            left: `${handle.x}%`,
            top: `${handle.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 16,
            height: 16,
            backgroundColor: '#3B82F6',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: handle.cursor,
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 10,
            pointerEvents: 'auto',
            // 더 큰 클릭 영역을 위한 패딩
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
            },
            '&:hover': {
              backgroundColor: '#2563EB',
              transform: 'translate(-50%, -50%) scale(1.3)',
              opacity: 1,
            },
            '&:active': {
              backgroundColor: '#1D4ED8',
            },
          }}
        />
      ))}
      
      {/* 삭제 버튼 */}
      {onDelete && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: '#EF4444',
            color: 'white',
            width: 20,
            height: 20,
            zIndex: 11,
            '&:hover': { backgroundColor: '#DC2626' },
          }}
        >
          <Close sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );
}
