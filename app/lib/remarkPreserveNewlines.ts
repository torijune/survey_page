/**
 * Remark plugin: 텍스트 노드 내 개행(\n)을 break 노드로 변환.
 * 수정 창에서 엔터로 줄바꿈한 내용이 실제 렌더링에서도 줄바꿈되도록 함.
 */
export function remarkPreserveNewlines() {
  return (tree: { children?: unknown[] }) => {
    function visit(parent: { children?: unknown[] } | null) {
      if (!parent || !Array.isArray(parent.children)) return;
      const children = parent.children as { type: string; value?: string; children?: unknown[] }[];
      for (let i = children.length - 1; i >= 0; i--) {
        const node = children[i];
        visit(node && typeof node === 'object' && 'children' in node ? (node as { children: unknown[] }) : null);
        if (node && typeof node === 'object' && node.type === 'text' && typeof node.value === 'string' && node.value.includes('\n')) {
          const parts = node.value.split(/\r?\n/);
          const newNodes: { type: string; value?: string }[] = [];
          for (let j = 0; j < parts.length; j++) {
            if (parts[j].length) newNodes.push({ type: 'text', value: parts[j] });
            if (j < parts.length - 1) newNodes.push({ type: 'break' });
          }
          children.splice(i, 1, ...newNodes);
        }
      }
    }
    visit(tree);
  };
}
