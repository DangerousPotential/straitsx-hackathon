"use client";

import { useEffect, useRef } from "react";

type DotGridProps = {
  activeColor?: string;
  baseColor?: string;
  className?: string;
  dotSize?: number;
  gap?: number;
  proximity?: number;
};

type Dot = { x: number; y: number };

function hexToRgb(hex: string) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  };
}

// Adapted from the React Bits Dot Grid background for AgentLane's lighter visual system.
export function DotGrid({
  activeColor = "#8eac35",
  baseColor = "#c3d0c3",
  className = "",
  dotSize = 1.4,
  gap = 30,
  proximity = 130,
}: DotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const base = hexToRgb(baseColor);
    const active = hexToRgb(activeColor);
    const pointer = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    let dots: Dot[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    const rebuild = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      for (let y = gap / 2; y < height; y += gap) {
        for (let x = gap / 2; x < width; x += gap) dots.push({ x, y });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;

      for (const dot of dots) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const influence = reducedMotion ? 0 : Math.max(0, 1 - distance / proximity);
        const safeDistance = distance || 1;
        const displacement = influence * 9;
        const x = dot.x + (dx / safeDistance) * displacement;
        const y = dot.y + (dy / safeDistance) * displacement;

        const r = Math.round(base.r + (active.r - base.r) * influence);
        const g = Math.round(base.g + (active.g - base.g) * influence);
        const b = Math.round(base.b + (active.b - base.b) * influence);
        context.beginPath();
        context.arc(x, y, dotSize + influence * 1.25, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.46 + influence * 0.34})`;
        context.fill();
      }

      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      pointer.targetX = -1000;
      pointer.targetY = -1000;
    };

    const resizeObserver = new ResizeObserver(() => {
      rebuild();
      if (reducedMotion) draw();
    });

    rebuild();
    draw();
    resizeObserver.observe(container);
    container.addEventListener("pointermove", handlePointerMove, { passive: true });
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [activeColor, baseColor, dotSize, gap, proximity]);

  return (
    <div ref={containerRef} className={`h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
