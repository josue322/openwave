import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const WaveLogo: React.FC<{ size?: number }> = ({ size = 28 }) => {
  const barHeights = [0.4, 0.8, 1.0, 0.65, 0.35];
  const barWidth = size * 0.12;

  return (
    <View style={[styles.container, { width: size * 1.2, height: size }]}>
      {barHeights.map((h, idx) => (
        <View
          key={idx}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: size * h,
              backgroundColor: idx === 2 ? '#38BDF8' : colors.primary,
              borderRadius: barWidth / 2,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    marginHorizontal: 1.5,
  },
});
