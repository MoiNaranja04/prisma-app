import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

interface HorizontalBarChartProps {
  data: {
    label: string;
    value: number;
    isTop?: boolean;
  }[];
  title?: string;
  totalLabel?: string;
  totalValue?: string | number;
  color?: string;
}

export function HorizontalBarChart({ 
  data, 
  title,
  totalLabel = "Total",
  totalValue,
  color = '#0F5E3C'
}: HorizontalBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = Math.max(data.length * 50, 150);
  const barHeight = 32;
  const chartWidth = 280;
  const labelWidth = 100;
  const barMaxWidth = chartWidth - labelWidth - 60;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {totalValue !== undefined && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>{totalValue}</Text>
        </View>
      )}

      <Svg width={chartWidth} height={chartHeight}>
        {data.map((item, index) => {
          const y = index * 50 + 10;
          const barWidth = (item.value / maxValue) * barMaxWidth;
          const isTop = item.isTop;
          
          return (
            <React.Fragment key={index}>
              {/* Label */}
              <SvgText
                x={0}
                y={y + barHeight / 2 + 4}
                fontSize={11}
                fill={isTop ? color : '#667085'}
                fontWeight={isTop ? '700' : '400'}
              >
                {item.label.length > 12 ? item.label.substring(0, 12) + '...' : item.label}
              </SvgText>
              
              {/* Bar background */}
              <Rect
                x={labelWidth}
                y={y}
                width={barMaxWidth}
                height={barHeight}
                rx={4}
                fill={isTop ? color + '20' : '#F1F5F9'}
              />
              
              {/* Bar fill */}
              <Rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={isTop ? color : color + '80'}
              />
              
              {/* Value */}
              <SvgText
                x={labelWidth + barMaxWidth + 8}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                fill={isTop ? color : '#667085'}
                fontWeight={isTop ? '700' : '500'}
              >
                {item.value}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#667085',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F5E3C',
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    marginTop: 20,
  },
});
