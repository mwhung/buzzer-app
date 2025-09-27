// Drag and Drop 拖拽功能組件

import React from 'react';
import { Note } from '../../../../types';

export interface DragState {
  isDragging: boolean;
  dragIndex: number;
  dropIndex: number;
}

export interface DragAndDropProps {
  notes: Note[];
  onReorderNotes: (newNotes: Note[]) => void;
  readOnly?: boolean;
  children: (dragProps: DragHandlers) => React.ReactNode;
}

export interface DragHandlers {
  dragState: DragState;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
  onDragEnd: () => void;
}

export const DragAndDrop: React.FC<DragAndDropProps> = ({
  notes,
  onReorderNotes,
  readOnly = false,
  children
}) => {
  const [dragState, setDragState] = React.useState<DragState>({
    isDragging: false,
    dragIndex: -1,
    dropIndex: -1
  });

  // 拖拽開始
  const handleDragStart = React.useCallback((e: React.DragEvent, index: number) => {
    if (readOnly) return;

    setDragState({
      isDragging: true,
      dragIndex: index,
      dropIndex: -1
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }, [readOnly]);

  // 拖拽經過
  const handleDragOver = React.useCallback((e: React.DragEvent, index: number) => {
    if (readOnly || !dragState.isDragging) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDragState(prev => ({
      ...prev,
      dropIndex: index
    }));
  }, [readOnly, dragState.isDragging]);

  // 拖拽結束
  const handleDrop = React.useCallback((e: React.DragEvent, dropIndex: number) => {
    if (readOnly || !dragState.isDragging) return;

    e.preventDefault();

    const { dragIndex } = dragState;
    if (dragIndex === dropIndex) {
      setDragState({
        isDragging: false,
        dragIndex: -1,
        dropIndex: -1
      });
      return;
    }

    // 重排數組
    const newNotes = [...notes];
    const draggedNote = newNotes[dragIndex];
    newNotes.splice(dragIndex, 1);
    newNotes.splice(dropIndex, 0, draggedNote);

    onReorderNotes(newNotes);

    setDragState({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1
    });
  }, [readOnly, dragState, notes, onReorderNotes]);

  // 拖拽取消
  const handleDragEnd = React.useCallback(() => {
    setDragState({
      isDragging: false,
      dragIndex: -1,
      dropIndex: -1
    });
  }, []);

  const dragHandlers: DragHandlers = {
    dragState,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd
  };

  return <>{children(dragHandlers)}</>;
};