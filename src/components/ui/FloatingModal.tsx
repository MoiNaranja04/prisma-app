import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

interface FloatingModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  dismissOnBackdropPress?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function FloatingModal({
  visible,
  onRequestClose,
  children,
  dismissOnBackdropPress = true,
  cardStyle,
  backdropStyle,
  containerStyle,
}: FloatingModalProps) {
  const [rendered, setRendered] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      opacity.setValue(0);
      translateY.setValue(40);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!rendered) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 190,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: 190,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setRendered(false);
      }
    });
  }, [visible, rendered, opacity, translateY]);

  if (!rendered) return null;

  return (
    <Modal transparent visible onRequestClose={onRequestClose} animationType="none">
      <View style={[styles.root, containerStyle]}>
        <Pressable
          style={[styles.backdrop, backdropStyle]}
          onPress={dismissOnBackdropPress ? onRequestClose : undefined}
        />
        <View style={styles.centerWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              cardStyle,
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});

