'use client';

import { Detection } from '@/types/detection';

interface BoundingBoxOverlayProps {
  detections: Detection[];
  videoWidth: number;
  videoHeight: number;
}

// Color palette for different classes
const COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#007AFF', // Blue
  '#5856D6', // Purple
  '#AF52DE', // Violet
  '#FF2D55', // Pink
  '#A2845E', // Brown
];

function getColorForClass(classId: number): string {
  return COLORS[classId % COLORS.length];
}

export function BoundingBoxOverlay({
  detections,
  videoWidth,
  videoHeight,
}: BoundingBoxOverlayProps) {
  if (!videoWidth || !videoHeight) return null;

  return (
    <svg
      className="detection-canvas"
      viewBox={`0 0 ${videoWidth} ${videoHeight}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {detections.map((detection, index) => {
        const color = getColorForClass(detection.classId);
        const confidencePercent = Math.round(detection.confidence * 100);

        return (
          <g key={index}>
            {/* Bounding box */}
            <rect
              x={detection.x}
              y={detection.y}
              width={detection.width}
              height={detection.height}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Label background */}
            <rect
              x={detection.x}
              y={detection.y - 28}
              width={Math.max(detection.label.length * 10 + 50, 80)}
              height={26}
              fill={color}
              rx={4}
              ry={4}
            />

            {/* Label text */}
            <text
              x={detection.x + 6}
              y={detection.y - 10}
              fill="white"
              fontSize={16}
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {detection.label} {confidencePercent}%
            </text>

            {/* Corner accents for better visibility */}
            <CornerAccents
              x={detection.x}
              y={detection.y}
              width={detection.width}
              height={detection.height}
              color={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

interface CornerAccentsProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

function CornerAccents({ x, y, width, height, color }: CornerAccentsProps) {
  const cornerLength = Math.min(20, width / 4, height / 4);
  const strokeWidth = 4;

  return (
    <g stroke={color} strokeWidth={strokeWidth} fill="none">
      {/* Top-left corner */}
      <path d={`M ${x} ${y + cornerLength} L ${x} ${y} L ${x + cornerLength} ${y}`} />

      {/* Top-right corner */}
      <path
        d={`M ${x + width - cornerLength} ${y} L ${x + width} ${y} L ${x + width} ${y + cornerLength}`}
      />

      {/* Bottom-left corner */}
      <path
        d={`M ${x} ${y + height - cornerLength} L ${x} ${y + height} L ${x + cornerLength} ${y + height}`}
      />

      {/* Bottom-right corner */}
      <path
        d={`M ${x + width - cornerLength} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - cornerLength}`}
      />
    </g>
  );
}
