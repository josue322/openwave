import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

export const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({ width, height, borderRadius = 8, style }) => {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#1E2538',
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

export const LibrarySkeletonList: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <View style={styles.container}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={styles.row}>
        <SkeletonBox width={44} height={44} borderRadius={10} />
        <View style={styles.lines}>
          <SkeletonBox width="70%" height={14} borderRadius={6} />
          <SkeletonBox width="45%" height={11} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  lines: {
    flex: 1,
  },
});

