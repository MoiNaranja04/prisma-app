import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProductLineChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  total?: number;
  totalLabel?: string;
  title?: string;
}

export function ProductLineChart({ 
  data, 
  total,
  totalLabel = "Total",
  title 
}: ProductLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  const totalValue = total ?? data.reduce((sum, item) => sum + item.value, 0);
  
  if (totalValue === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Sin datos disponibles</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{totalLabel}</Text>
        <Text style={styles.totalValue}>{totalValue}</Text>
      </View>

      {/* Línea horizontal dividida */}
      <View style={styles.lineContainer}>
        {data.map((item, index) => {
          const percentage = (item.value / totalValue) * 100;
          if (percentage === 0) return null;
          
          return (
            <View 
              key={index}
              style={[
                styles.lineSegment,
                { 
                  flex: percentage,
                  backgroundColor: item.color,
                  borderTopLeftRadius: index === 0 ? 6 : 0,
                  borderBottomLeftRadius: index === 0 ? 6 : 0,
                  borderTopRightRadius: index === data.length - 1 ? 6 : 0,
                  borderBottomRightRadius: index === data.length - 1 ? 6 : 0,
                }
              ]}
            />
          );
        })}
      </View>

      {/* Leyenda con nombres */}
      <View style={styles.legend}>
        {data.map((item, index) => {
          const percentage = ((item.value / totalValue) * 100).toFixed(1);
          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.legendValue}>
                {item.value} ({percentage}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
  lineContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  lineSegment: {
    height: '100%',
  },
  legend: {
    width: '100%',
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#111111',
  },
  legendValue: {
    fontSize: 11,
    color: '#667085',
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    marginTop: 20,
  },
});
