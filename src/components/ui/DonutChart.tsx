import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface DonutChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  size?: number;
  thickness?: number;
  total?: number;
  totalLabel?: string;
  title?: string;
}

export function DonutChart({ 
  data, 
  size = 160, 
  thickness = 22,
  total,
  totalLabel = "Total",
  title 
}: DonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  const totalValue = total ?? data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;

  if (totalValue === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  let startAngle = 0;
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {data.map((item, index) => {
            const percentage = item.value / totalValue;
            const angle = percentage * 360;
            const endAngle = startAngle + angle;
            
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            
            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${center} ${center}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');
            
            startAngle = endAngle;
            
            return (
              <Path
                key={index}
                d={pathData}
                fill={item.color}
                opacity={0.85}
              />
            );
          })}
          <Circle
            cx={center}
            cy={center}
            r={radius - thickness}
            fill="#FFFFFF"
          />
        </Svg>
        
        <View style={styles.centerText}>
          <Text style={styles.totalValue}>${totalValue.toFixed(0)}</Text>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.legendValue}>${item.value.toFixed(2)}</Text>
            <Text style={styles.legendPercent}>
              ({((item.value / totalValue) * 100).toFixed(0)}%)
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
    paddingVertical: 10,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
    textAlign: 'center',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F5E3C',
  },
  totalLabel: {
    fontSize: 10,
    color: '#667085',
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    marginTop: 20,
  },
  legend: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#111111',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  legendPercent: {
    fontSize: 11,
    color: '#667085',
    minWidth: 45,
    textAlign: 'right',
  },
});
