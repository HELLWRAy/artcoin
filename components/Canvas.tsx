import React, { useEffect, useRef } from 'react';
import { drawArt, renderedPNGsBlobUrls } from './artDesign2';
import {
    BASE_OPACITY,
    HOVER_OPACITY,
    SELECTED_OPACITY
} from './constants';

type HoverData = {
    hash: string;
    row: number;
    col: number;
    seed: string;
  } | null;
  
type HoverAnimation = {
  row: number;
  col: number;
  scale: number;
  opacity: number;
  startTime: number;
  isExiting?: boolean;
  isSelected?: boolean;
};
  

type CanvasProps = {
  hashes: string[];
  size: number;
  scale: number;
  opacity: number;
  selectedCell: { row: number, col: number } | null;
  cellSize: number;
  padding: number;
  scaleFactor: number;
  offset: { x: number; y: number };
  zoom: number;
  onCellHover: (hoverData: HoverData) => void;
  onCellClick: (hoverData: HoverData) => void;
  pixelRatio: number;
  hoverAnimations: HoverAnimation[];
};

const generatePseudoRandomIndex = (row: number, col: number, length: number): number => {
  const prime1 = 31;
  const prime2 = 37;
  const hash = Math.abs((row * prime1) ^ (col * prime2));
  return hash % length;
};

const Canvas: React.FC<CanvasProps> = ({
  hashes,
  size,
  scale,
  opacity,
  selectedCell,
  cellSize,
  padding,
  scaleFactor,
  offset,
  zoom,
  onCellHover,
  onCellClick,
  pixelRatio,
  hoverAnimations,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth * pixelRatio;
    const height = canvas.clientHeight * pixelRatio;
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const totalCellSize = cellSize + padding;
    const startCol = Math.floor(-offset.x / (totalCellSize * zoom)) - 2;
    const startRow = Math.floor(-offset.y / (totalCellSize * zoom)) - 2;
    const endCol = startCol + Math.ceil(canvas.width / (totalCellSize * zoom)) + 4;
    const endRow = startRow + Math.ceil(canvas.height / (totalCellSize * zoom)) + 4;

    // Create a list of all cells to render
    const cellsToRender = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const isHovered = hoverAnimations.some(anim => anim.row === row && anim.col === col);
        cellsToRender.push({ row, col, isHovered });
      }
    }

    // Sort cells so hovered cells are rendered last
    cellsToRender.sort((a, b) => {
      const isSelectedA = selectedCell && selectedCell.row === a.row && selectedCell.col === a.col;
      const isSelectedB = selectedCell && selectedCell.row === b.row && selectedCell.col === b.col;
      
      // If either cell is hovered, it should be rendered last
      if (a.isHovered !== b.isHovered) {
        return a.isHovered ? 1 : -1;  // Hovered cells always go last
      }
      
      // If both cells are hovered or not hovered, selected cell takes precedence
      if (isSelectedA !== isSelectedB) {
        return isSelectedA ? 1 : -1;
      }
      
      return 0;
    });

    // Render cells in sorted order
    for (const cell of cellsToRender) {
      const { row, col } = cell;
      const index = generatePseudoRandomIndex(row, col, hashes.length);
      const x = col * totalCellSize;
      const y = row * totalCellSize;

      const hoverAnim = hoverAnimations.find(h => h.row === row && h.col === col);
      
      ctx.save();
      if (hoverAnim) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        
        // Add slight rotation for more dynamic feel
        if (!hoverAnim.isExiting) {
          const rotationAmount = 0.01 * Math.sin(performance.now() / 1000);
          ctx.translate(centerX, centerY);
          ctx.rotate(rotationAmount);
          ctx.translate(-centerX, -centerY);
        }
        
        ctx.translate(centerX, centerY);
        ctx.scale(hoverAnim.scale, hoverAnim.scale);
        ctx.translate(-centerX, -centerY);
      }

      drawArt(
        ctx,
        x,
        y,
        size,
        hashes[index],
        hoverAnim ? hoverAnim.opacity : BASE_OPACITY,  // Use the constant here
        scale,
        selectedCell,
        cellSize,
        padding,
        scaleFactor
      );

      ctx.restore();
    }

    ctx.restore();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - offset.x) / zoom;
      const mouseY = (e.clientY - rect.top - offset.y) / zoom;

      const col = Math.floor(mouseX / totalCellSize);
      const row = Math.floor(mouseY / totalCellSize);
      
      const index = generatePseudoRandomIndex(row, col, hashes.length);
      const hash = hashes[index];
      const artData = renderedPNGsBlobUrls[hash];

      const hoverData: HoverData = {
        hash,
        row,
        col,
        seed: hash
      };

      onCellHover(hoverData);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - offset.x) / zoom;
      const mouseY = (e.clientY - rect.top - offset.y) / zoom;

      const col = Math.floor(mouseX / totalCellSize);
      const row = Math.floor(mouseY / totalCellSize);

      const index = generatePseudoRandomIndex(row, col, hashes.length);
      const hash = hashes[index];

      const hoverData: HoverData = {
        hash,
        row,
        col,
        seed: hash
      };

      onCellClick(hoverData);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [hashes, size, scale, opacity, selectedCell, cellSize, padding, scaleFactor, offset, zoom, onCellHover, onCellClick, pixelRatio, hoverAnimations]);

  return <canvas 
    ref={canvasRef}
    style={{
      width: '100%',
      height: '100%'
    }}
  />;
};

export default Canvas; 