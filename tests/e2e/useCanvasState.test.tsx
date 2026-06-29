/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CanvasProvider, useCanvas } from '../../src/hooks/useCanvasState';

describe('useCanvasState hook tests', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CanvasProvider>{children}</CanvasProvider>
  );

  it('should initialize with default state values', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    expect(result.current.shapes).toEqual([]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.viewport).toEqual({ x: 0, y: 0, zoom: 1.0 });
    expect(result.current.activeTool).toBe('select');
    expect(result.current.theme).toBe('dark');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should support adding and updating a shape', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.addShape({
        type: 'rectangle',
        x: 100,
        y: 150,
        width: 80,
        height: 60,
        color: '#ff0000',
        fillColor: 'transparent',
        strokeWidth: 2,
        fontSize: 16,
        text: ''
      });
    });

    expect(id).toBeDefined();
    expect(id).toMatch(/^shape_/);
    expect(result.current.shapes.length).toBe(1);
    expect(result.current.shapes[0]).toEqual({
      id,
      type: 'rectangle',
      x: 100,
      y: 150,
      width: 80,
      height: 60,
      color: '#ff0000',
      fillColor: 'transparent',
      strokeWidth: 2,
      fontSize: 16,
      text: ''
    });

    // Update the shape
    act(() => {
      result.current.updateShape(id, { x: 120, y: 170, color: '#00ff00' });
    });

    expect(result.current.shapes[0].x).toBe(120);
    expect(result.current.shapes[0].y).toBe(170);
    expect(result.current.shapes[0].color).toBe('#00ff00');
  });

  it('should support selection, grouping, and ungrouping shapes', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let id1 = '';
    let id2 = '';

    act(() => {
      id1 = result.current.addShape({
        type: 'rectangle',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        color: '#000',
        fillColor: 'transparent',
        strokeWidth: 1,
        fontSize: 12,
        text: ''
      });
    });
    act(() => {
      id2 = result.current.addShape({
        type: 'circle',
        x: 200,
        y: 200,
        width: 50,
        height: 50,
        color: '#000',
        fillColor: 'transparent',
        strokeWidth: 1,
        fontSize: 12,
        text: ''
      });
    });

    // Select shape 1
    act(() => {
      result.current.setSelectedIds([id1]);
    });
    expect(result.current.selectedIds).toEqual([id1]);

    // Group selected shapes (fails with < 2 elements selected)
    act(() => {
      result.current.groupSelected();
    });
    expect(result.current.shapes[0].groupId).toBeUndefined();

    // Select both shapes
    act(() => {
      result.current.setSelectedIds([id1, id2]);
    });
    expect(result.current.selectedIds).toContain(id1);
    expect(result.current.selectedIds).toContain(id2);

    // Group them
    act(() => {
      result.current.groupSelected();
    });
    
    const shape1 = result.current.shapes.find(s => s.id === id1)!;
    const shape2 = result.current.shapes.find(s => s.id === id2)!;
    expect(shape1.groupId).toBeDefined();
    expect(shape2.groupId).toBeDefined();
    expect(shape1.groupId).toBe(shape2.groupId);

    // Selecting one shape in group automatically expands selection to include all shapes in group
    act(() => {
      result.current.setSelectedIds([id1]);
    });
    expect(result.current.selectedIds).toContain(id1);
    expect(result.current.selectedIds).toContain(id2);

    // Ungroup selected
    act(() => {
      result.current.ungroupSelected();
    });
    expect(result.current.shapes.find(s => s.id === id1)!.groupId).toBeUndefined();
    expect(result.current.shapes.find(s => s.id === id2)!.groupId).toBeUndefined();
  });

  it('should support undo and redo operations', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.addShape({
        type: 'rectangle',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        color: '#000',
        fillColor: 'transparent',
        strokeWidth: 1,
        fontSize: 12,
        text: ''
      });
    });

    expect(result.current.shapes.length).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Undo the addShape operation
    act(() => {
      result.current.undo();
    });

    expect(result.current.shapes.length).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    // Redo the addShape operation
    act(() => {
      result.current.redo();
    });

    expect(result.current.shapes.length).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });
});
