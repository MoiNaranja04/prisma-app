import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

interface BarChartProps {
  data: {
    label: string;
    value: number;
  }[];
  height?: number;
  color?: string;
  title?: string;
}

export function BarChart({
  data,
  height = 150,
  color = '#0F5E3C',
  title
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartWidth = 280;
  const barWidth = Math.min(40, (chartWidth - 20) / data.length - 8);
  const chartHeight = height - 40;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <Svg width={chartWidth} height={height}>
        {/* Base line */}
        <Line
          x1={10}
          y1={chartHeight}
          x2={chartWidth - 10}
          y2={chartHeight}
          stroke="#E6E9EF"
          strokeWidth={1}
        />

        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (chartHeight - 20);
          const x = 20 + index * (barWidth + 10);
          const y = chartHeight - barHeight;

          return (
            <React.Fragment key={index}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={color}
              />
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 14}
                fontSize={10}
                fill="#667085"
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
              <SvgText
                x={x + barWidth / 2}
                y={y - 5}
                fontSize={9}
                fill="#667085"
                textAnchor="middle"
              >
                {item.value > 0 ? item.value.toFixed(0) : ''}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

interface PieChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  size?: number;
  title?: string;
}

export function PieChart({ data, size = 150, title }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - 40) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -90;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <Svg width={size} height={size}>
        {data.map((item, index) => {
          const percentage = total > 0 ? item.value / total : 0;
          const angle = percentage * 360;

          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z',
          ].join(' ');

          return (
            <React.Fragment key={index}>
              <Path
                d={pathData}
                fill={item.color}
              />
            </React.Fragment>
          );
        })}
        {/* Center circle for donut effect */}
        <Rect
          x={centerX - radius * 0.5}
          y={centerY - radius * 0.5}
          width={radius}
          height={radius}
          rx={radius / 2}
          fill="#FFFFFF"
        />
      </Svg>
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.label}: {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 10,
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    marginTop: 20,
  },
  legend: {
    marginTop: 10,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#667085',
  },
});
