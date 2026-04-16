import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { C } from "../../constants/colors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Pre-built skeleton cards
export function SkeletonSummaryCard() {
  return (
    <View style={styles.summaryCard}>
      <Skeleton width={120} height={10} style={styles.centered} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Skeleton width={50} height={10} />
          <Skeleton width={70} height={20} style={styles.mt4} />
        </View>
        <View style={styles.summaryItem}>
          <Skeleton width={50} height={10} />
          <Skeleton width={70} height={20} style={styles.mt4} />
        </View>
        <View style={styles.summaryItem}>
          <Skeleton width={50} height={10} />
          <Skeleton width={70} height={20} style={styles.mt4} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonTransactionCard() {
  return (
    <View style={styles.txCard}>
      <View style={styles.txAccent} />
      <View style={styles.txBody}>
        <Skeleton width={140} height={14} />
        <Skeleton width={80} height={10} style={styles.mt4} />
      </View>
      <Skeleton width={60} height={16} borderRadius={4} style={styles.mr14} />
    </View>
  );
}

export function SkeletonProductCard() {
  return (
    <View style={styles.txCard}>
      <View style={[styles.txAccent, { backgroundColor: C.cyan }]} />
      <View style={styles.txBody}>
        <Skeleton width={120} height={14} />
        <Skeleton width={60} height={10} style={styles.mt4} />
      </View>
      <Skeleton width={50} height={14} borderRadius={4} style={styles.mr14} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.border,
  },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 20,
  },
  centered: {
    alignSelf: "center",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  mt4: {
    marginTop: 4,
  },
  mr14: {
    marginRight: 14,
  },
  txCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  txAccent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: C.emerald,
  },
  txBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
