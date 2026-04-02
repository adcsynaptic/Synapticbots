import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

export function RegimeGauge({
  size = 160,
  confidence = 0,
  label = 'REGIME',
}: {
  size?: number;
  confidence: number; // 0..100
  label?: string;
}) {
  const stroke = 10;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - stroke;
  const startAngle = 180; // left
  const endAngle = 0; // right

  const pct = Math.max(0, Math.min(100, confidence));
  const needleAngle = startAngle - (startAngle - endAngle) * (pct / 100);
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToX = (r: number, ang: number) => cx + r * Math.cos(toRad(ang));
  const polarToY = (r: number, ang: number) => cy + r * Math.sin(toRad(ang));

  const startX = polarToX(radius, startAngle);
  const startY = polarToY(radius, startAngle);
  const endX = polarToX(radius, endAngle);
  const endY = polarToY(radius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  const path = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;

  const needleX = polarToX(radius - 4, needleAngle);
  const needleY = polarToY(radius - 4, needleAngle);

  return (
    <View>
      <Svg width={size} height={size / 1.1}>
        {/* Background arc */}
        <Path d={path} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        {/* Needle */}
        <Line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#00E5FF" strokeWidth={3} />
        <Circle cx={cx} cy={cy} r={4} fill="#00E5FF" />
        {/* Labels */}
        <SvgText x={cx} y={cy - radius + 24} fontSize={12} fill="#9CA3AF" textAnchor="middle">
          {label}
        </SvgText>
        <SvgText x={cx} y={cy + 18} fontSize={16} fill="#FFFFFF" fontWeight="bold" textAnchor="middle">
          {`${pct.toFixed(0)}%`}
        </SvgText>
      </Svg>
    </View>
  );
}

