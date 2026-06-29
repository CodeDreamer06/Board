import React, { createContext, useContext, useState, useCallback } from 'react';
import { CanvasShape, Viewport, AlignmentGuide, ShapeType } from '../types/canvas';

export interface CanvasContextType {
  shapes: CanvasShape[];
  selectedIds: string[];
  viewport: Viewport;
  activeTool: ShapeType | 'select';
  snapToGrid: boolean;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  theme: 'light' | 'dark';
  alignmentGuides: AlignmentGuide[];
  
  setShapes: React.Dispatch<React.SetStateAction<CanvasShape[]>>;
  setSelectedIds: (ids: string[]) => void;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  setActiveTool: (tool: ShapeType | 'select') => void;
  setSnapToGrid: (snap: boolean) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;
  
  addShape: (shape: Omit<CanvasShape, 'id'>) => string;
  updateShape: (id: string, updates: Partial<CanvasShape>) => void;
  deleteSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushHistoryState: (customShapes?: CanvasShape[]) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shapes, setShapes] = useState<CanvasShape[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1.0 });
  const [activeTool, setActiveTool] = useState<ShapeType | 'select'>('select');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [strokeColor, setStrokeColor] = useState<string>('#3b82f6'); // Default Blue
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [fontSize, setFontSize] = useState<number>(16);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<CanvasShape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pushHistoryState = useCallback((customShapes?: CanvasShape[]) => {
    const targetShapes = customShapes !== undefined ? customShapes : shapes;
    
    // Check if the state actually changed compared to the current history state to avoid useless commits
    if (historyIndex >= 0) {
      const currentHistoryState = history[historyIndex];
      if (JSON.stringify(currentHistoryState) === JSON.stringify(targetShapes)) {
        return;
      }
    }

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(JSON.parse(JSON.stringify(targetShapes))); // Deep copy
    
    if (nextHistory.length > 50) {
      nextHistory.shift();
    }
    
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    if (customShapes !== undefined) {
      setShapes(customShapes);
    }
  }, [shapes, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const prevShapes = JSON.parse(JSON.stringify(history[nextIndex]));
      setHistoryIndex(nextIndex);
      setShapes(prevShapes);
      setSelectedIdsState([]); // Clear selection to avoid dangling handles
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextShapes = JSON.parse(JSON.stringify(history[nextIndex]));
      setHistoryIndex(nextIndex);
      setShapes(nextShapes);
      setSelectedIdsState([]);
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Initialize history with initial state once
  React.useEffect(() => {
    if (history.length === 0) {
      setHistory([[]]);
      setHistoryIndex(0);
    }
  }, [history]);

  // Set selection IDs
  const setSelectedIds = useCallback((ids: string[]) => {
    // If selecting items that belong to groups, expand selection to include the entire group
    const expandedIds = new Set<string>();
    
    ids.forEach(id => {
      const shape = shapes.find(s => s.id === id);
      if (shape) {
        expandedIds.add(id);
        if (shape.groupId) {
          shapes.forEach(s => {
            if (s.groupId === shape.groupId) {
              expandedIds.add(s.id);
            }
          });
        }
      }
    });
    
    setSelectedIdsState(Array.from(expandedIds));
  }, [shapes]);

  const addShape = useCallback((shapeInput: Omit<CanvasShape, 'id'>) => {
    const id = `shape_${Math.random().toString(36).substring(2, 9)}`;
    const newShape: CanvasShape = {
      ...shapeInput,
      id
    };
    
    const updated = [...shapes, newShape];
    pushHistoryState(updated);
    return id;
  }, [shapes, pushHistoryState]);

  const updateShape = useCallback((id: string, updates: Partial<CanvasShape>) => {
    const updated = shapes.map(s => {
      if (s.id === id) {
        return { ...s, ...updates };
      }
      return s;
    });
    setShapes(updated);
  }, [shapes]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const updated = shapes.filter(s => !selectedSet.has(s.id));
    pushHistoryState(updated);
    setSelectedIdsState([]);
  }, [shapes, selectedIds, pushHistoryState]);

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    
    const groupId = `group_${Math.random().toString(36).substring(2, 9)}`;
    const selectedSet = new Set(selectedIds);
    
    const updated = shapes.map(s => {
      if (selectedSet.has(s.id)) {
        return { ...s, groupId };
      }
      return s;
    });
    
    pushHistoryState(updated);
    // Refresh selection to include any group buddies
    setSelectedIdsState(Array.from(selectedSet));
  }, [shapes, selectedIds, pushHistoryState]);

  const ungroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    
    // Find all group IDs in the selection
    const groupIdsToUngroup = new Set<string>();
    shapes.forEach(s => {
      if (selectedSet.has(s.id) && s.groupId) {
        groupIdsToUngroup.add(s.groupId);
      }
    });

    if (groupIdsToUngroup.size === 0) return;

    const updated = shapes.map(s => {
      if (s.groupId && groupIdsToUngroup.has(s.groupId)) {
        const { groupId: _, ...rest } = s;
        return rest as CanvasShape;
      }
      return s;
    });

    pushHistoryState(updated);
  }, [shapes, selectedIds, pushHistoryState]);

  const bringToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const selectedShapes = shapes.filter(s => selectedSet.has(s.id));
    const otherShapes = shapes.filter(s => !selectedSet.has(s.id));
    const updated = [...otherShapes, ...selectedShapes];
    pushHistoryState(updated);
  }, [shapes, selectedIds, pushHistoryState]);

  const sendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const selectedShapes = shapes.filter(s => selectedSet.has(s.id));
    const otherShapes = shapes.filter(s => !selectedSet.has(s.id));
    const updated = [...selectedShapes, ...otherShapes];
    pushHistoryState(updated);
  }, [shapes, selectedIds, pushHistoryState]);

  return (
    <CanvasContext.Provider
      value={{
        shapes,
        selectedIds,
        viewport,
        activeTool,
        snapToGrid,
        strokeColor,
        fillColor,
        strokeWidth,
        fontSize,
        theme,
        alignmentGuides,
        setShapes,
        setSelectedIds,
        setViewport,
        setActiveTool,
        setSnapToGrid,
        setStrokeColor,
        setFillColor,
        setStrokeWidth,
        setFontSize,
        setTheme,
        setAlignmentGuides,
        addShape,
        updateShape,
        deleteSelected,
        groupSelected,
        ungroupSelected,
        bringToFront,
        sendToBack,
        undo,
        redo,
        canUndo,
        canRedo,
        pushHistoryState
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};
