import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface DistributionChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  total?: number;
  totalLabel?: string;
  title?: string;
}

function AnimatedBar({ percent, color, delay }: { percent: number; color: string; delay: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    width.setValue(0);
    Animated.timing(width, {
      toValue: percent,
      duration: 500,
      delay,
      useNativeDriver: false,
    }).start();
  }, [percent, delay, width]);

  return (
    <Animated.View
      style={[
        styles.barFill,
        {
          backgroundColor: color,
          width: width.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
        },
      ]}
    />
  );
}

export function DistributionChart({
  data,
  total,
  totalLabel = "Total",
  title
}: DistributionChartProps) {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [data, fadeAnim, slideAnim]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin datos disponibles</Text>
      </View>
    );
  }

  const totalValue = total ?? data.reduce((sum, item) => sum + item.value, 0);

  if (totalValue === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin datos disponibles</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Total: número arriba, label abajo */}
      <View style={styles.totalBlock}>
        <Text style={[styles.totalValue, { color: colors.text }]}>
          ${totalValue.toFixed(2)}
        </Text>
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
          {totalLabel}
        </Text>
      </View>

      {title && (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      )}

      <View style={styles.barsContainer}>
        {data.map((item, index) => {
          const percentage = ((item.value / totalValue) * 100);
          const barPercent = Math.max(percentage, 2);
          const isTop = index === 0;

          return (
            <View key={index} style={styles.barRow}>
              <View style={styles.barHeader}>
                <View style={styles.barLabelRow}>
                  <View style={[styles.barDot, { backgroundColor: item.color }]} />
                  <Text
                    style={[
                      styles.barLabel,
                      { color: isTop ? colors.text : colors.textMuted },
                      isTop && styles.barLabelTop,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.barValues}>
                  <Text style={[
                    styles.barAmount,
                    { color: isTop ? colors.text : colors.textMuted },
                    isTop && styles.barAmountTop,
                  ]}>
                    ${item.value.toFixed(2)}
                  </Text>
                  <Text style={[styles.barPercent, { color: colors.textMuted }]}>
                    {percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={[styles.barTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F4" }]}>
                <AnimatedBar percent={barPercent} color={item.color} delay={index * 60} />
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    width: '100%',
  },

  /* Total block */
  totalBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.1,
  },

  /* Bars */
  barsContainer: {
    width: '100%',
    gap: 12,
  },
  barRow: {},
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 7,
  },
  barDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  barLabelTop: {
    fontWeight: '700',
  },
  barValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  barAmountTop: {
    fontWeight: '800',
  },
  barPercent: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  emptyText: {
    fontSize: 13,
    marginTop: 20,
    textAlign: 'center',
  },
});
