import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../../hooks/useCanvasState';
import { CanvasShape, Point, AlignmentGuide } from '../../types/canvas';
import { renderCustomShape } from './ShapeRenderers';

// Helper to calculate distance from point to line segment
const distToSegment = (p: Point, v: Point, w: Point) => {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
};

export const Canvas: React.FC = () => {
  const {
    shapes,
    setShapes,
    selectedIds,
    setSelectedIds,
    viewport,
    setViewport,
    activeTool,
    setActiveTool,
    snapToGrid,
    strokeColor,
    fillColor,
    strokeWidth,
    fontSize,
    theme,
    alignmentGuides,
    setAlignmentGuides,
    addShape,
    pushHistoryState
  } = useCanvas();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Local state for interactions
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [lastPanPos, setLastPanPos] = useState<Point>({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [draggedShapeInitialPositions, setDraggedShapeInitialPositions] = useState<Map<string, { x: number; y: number; points?: Point[] }>>(new Map());
  
  // Selection box state
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<Point>({ x: 0, y: 0 });

  // Current drawing shape ID
  const [drawingShapeId, setDrawingShapeId] = useState<string | null>(null);

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [editingTextPos, setEditingTextPos] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Get mouse coordinates in canvas space
  const getCanvasCoords = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    return { x, y };
  }, [viewport]);

  // Track space bar press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(true);
        // Prevent default spacebar scrolling
        if (document.activeElement === document.body) {
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Set up full screen size canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if mouse is on a shape
  const getShapeAtPosition = useCallback((point: Point): CanvasShape | null => {
    // Traverse backwards to pick shapes on top
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const minX = Math.min(shape.x, shape.x + shape.width);
      const maxX = Math.max(shape.x, shape.x + shape.width);
      const minY = Math.min(shape.y, shape.y + shape.height);
      const maxY = Math.max(shape.y, shape.y + shape.height);

      if (shape.type === 'rectangle' || shape.type === 'text' || shape.type === 'sticky') {
        if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
          return shape;
        }
      } else if (shape.type === 'circle') {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const rx = Math.abs(shape.width / 2);
        const ry = Math.abs(shape.height / 2);
        if (rx > 0 && ry > 0) {
          const val = ((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2;
          if (val <= 1.05) return shape;
        }
      } else if (shape.type === 'line' || shape.type === 'arrow') {
        const p1 = { x: shape.x, y: shape.y };
        const p2 = { x: shape.x + shape.width, y: shape.y + shape.height };
        if (distToSegment(point, p1, p2) < 8) {
          return shape;
        }
      } else if (shape.type === 'freehand' && shape.points) {
        // Check if cursor is near bounding box first
        if (point.x >= minX - 10 && point.x <= maxX + 10 && point.y >= minY - 10 && point.y <= maxY + 10) {
          // Check segment distances
          for (let pIdx = 0; pIdx < shape.points.length - 1; pIdx++) {
            if (distToSegment(point, shape.points[pIdx], shape.points[pIdx + 1]) < 10) {
              return shape;
            }
          }
        }
      } else if (shape.type === 'connector') {
        // Resolve dynamic endpoints
        let p1 = shape.connectorStartPoint || { x: shape.x, y: shape.y };
        if (shape.connectorStartShapeId) {
          const s = shapes.find(sh => sh.id === shape.connectorStartShapeId);
          if (s) p1 = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
        }
        let p2 = shape.connectorEndPoint || { x: shape.x + shape.width, y: shape.y + shape.height };
        if (shape.connectorEndShapeId) {
          const s = shapes.find(sh => sh.id === shape.connectorEndShapeId);
          if (s) p2 = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
        }

        if (distToSegment(point, p1, p2) < 8) {
          return shape;
        }
      }
    }
    return null;
  }, [shapes]);

  // Determine if mouse is over a resize handle of a selected shape
  const getResizeHandleAtPosition = useCallback((canvasPoint: Point): { shapeId: string; handle: string } | null => {
    if (selectedIds.length !== 1) return null;
    const shape = shapes.find(s => s.id === selectedIds[0]);
    if (!shape) return null;

    const handleSize = 8 / viewport.zoom;
    const hs = handleSize / 2;

    const x = shape.x;
    const y = shape.y;
    const w = shape.width;
    const h = shape.height;

    // Corner & center handle coordinates
    const handles = {
      tl: { x, y },
      tc: { x: x + w / 2, y },
      tr: { x: x + w, y },
      ml: { x, y: y + h / 2 },
      mr: { x: x + w, y: y + h / 2 },
      bl: { x, y: y + h },
      bc: { x: x + w / 2, y: y + h },
      br: { x: x + w, y: y + h }
    };

    for (const [key, pt] of Object.entries(handles)) {
      if (
        canvasPoint.x >= pt.x - hs &&
        canvasPoint.x <= pt.x + hs &&
        canvasPoint.y >= pt.y - hs &&
        canvasPoint.y <= pt.y + hs
      ) {
        return { shapeId: shape.id, handle: key };
      }
    }

    return null;
  }, [selectedIds, shapes, viewport.zoom]);

  // Alignment Guide Computation
  const computeAlignmentAndSnap = useCallback((
    activeId: string,
    newX: number,
    newY: number,
    width: number,
    height: number,
    snapDistance = 5
  ) => {
    const guides: AlignmentGuide[] = [];
    let snappedX = newX;
    let snappedY = newY;
    
    // Find shape group ID
    const activeShape = shapes.find(s => s.id === activeId);
    const activeGroupId = activeShape?.groupId;

    // Exclude dragged shape and any shapes sharing its group ID
    const others = shapes.filter(s => s.id !== activeId && (!activeGroupId || s.groupId !== activeGroupId));

    const activeLeft = newX;
    const activeCenter = newX + width / 2;
    const activeRight = newX + width;
    
    const activeTop = newY;
    const activeMiddle = newY + height / 2;
    const activeBottom = newY + height;

    const snapLimit = snapDistance / viewport.zoom;

    // 1. Vertical alignments (drawing vertical lines)
    for (const other of others) {
      const otherLeft = other.x;
      const otherCenter = other.x + other.width / 2;
      const otherRight = other.x + other.width;

      const otherYStart = Math.min(newY, other.y);
      const otherYEnd = Math.max(newY + height, other.y + other.height);

      if (Math.abs(activeLeft - otherLeft) < snapLimit) {
        snappedX = otherLeft;
        guides.push({ type: 'v', coord: otherLeft, start: otherYStart, end: otherYEnd });
        break;
      }
      if (Math.abs(activeLeft - otherCenter) < snapLimit) {
        snappedX = otherCenter;
        guides.push({ type: 'v', coord: otherCenter, start: otherYStart, end: otherYEnd });
        break;
      }
      if (Math.abs(activeLeft - otherRight) < snapLimit) {
        snappedX = otherRight;
        guides.push({ type: 'v', coord: otherRight, start: otherYStart, end: otherYEnd });
        break;
      }

      if (Math.abs(activeCenter - otherCenter) < snapLimit) {
        snappedX = otherCenter - width / 2;
        guides.push({ type: 'v', coord: otherCenter, start: otherYStart, end: otherYEnd });
        break;
      }

      if (Math.abs(activeRight - otherRight) < snapLimit) {
        snappedX = otherRight - width;
        guides.push({ type: 'v', coord: otherRight, start: otherYStart, end: otherYEnd });
        break;
      }
      if (Math.abs(activeRight - otherLeft) < snapLimit) {
        snappedX = otherLeft - width;
        guides.push({ type: 'v', coord: otherLeft, start: otherYStart, end: otherYEnd });
        break;
      }
    }

    // 2. Horizontal alignments (drawing horizontal lines)
    for (const other of others) {
      const otherTop = other.y;
      const otherMiddle = other.y + other.height / 2;
      const otherBottom = other.y + other.height;

      const otherXStart = Math.min(newX, other.x);
      const otherXEnd = Math.max(newX + width, other.x + other.width);

      if (Math.abs(activeTop - otherTop) < snapLimit) {
        snappedY = otherTop;
        guides.push({ type: 'h', coord: otherTop, start: otherXStart, end: otherXEnd });
        break;
      }
      if (Math.abs(activeTop - otherMiddle) < snapLimit) {
        snappedY = otherMiddle;
        guides.push({ type: 'h', coord: otherMiddle, start: otherXStart, end: otherXEnd });
        break;
      }
      if (Math.abs(activeTop - otherBottom) < snapLimit) {
        snappedY = otherBottom;
        guides.push({ type: 'h', coord: otherBottom, start: otherXStart, end: otherXEnd });
        break;
      }

      if (Math.abs(activeMiddle - otherMiddle) < snapLimit) {
        snappedY = otherMiddle - height / 2;
        guides.push({ type: 'h', coord: otherMiddle, start: otherXStart, end: otherXEnd });
        break;
      }

      if (Math.abs(activeBottom - otherBottom) < snapLimit) {
        snappedY = otherBottom - height;
        guides.push({ type: 'h', coord: otherBottom, start: otherXStart, end: otherXEnd });
        break;
      }
      if (Math.abs(activeBottom - otherTop) < snapLimit) {
        snappedY = otherTop - height;
        guides.push({ type: 'h', coord: otherTop, start: otherXStart, end: otherXEnd });
        break;
      }
    }

    return { snappedX, snappedY, guides };
  }, [shapes, viewport.zoom]);

  // --- Zoom logic (Ctrl + Wheel) ---
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    
    // Zoom in or out
    const nextZoom = e.deltaY < 0 
      ? Math.min(viewport.zoom * zoomFactor, 20.0) 
      : Math.max(viewport.zoom / zoomFactor, 0.1);

    if (nextZoom === viewport.zoom) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasMouseX = (mouseX - viewport.x) / viewport.zoom;
    const canvasMouseY = (mouseY - viewport.y) / viewport.zoom;

    setViewport({
      x: mouseX - canvasMouseX * nextZoom,
      y: mouseY - canvasMouseY * nextZoom,
      zoom: nextZoom
    });
  };

  // --- Double-click to Edit Text / Sticky ---
  const handleDoubleClick = (e: React.MouseEvent) => {
    const canvasPoint = getCanvasCoords(e);
    const clickedShape = getShapeAtPosition(canvasPoint);

    if (clickedShape && (clickedShape.type === 'text' || clickedShape.type === 'sticky')) {
      startTextEditing(clickedShape);
    }
  };

  const startTextEditing = (shape: CanvasShape) => {
    setEditingTextId(shape.id);
    setEditingTextValue(shape.text || '');

    // Compute screen coordinates for input positioning
    const screenX = shape.x * viewport.zoom + viewport.x;
    const screenY = shape.y * viewport.zoom + viewport.y;
    const screenW = shape.width * viewport.zoom;
    const screenH = shape.height * viewport.zoom;

    setEditingTextPos({
      x: screenX,
      y: screenY,
      w: screenW,
      h: screenH
    });

    // Auto focus the input after render
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
        textInputRef.current.select();
      }
    }, 50);
  };

  const finishTextEditing = () => {
    if (editingTextId === null) return;
    
    const updatedShapes = shapes.map(s => {
      if (s.id === editingTextId) {
        return { ...s, text: editingTextValue };
      }
      return s;
    });

    setShapes(updatedShapes);
    pushHistoryState(updatedShapes);
    setEditingTextId(null);
  };

  // --- Mouse Down Event ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // If text edit is active, save and blur
    if (editingTextId !== null && e.target !== textInputRef.current) {
      finishTextEditing();
      return;
    }

    const canvasPoint = getCanvasCoords(e);

    // 1. Panning: Space + Left Click or Middle Click
    if (isSpacePressed || e.button === 1) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }

    // 2. Select Tool
    if (activeTool === 'select') {
      const handleInfo = getResizeHandleAtPosition(canvasPoint);
      if (handleInfo) {
        setIsResizing(true);
        setResizeHandle(handleInfo.handle);
        setDragStart(canvasPoint);
        
        const shape = shapes.find(s => s.id === handleInfo.shapeId);
        if (shape) {
          const map = new Map();
          map.set(shape.id, { x: shape.x, y: shape.y, points: shape.points });
          setDraggedShapeInitialPositions(map);
        }
        return;
      }

      const clickedShape = getShapeAtPosition(canvasPoint);
      if (clickedShape) {
        // Select logic
        const alreadySelected = selectedIds.includes(clickedShape.id);
        
        if (e.shiftKey) {
          if (alreadySelected) {
            // Remove selection
            setSelectedIds(selectedIds.filter(id => id !== clickedShape.id));
          } else {
            // Append
            setSelectedIds([...selectedIds, clickedShape.id]);
          }
        } else {
          if (!alreadySelected) {
            setSelectedIds([clickedShape.id]);
          }
        }

        setIsDragging(true);
        setDragStart(canvasPoint);

        // Store initial positions of all shapes that are about to be dragged (including grouped partners)
        const initialMap = new Map<string, { x: number; y: number; points?: Point[] }>();
        const targetIds = e.shiftKey || alreadySelected 
          ? [...selectedIds, clickedShape.id] 
          : [clickedShape.id];
          
        // Re-read from canvas state because setSelectedIds might expand selectedIds to group partners
        const expandedIds = new Set<string>();
        targetIds.forEach(id => {
          const s = shapes.find(sh => sh.id === id);
          if (s) {
            expandedIds.add(id);
            if (s.groupId) {
              shapes.forEach(sh => {
                if (sh.groupId === s.groupId) expandedIds.add(sh.id);
              });
            }
          }
        });

        expandedIds.forEach(id => {
          const s = shapes.find(sh => sh.id === id);
          if (s) {
            initialMap.set(s.id, { x: s.x, y: s.y, points: s.points ? [...s.points] : undefined });
          }
        });
        
        setDraggedShapeInitialPositions(initialMap);
      } else {
        // Clicked empty space
        if (!e.shiftKey) {
          setSelectedIds([]);
        }
        setIsSelecting(true);
        setSelectionBoxStart(canvasPoint);
        setSelectionBoxCurrent(canvasPoint);
      }
    } else {
      // 3. Shape Drawing Tools
      setIsDrawing(true);
      setDragStart(canvasPoint);
      
      const newShapeBase: Omit<CanvasShape, 'id'> = {
        type: activeTool,
        x: canvasPoint.x,
        y: canvasPoint.y,
        width: 0,
        height: 0,
        color: strokeColor,
        fillColor: activeTool === 'sticky' ? '#fef08a' : fillColor, // Sticky is yellow by default
        strokeWidth,
        fontSize,
        text: activeTool === 'text' || activeTool === 'sticky' ? 'Double click to edit' : ''
      };

      if (activeTool === 'freehand') {
        newShapeBase.points = [{ x: canvasPoint.x, y: canvasPoint.y }];
      } else if (activeTool === 'connector') {
        // Check if connector starts from a shape
        const sourceShape = getShapeAtPosition(canvasPoint);
        if (sourceShape) {
          newShapeBase.connectorStartShapeId = sourceShape.id;
        } else {
          newShapeBase.connectorStartPoint = { x: canvasPoint.x, y: canvasPoint.y };
        }
        newShapeBase.connectorEndPoint = { x: canvasPoint.x, y: canvasPoint.y };
      }

      const id = addShape(newShapeBase);
      setDrawingShapeId(id);
    }
  };

  // --- Mouse Move Event ---
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasPoint = getCanvasCoords(e);

    // 1. Panning
    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setViewport(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Update cursor depending on hover over handles/shapes
    if (activeTool === 'select' && !isDragging && !isResizing && !isSelecting) {
      const handle = getResizeHandleAtPosition(canvasPoint);
      if (handle) {
        const cursorMap: Record<string, string> = {
          tl: 'nwse-resize',
          br: 'nwse-resize',
          tr: 'nesw-resize',
          bl: 'nesw-resize',
          tc: 'ns-resize',
          bc: 'ns-resize',
          ml: 'ew-resize',
          mr: 'ew-resize'
        };
        e.currentTarget.style.cursor = cursorMap[handle.handle] || 'default';
      } else {
        const shape = getShapeAtPosition(canvasPoint);
        e.currentTarget.style.cursor = shape ? 'move' : (isSpacePressed ? 'grab' : 'default');
      }
    } else if (isSpacePressed) {
      e.currentTarget.style.cursor = isPanning ? 'grabbing' : 'grab';
    } else if (activeTool !== 'select') {
      e.currentTarget.style.cursor = 'crosshair';
    }

    // 2. Multi-selection Box dragging
    if (isSelecting) {
      setSelectionBoxCurrent(canvasPoint);
      
      const x1 = Math.min(selectionBoxStart.x, canvasPoint.x);
      const x2 = Math.max(selectionBoxStart.x, canvasPoint.x);
      const y1 = Math.min(selectionBoxStart.y, canvasPoint.y);
      const y2 = Math.max(selectionBoxStart.y, canvasPoint.y);

      // Select any shape intersecting selection box
      const newlySelected: string[] = [];
      shapes.forEach(shape => {
        const sx1 = Math.min(shape.x, shape.x + shape.width);
        const sx2 = Math.max(shape.x, shape.x + shape.width);
        const sy1 = Math.min(shape.y, shape.y + shape.height);
        const sy2 = Math.max(shape.y, shape.y + shape.height);

        // Check bounding box intersection
        if (sx1 <= x2 && sx2 >= x1 && sy1 <= y2 && sy2 >= y1) {
          newlySelected.push(shape.id);
        }
      });
      setSelectedIds(newlySelected);
      return;
    }

    // 3. Resizing Selected Shape
    if (isResizing && selectedIds.length === 1 && resizeHandle) {
      const shapeId = selectedIds[0];
      const shape = shapes.find(s => s.id === shapeId);
      const initial = draggedShapeInitialPositions.get(shapeId);
      
      if (shape && initial) {
        let dx = canvasPoint.x - dragStart.x;
        let dy = canvasPoint.y - dragStart.y;
        
        let newX = initial.x;
        let newY = initial.y;
        let newW = shape.width;
        let newH = shape.height;

        const right = initial.x + shape.width;
        const bottom = initial.y + shape.height;

        switch (resizeHandle) {
          case 'tl':
            newX = initial.x + dx;
            newY = initial.y + dy;
            newW = right - newX;
            newH = bottom - newY;
            break;
          case 'tr':
            newY = initial.y + dy;
            newW = canvasPoint.x - initial.x;
            newH = bottom - newY;
            break;
          case 'br':
            newW = canvasPoint.x - initial.x;
            newH = canvasPoint.y - initial.y;
            break;
          case 'bl':
            newX = initial.x + dx;
            newW = right - newX;
            newH = canvasPoint.y - initial.y;
            break;
          case 'tc':
            newY = initial.y + dy;
            newH = bottom - newY;
            break;
          case 'bc':
            newH = canvasPoint.y - initial.y;
            break;
          case 'ml':
            newX = initial.x + dx;
            newW = right - newX;
            break;
          case 'mr':
            newW = canvasPoint.x - initial.x;
            break;
        }

        // Apply Snap to Grid if toggled
        if (snapToGrid) {
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
          newW = Math.round(newW / 20) * 20;
          newH = Math.round(newH / 20) * 20;
        }

        // Prevent flipping below minimum size
        if (newW < 10) {
          newW = 10;
          if (resizeHandle === 'tl' || resizeHandle === 'bl' || resizeHandle === 'ml') {
            newX = right - 10;
          }
        }
        if (newH < 10) {
          newH = 10;
          if (resizeHandle === 'tl' || resizeHandle === 'tr' || resizeHandle === 'tc') {
            newY = bottom - 10;
          }
        }

        // Scaled Freehand point resizing
        let updatedPoints = shape.points;
        if (shape.type === 'freehand' && shape.points && initial.points) {
          const ratioX = newW / (shape.width || 1);
          const ratioY = newH / (shape.height || 1);
          updatedPoints = initial.points.map(p => ({
            x: newX + (p.x - initial.x) * ratioX,
            y: newY + (p.y - initial.y) * ratioY
          }));
        }

        setShapes(shapes.map(s => {
          if (s.id === shapeId) {
            return {
              ...s,
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              points: updatedPoints
            };
          }
          return s;
        }));
      }
      return;
    }

    // 4. Dragging Shapes
    if (isDragging && draggedShapeInitialPositions.size > 0) {
      let dx = canvasPoint.x - dragStart.x;
      let dy = canvasPoint.y - dragStart.y;

      if (snapToGrid) {
        dx = Math.round(dx / 20) * 20;
        dy = Math.round(dy / 20) * 20;
      }

      // Guide snapping and alignment lines (only when dragging a single shape for precision)
      let snapDx = dx;
      let snapDy = dy;
      let guides: AlignmentGuide[] = [];

      if (selectedIds.length === 1 && !snapToGrid) {
        const id = selectedIds[0];
        const initial = draggedShapeInitialPositions.get(id);
        const s = shapes.find(sh => sh.id === id);
        if (initial && s) {
          const rawTargetX = initial.x + dx;
          const rawTargetY = initial.y + dy;
          const align = computeAlignmentAndSnap(id, rawTargetX, rawTargetY, s.width, s.height);
          
          snapDx = align.snappedX - initial.x;
          snapDy = align.snappedY - initial.y;
          guides = align.guides;
        }
      }

      setAlignmentGuides(guides);

      // Move all dragged shapes
      setShapes(shapes.map(s => {
        const initial = draggedShapeInitialPositions.get(s.id);
        if (initial) {
          const nextShape = {
            ...s,
            x: initial.x + snapDx,
            y: initial.y + snapDy
          };
          if (s.points && initial.points) {
            nextShape.points = initial.points.map(p => ({
              x: p.x + snapDx,
              y: p.y + snapDy
            }));
          }
          return nextShape;
        }
        return s;
      }));
      return;
    }

    // 5. Drawing Shapes (drag to size)
    if (isDrawing && drawingShapeId) {
      const dx = canvasPoint.x - dragStart.x;
      const dy = canvasPoint.y - dragStart.y;

      setShapes(shapes.map(s => {
        if (s.id === drawingShapeId) {
          if (s.type === 'freehand') {
            return {
              ...s,
              points: [...(s.points || []), { x: canvasPoint.x, y: canvasPoint.y }],
              // Update bounding box encompassing all points
              x: Math.min(s.x, canvasPoint.x),
              y: Math.min(s.y, canvasPoint.y),
              width: Math.max(s.width, Math.abs(canvasPoint.x - s.x)),
              height: Math.max(s.height, Math.abs(canvasPoint.y - s.y))
            };
          } else if (s.type === 'connector') {
            // Drag connector endpoints
            const targetShape = getShapeAtPosition(canvasPoint);
            
            const nextProps: Partial<CanvasShape> = {};
            if (targetShape && targetShape.id !== s.connectorStartShapeId) {
              nextProps.connectorEndShapeId = targetShape.id;
              delete nextProps.connectorEndPoint;
            } else {
              nextProps.connectorEndPoint = { x: canvasPoint.x, y: canvasPoint.y };
              delete nextProps.connectorEndShapeId;
            }
            
            return {
              ...s,
              ...nextProps,
              width: dx,
              height: dy
            };
          } else {
            return {
              ...s,
              width: dx,
              height: dy
            };
          }
        }
        return s;
      }));
    }
  };

  // --- Mouse Up Event ---
  const handleMouseUp = () => {
    // If was panning, finish
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Commits to history on action ends
    if (isSelecting) {
      setIsSelecting(false);
    }

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setDraggedShapeInitialPositions(new Map());
      pushHistoryState(shapes);
    }

    if (isDragging) {
      setIsDragging(false);
      setDraggedShapeInitialPositions(new Map());
      setAlignmentGuides([]); // Reset visual guidelines
      pushHistoryState(shapes);
    }

    if (isDrawing) {
      setIsDrawing(false);
      
      // Cleanup negative size boxes
      if (drawingShapeId) {
        const finalShapes = shapes.map(s => {
          if (s.id === drawingShapeId) {
            let finalX = s.x;
            let finalY = s.y;
            let finalW = s.width;
            let finalH = s.height;
            
            if (finalW < 0) {
              finalX = finalX + finalW;
              finalW = Math.abs(finalW);
            }
            if (finalH < 0) {
              finalY = finalY + finalH;
              finalH = Math.abs(finalH);
            }

            return {
              ...s,
              x: finalX,
              y: finalY,
              width: finalW,
              height: finalH
            };
          }
          return s;
        });

        // Auto selection text edit on creation
        const newCreatedShape = finalShapes.find(s => s.id === drawingShapeId);
        setShapes(finalShapes);
        pushHistoryState(finalShapes);
        setDrawingShapeId(null);
        
        if (newCreatedShape && (newCreatedShape.type === 'text' || newCreatedShape.type === 'sticky')) {
          setSelectedIds([newCreatedShape.id]);
          startTextEditing(newCreatedShape);
        } else if (newCreatedShape) {
          setSelectedIds([newCreatedShape.id]);
        }
      }
      
      // Reset back to select tool for non-freehand draw actions
      if (activeTool !== 'freehand') {
        setActiveTool('select');
      }
    }
  };

  // --- Render HTML5 Canvas Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear background based on theme
    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // 2. Viewport Transform (Pan & Zoom)
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // 3. Draw Grid
    const gridSize = 20;
    const w = canvas.width;
    const h = canvas.height;

    const startX = Math.floor(-viewport.x / viewport.zoom / gridSize) * gridSize;
    const startY = Math.floor(-viewport.y / viewport.zoom / gridSize) * gridSize;
    const endX = startX + w / viewport.zoom + gridSize;
    const endY = startY + h / viewport.zoom + gridSize;

    ctx.strokeStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 0.5;

    // Infinite grid dots or lines (dots look modern)
    ctx.fillStyle = theme === 'dark' ? '#334155' : '#cbd5e1';
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 4. Render All Drawing Shapes
    shapes.forEach(shape => {
      ctx.save();

      // Try custom renderers first (for developer template shapes)
      if (renderCustomShape(ctx, shape, theme)) {
        ctx.restore();
        return;
      }
      
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.fillColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const x = shape.x;
      const y = shape.y;
      const width = shape.width;
      const height = shape.height;

      switch (shape.type) {
        case 'freehand':
          if (shape.points && shape.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (shape.fillColor !== 'transparent') {
            ctx.fillRect(x, y, width, height);
          }
          ctx.strokeRect(x, y, width, height);
          break;

        case 'circle':
          ctx.beginPath();
          ctx.ellipse(
            x + width / 2,
            y + height / 2,
            Math.abs(width / 2),
            Math.abs(height / 2),
            0, 0, 2 * Math.PI
          );
          if (shape.fillColor !== 'transparent') {
            ctx.fill();
          }
          ctx.stroke();
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width, y + height);
          ctx.stroke();
          break;

        case 'arrow':
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width, y + height);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(height, width);
          const headLength = 12;
          ctx.beginPath();
          ctx.moveTo(x + width, y + height);
          ctx.lineTo(
            x + width - headLength * Math.cos(angle - Math.PI / 6),
            y + height - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x + width - headLength * Math.cos(angle + Math.PI / 6),
            y + height - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = shape.color;
          ctx.fill();
          break;

        case 'text':
          // Hide text when editing inline to avoid double rendering
          if (editingTextId !== shape.id) {
            ctx.fillStyle = shape.color;
            ctx.font = `${shape.fontStyle || ''} ${shape.fontSize || 16}px Inter, sans-serif`;
            ctx.textBaseline = 'top';
            
            // Simple text wrapping inside bounding box width
            const words = (shape.text || '').split(' ');
            let line = '';
            let currentY = y;
            const maxWidth = width > 20 ? width : 200;
            const lineHeight = (shape.fontSize || 16) * 1.25;

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x, currentY);
          }
          break;

        case 'sticky':
          // Hide Sticky text while editing inline
          ctx.fillStyle = shape.fillColor || '#fef08a';
          ctx.fillRect(x, y, width, height);

          // Subtle shadow / borders
          ctx.strokeStyle = '#d97706'; // darker yellow
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, width, height);

          if (editingTextId !== shape.id && shape.text) {
            ctx.fillStyle = '#1e293b'; // Slate 800 for stickies
            ctx.font = `600 ${shape.fontSize || 16}px Inter, sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';

            // Wrap text inside sticky note bounds
            const textX = x + width / 2;
            const textY = y + height / 2;
            const lines: string[] = [];
            const words = shape.text.split(' ');
            let currentLine = '';
            const padding = 15;
            const maxW = width - padding * 2;
            
            for (let word of words) {
              const test = currentLine + word + ' ';
              if (ctx.measureText(test).width > maxW) {
                lines.push(currentLine);
                currentLine = word + ' ';
              } else {
                currentLine = test;
              }
            }
            lines.push(currentLine);

            const stickyLineHeight = (shape.fontSize || 16) * 1.25;
            const totalTextHeight = lines.length * stickyLineHeight;
            let startTextY = textY - totalTextHeight / 2 + stickyLineHeight / 2;

            lines.forEach((l, idx) => {
              ctx.fillText(l.trim(), textX, startTextY + idx * stickyLineHeight);
            });
          }
          break;

        case 'connector':
          // Connectors resolve dynamic shape endpoints
          let startPt = shape.connectorStartPoint || { x: shape.x, y: shape.y };
          if (shape.connectorStartShapeId) {
            const connected = shapes.find(s => s.id === shape.connectorStartShapeId);
            if (connected) {
              startPt = {
                x: connected.x + connected.width / 2,
                y: connected.y + connected.height / 2
              };
            }
          }

          let endPt = shape.connectorEndPoint || { x: shape.x + shape.width, y: shape.y + shape.height };
          if (shape.connectorEndShapeId) {
            const connected = shapes.find(s => s.id === shape.connectorEndShapeId);
            if (connected) {
              endPt = {
                x: connected.x + connected.width / 2,
                y: connected.y + connected.height / 2
              };
            }
          }

          ctx.beginPath();
          ctx.moveTo(startPt.x, startPt.y);
          ctx.lineTo(endPt.x, endPt.y);
          ctx.stroke();

          // Arrow head at endpoint
          const connAngle = Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x);
          const connArrowLength = 10;
          ctx.beginPath();
          ctx.moveTo(endPt.x, endPt.y);
          ctx.lineTo(
            endPt.x - connArrowLength * Math.cos(connAngle - Math.PI / 6),
            endPt.y - connArrowLength * Math.sin(connAngle - Math.PI / 6)
          );
          ctx.lineTo(
            endPt.x - connArrowLength * Math.cos(connAngle + Math.PI / 6),
            endPt.y - connArrowLength * Math.sin(connAngle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = shape.color;
          ctx.fill();
          break;
      }
      ctx.restore();
    });

    // 5. Draw Alignment Guides (Visual indicators during alignment snapping)
    alignmentGuides.forEach(guide => {
      ctx.save();
      ctx.strokeStyle = '#ef4444'; // Red guides
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);

      ctx.beginPath();
      if (guide.type === 'v') {
        ctx.moveTo(guide.coord, guide.start);
        ctx.lineTo(guide.coord, guide.end);
      } else {
        ctx.moveTo(guide.start, guide.coord);
        ctx.lineTo(guide.end, guide.coord);
      }
      ctx.stroke();
      ctx.restore();
    });

    // 6. Selection Bounding Box & Handles
    selectedIds.forEach(id => {
      const shape = shapes.find(s => s.id === id);
      if (!shape) return;

      const x = shape.x;
      const y = shape.y;
      const w = shape.width;
      const h = shape.height;

      ctx.save();
      ctx.strokeStyle = '#3b82f6'; // Blue selection border
      ctx.lineWidth = 1.5 / viewport.zoom;
      ctx.setLineDash([3 / viewport.zoom, 3 / viewport.zoom]);
      ctx.strokeRect(x, y, w, h);

      // Draw resize handles (only if single selection)
      if (selectedIds.length === 1) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5 / viewport.zoom;

        const size = 8 / viewport.zoom;
        const offset = size / 2;

        const handles = [
          { x, y }, // tl
          { x: x + w / 2, y }, // tc
          { x: x + w, y }, // tr
          { x, y: y + h / 2 }, // ml
          { x: x + w, y: y + h / 2 }, // mr
          { x, y: y + h }, // bl
          { x: x + w / 2, y: y + h }, // bc
          { x: x + w, y: y + h } // br
        ];

        handles.forEach(pt => {
          ctx.fillRect(pt.x - offset, pt.y - offset, size, size);
          ctx.strokeRect(pt.x - offset, pt.y - offset, size, size);
        });
      }
      ctx.restore();
    });

    // 7. Active Multi-selection Box
    if (isSelecting) {
      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'; // Blue selection tint
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1 / viewport.zoom;
      
      const x = selectionBoxStart.x;
      const y = selectionBoxStart.y;
      const w = selectionBoxCurrent.x - selectionBoxStart.x;
      const h = selectionBoxCurrent.y - selectionBoxStart.y;
      
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    ctx.restore(); // Restore zoom/pan scaling

    // 8. Render Floating Minimap
    renderMinimap();

  }, [shapes, selectedIds, viewport, isSelecting, selectionBoxStart, selectionBoxCurrent, theme, alignmentGuides]);

  // --- Render Minimap logic ---
  const renderMinimap = () => {
    const minimap = minimapCanvasRef.current;
    const canvas = canvasRef.current;
    if (!minimap || !canvas || shapes.length === 0) return;
    const mctx = minimap.getContext('2d');
    if (!mctx) return;

    const mw = minimap.width;
    const mh = minimap.height;

    // Clear minimap
    mctx.fillStyle = theme === 'dark' ? '#1e293b' : '#cbd5e1';
    mctx.fillRect(0, 0, mw, mh);

    // 1. Calculate boundaries containing all shapes + viewport bounds
    let minX = -viewport.x / viewport.zoom;
    let minY = -viewport.y / viewport.zoom;
    let maxX = (canvas.width - viewport.x) / viewport.zoom;
    let maxY = (canvas.height - viewport.y) / viewport.zoom;

    shapes.forEach(s => {
      minX = Math.min(minX, s.x, s.x + s.width);
      maxX = Math.max(maxX, s.x, s.x + s.width);
      minY = Math.min(minY, s.y, s.y + s.height);
      maxY = Math.max(maxY, s.y, s.y + s.height);
    });

    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const totalW = maxX - minX;
    const totalH = maxY - minY;

    // Scale to fit minimap size
    const scale = Math.min(mw / totalW, mh / totalH);
    const offsetX = (mw - totalW * scale) / 2;
    const offsetY = (mh - totalH * scale) / 2;

    const toMiniX = (cx: number) => offsetX + (cx - minX) * scale;
    const toMiniY = (cy: number) => offsetY + (cy - minY) * scale;

    // 2. Draw miniature shapes
    shapes.forEach(s => {
      mctx.fillStyle = theme === 'dark' ? '#64748b' : '#94a3b8';
      const sx = toMiniX(s.x);
      const sy = toMiniY(s.y);
      const sw = s.width * scale;
      const sh = s.height * scale;
      
      if (s.type === 'circle') {
        mctx.beginPath();
        mctx.arc(sx + sw / 2, sy + sh / 2, Math.abs(sw / 2), 0, 2 * Math.PI);
        mctx.fill();
      } else {
        mctx.fillRect(sx, sy, sw, sh);
      }
    });

    // 3. Draw active viewport window bounds
    const vx = toMiniX(-viewport.x / viewport.zoom);
    const vy = toMiniY(-viewport.y / viewport.zoom);
    const vw = (canvas.width / viewport.zoom) * scale;
    const vh = (canvas.height / viewport.zoom) * scale;

    mctx.strokeStyle = '#ef4444'; // Red viewport rectangle
    mctx.lineWidth = 1.5;
    mctx.strokeRect(vx, vy, vw, vh);
  };

  // Sync Input positions when zoom or pan occurs
  useEffect(() => {
    if (editingTextId !== null) {
      const shape = shapes.find(s => s.id === editingTextId);
      if (shape) {
        setEditingTextPos({
          x: shape.x * viewport.zoom + viewport.x,
          y: shape.y * viewport.zoom + viewport.y,
          w: shape.width * viewport.zoom,
          h: shape.height * viewport.zoom
        });
      }
    }
  }, [viewport, editingTextId, shapes]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex-grow overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full block touch-none"
      />

      {/* Floating Minimap (only shows when shapes exist) */}
      {shapes.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-slate-800/80 dark:bg-slate-950/80 border border-slate-700/50 backdrop-blur rounded-lg p-1.5 shadow-xl select-none pointer-events-none z-10">
          <canvas
            ref={minimapCanvasRef}
            width={160}
            height={100}
            className="rounded opacity-90 block"
          />
        </div>
      )}

      {/* Text Editing Textarea Overlay */}
      {editingTextId !== null && (
        <textarea
          ref={textInputRef}
          value={editingTextValue}
          onChange={e => setEditingTextValue(e.target.value)}
          onBlur={finishTextEditing}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              finishTextEditing();
            }
            if (e.key === 'Escape') {
              finishTextEditing();
            }
          }}
          style={{
            position: 'absolute',
            left: `${editingTextPos.x}px`,
            top: `${editingTextPos.y}px`,
            width: `${Math.max(editingTextPos.w, 150)}px`,
            height: `${Math.max(editingTextPos.h, 60)}px`,
            fontSize: `${fontSize * viewport.zoom}px`,
            fontFamily: 'Inter, sans-serif',
            color: shapes.find(s => s.id === editingTextId)?.type === 'sticky' ? '#1e293b' : (theme === 'dark' ? '#f8fafc' : '#0f172a'),
            background: shapes.find(s => s.id === editingTextId)?.type === 'sticky' ? '#fef08a' : 'rgba(59, 130, 246, 0.05)',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            padding: '4px',
            zIndex: 20,
            lineHeight: 1.25
          }}
        />
      )}
    </div>
  );
};
