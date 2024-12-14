"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './Canvas';
import {
    ANIMATION_DURATION,
    EXIT_DURATION,
    ZOOM_TRANSITION_DURATION,
    HOVER_SCALE,
    SELECTED_SCALE,
    DEFAULT_ZOOM,
    SELECTED_ZOOM,
    BASE_OPACITY,
    HOVER_OPACITY,
    SELECTED_OPACITY,
    OPACITY_DELTA
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

type InfiniteGridProps = {
    hashes: string[];
    size: number;
    scale: number;
    opacity: number;
    selectedCell: HoverData;
    cellSize: number;
    padding: number;
    scaleFactor: number;
    onCellHover: (hoverData: HoverData) => void;
    onCellClick: (hoverData: HoverData) => void;
    popupHeight?: number;
};

const easeOutElastic = (x: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0
        ? 0
        : x === 1
            ? 1
            : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
};

const smoothStep = (x: number): number => {
    return x < 0.5
        ? 4 * x * x * x
        : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

const lerp = (start: number, end: number, factor: number, easingType: 'smooth' | 'elastic' = 'smooth') => {
    let t;
    if (easingType === 'elastic') {
        t = easeOutElastic(factor);
    } else {
        t = smoothStep(factor);
    }
    return start + (end - start) * t;
};

const InfiniteGrid: React.FC<InfiniteGridProps> = (props) => {
    const [offset, setOffset] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [zoom, setZoom] = useState(1);
    const [targetZoom, setTargetZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const gridRef = useRef<HTMLDivElement>(null);
    const targetOffsetRef = useRef(offset);
    const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
    const isDragClick = useRef(false);
    const [pixelRatio, setPixelRatio] = useState(1);
    const [hoverAnimations, setHoverAnimations] = useState<HoverAnimation[]>([]);
    const [selectedAnim, setSelectedAnim] = useState<HoverAnimation | null>(null);
    const animationFrameRef = useRef<number>();

    const zoomRef = useRef(zoom);
    const offsetRef = useRef(offset);

    useEffect(() => {
        let rafId: number;
        let startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const duration = props.selectedCell ? 2000 : 1600;
            
            let progress = Math.min(elapsed / duration, 1);
            const easedProgress = smoothStep(progress);

            const newZoom = lerp(
                zoomRef.current,
                targetZoom,
                easedProgress,
                'smooth'
            );

            const newOffset = {
                x: lerp(offsetRef.current.x, targetOffsetRef.current.x, easedProgress, 'smooth'),
                y: lerp(offsetRef.current.y, targetOffsetRef.current.y, easedProgress, 'smooth'),
            };

            zoomRef.current = newZoom;
            offsetRef.current = newOffset;

            setZoom(newZoom);
            setOffset(newOffset);

            if (progress < 1) {
                rafId = requestAnimationFrame(animate);
            }
        };

        rafId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [targetZoom, props.selectedCell]);

    useEffect(() => {
        let lastFrameTime = 0;
        const fpsInterval = 1000 / 60; // 60 fps

        const updateAnimation = (timestamp: number) => {
            if (timestamp - lastFrameTime < fpsInterval) {
                animationFrameRef.current = requestAnimationFrame(updateAnimation);
                return;
            }
            lastFrameTime = timestamp;

            setHoverAnimations(prevAnimations => {
                if (prevAnimations.length === 0) return prevAnimations;

                return prevAnimations
                    .map(anim => {
                        const duration = anim.isExiting ? EXIT_DURATION : ANIMATION_DURATION;
                        const progress = Math.min(1, (timestamp - anim.startTime) / duration);

                        const easeProgress = progress;

                        const targetScale = anim.isSelected ? SELECTED_SCALE : 1.0;
                        const newScale = anim.isExiting
                            ? 1.0 + ((HOVER_SCALE - 1.0) * (1 - easeProgress))
                            : 1.0 + ((HOVER_SCALE - 1.0) * easeProgress);

                        const newOpacity = anim.isExiting
                            ? HOVER_OPACITY - (OPACITY_DELTA * easeProgress)  // Fade from 1.0 to 0.5
                            : BASE_OPACITY + (OPACITY_DELTA * easeProgress);  // Fade from 0.5 to 1.0

                        if (anim.isExiting && progress >= 1) return null;

                        return { ...anim, scale: newScale, opacity: newOpacity };
                    })
                    .filter(Boolean) as HoverAnimation[];
            });

            animationFrameRef.current = requestAnimationFrame(updateAnimation);
        };

        animationFrameRef.current = requestAnimationFrame(updateAnimation);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y });
        setDragStartPosition({ x: e.clientX, y: e.clientY });
        isDragClick.current = true;
    }, []);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isDragging) {
                const dragDistance = Math.sqrt(
                    Math.pow(e.clientX - dragStartPosition.x, 2) + 
                    Math.pow(e.clientY - dragStartPosition.y, 2)
                );

                if (dragDistance > 5) {
                    isDragClick.current = false;
                }

                const newOffset = {
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                };
                
                setOffset(newOffset);
                targetOffsetRef.current = newOffset;
                offsetRef.current = newOffset;
                return;
            }

            const rect = gridRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = (e.clientX - rect.left - offset.x) / zoom;
            const mouseY = (e.clientY - rect.top - offset.y) / zoom;
            const totalCellSize = props.cellSize + props.padding;

            const col = Math.floor(mouseX / totalCellSize);
            const row = Math.floor(mouseY / totalCellSize);

            const isSelectedCell = props.selectedCell?.row === row && props.selectedCell?.col === col;

            setHoverAnimations(prev => {
                const updatedAnimations = prev
                    .map(anim => {
                        if (anim.row === props.selectedCell?.row && anim.col === props.selectedCell?.col) {
                            return { ...anim, opacity: 1.0 };
                        }
                        if ((anim.row !== row || anim.col !== col) && !anim.isExiting) {
                            return {
                                ...anim,
                                isExiting: true,
                                startTime: performance.now()
                            };
                        }
                        return anim;
                    })
                    .filter(anim => {
                        const distance = Math.abs(anim.row - row) + Math.abs(anim.col - col);
                        return distance <= 100 || !anim.isExiting;
                    });

                const existingAnim = updatedAnimations.find(
                    anim => anim.row === row && anim.col === col && !anim.isExiting
                );

                if (!existingAnim && !isSelectedCell) {
                    updatedAnimations.push({
                        row,
                        col,
                        scale: 1,
                        opacity: BASE_OPACITY,
                        startTime: performance.now(),
                    });
                }

                return updatedAnimations;
            });
        },
        [isDragging, offset, zoom, props.cellSize, props.padding, props.selectedCell]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoverAnimations(prev =>
            prev.map(anim => {
                if (anim.row === props.selectedCell?.row && anim.col === props.selectedCell?.col) {
                    return { ...anim, opacity: 1.0 };
                }
                if (!anim.isExiting) {
                    return { ...anim, isExiting: true, startTime: performance.now() };
                }
                return anim;
            })
        );
        setIsDragging(false);
    }, [props.selectedCell]);

    const handleWheel = useCallback(
        (e: WheelEvent) => {
            if (props.selectedCell) return;
            
            e.preventDefault();

            const zoomSensitivity = 0.002;
            const rect = gridRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = -e.deltaY * zoomSensitivity;
            const newZoom = Math.max(0.1, Math.min(5, zoom * (1 + delta)));

            const zoomFactor = newZoom / zoom;

            const newOffset = {
                x: mouseX - zoomFactor * (mouseX - offset.x),
                y: mouseY - zoomFactor * (mouseY - offset.y),
            };

            setZoom(newZoom);
            setOffset(newOffset);
            zoomRef.current = newZoom;
            offsetRef.current = newOffset;
            targetOffsetRef.current = newOffset;
            setTargetZoom(newZoom);
        },
        [zoom, offset, props.selectedCell]
    );

    useEffect(() => {
        const element = gridRef.current;
        if (!element) return;

        element.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            element.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    useEffect(() => {
        const updatePixelRatio = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            setPixelRatio(ratio);
        };

        updatePixelRatio();
        window.addEventListener('resize', updatePixelRatio);

        return () => {
            window.removeEventListener('resize', updatePixelRatio);
        };
    }, []);

    useEffect(() => {
        if (props.selectedCell) {
            setSelectedAnim({
                row: props.selectedCell.row,
                col: props.selectedCell.col,
                scale: 1,
                opacity: 1,
                startTime: performance.now(),
                isSelected: true
            });
        } else {
            setSelectedAnim(null);
        }
    }, [props.selectedCell]);

    useEffect(() => {
        if (props.selectedCell) {
            const cellX = props.selectedCell.col * (props.cellSize + props.padding);
            const cellY = props.selectedCell.row * (props.cellSize + props.padding);
            
            const viewportHeight = window.innerHeight - (props.popupHeight || 0);
            const viewportWidth = window.innerWidth;

            setTargetZoom(SELECTED_ZOOM);

            const targetOffset = {
                x: viewportWidth / 2 - cellX * SELECTED_ZOOM - (props.cellSize * SELECTED_ZOOM) / 2,
                y: viewportHeight / 2 - cellY * SELECTED_ZOOM - (props.cellSize * SELECTED_ZOOM) / 2 - 40
            };

            targetOffsetRef.current = targetOffset;
        } else {
            setTargetZoom(DEFAULT_ZOOM);
            
            const targetOffset = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
            targetOffsetRef.current = targetOffset;
        }
    }, [props.selectedCell, props.cellSize, props.padding, props.popupHeight]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - offsetRef.current.x,
                y: e.touches[0].clientY - offsetRef.current.y
            });
            setDragStartPosition({
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            });
            isDragClick.current = true;
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (isDragging && e.touches.length === 1) {
            const newOffset = {
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y,
            };
            setOffset(newOffset);
            targetOffsetRef.current = newOffset;
            offsetRef.current = newOffset;
        }
    }, [isDragging, dragStart]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        setIsDragging(false);
    }, []);

    // Add touch event listeners
    useEffect(() => {
        const element = gridRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart);
        element.addEventListener('touchmove', handleTouchMove);
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return (
        <div
            ref={gridRef}
            id="infinite-grid"
            className="w-full h-screen fixed inset-0 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            <Canvas
                {...props}
                offset={offset}
                zoom={zoom}
                pixelRatio={pixelRatio}
                hoverAnimations={hoverAnimations}
                onCellHover={(hoverData) => {
                    props.onCellHover(hoverData)
                }}
                onCellClick={(selectedData) => {
                    if (isDragClick.current) {
                        props.onCellClick(selectedData)
                    }
                }}
            />
        </div>
    );
};

export default InfiniteGrid; 