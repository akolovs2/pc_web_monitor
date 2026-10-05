import React from "react";

interface Props {
  id: string;
  linePath: string;
  areaPath: string;
  yTicks: { y: number }[];
  activeX?: number;
  padLeft: number;
  chartW: number;
  viewW?: number;
  viewH?: number;
  padTop?: number;
  chartH?: number;
  strokeColor?: string;
  fillColor?: string;
  gridStroke?: string;
}

export const ChartCanvas: React.FC<Props> = React.memo(({
  id,
  linePath,
  areaPath,
  yTicks,
  activeX,
  padLeft,
  chartW,
  viewW = 800,
  viewH = 240,
  padTop = 20,
  chartH = 184,
  strokeColor = "#3b82f6",
  fillColor = "#3b82f6",
  gridStroke = "rgba(148, 163, 184, 0.12)",
}) => {
  const gradientId = `${id}-gradient`;
  const clipId = `${id}-clip`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.45" />
            <stop offset="75%" stopColor={fillColor} stopOpacity="0.10" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={padLeft} y={padTop} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map(({ y }, i) => (
          <line
            key={i}
            x1={padLeft}
            y1={y}
            x2={padLeft + chartW}
            y2={y}
            stroke={gridStroke}
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}

        {/* Vertical cursor indicator line */}
        {activeX !== undefined && (
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={padTop + chartH}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.6"
          />
        )}

        {/* Area fill path with gradient */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            clipPath={`url(#${clipId})`}
            className="transition-opacity duration-300"
          />
        )}

        {/* Line curve path */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#${clipId})`}
            className="transition-all duration-300"
          />
        )}
      </svg>
    </div>
  );
});

ChartCanvas.displayName = "ChartCanvas";

export default ChartCanvas;
