import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ListMusic, Search, Settings } from 'lucide-react-native';
import { MiniPlayer } from '../../src/components/player/MiniPlayer';
import { useThemeColors } from '../../src/theme/theme-hook';
import { useTranslation } from '../../src/core/i18n/translations';

export default function TabsLayout() {
  const palette = useThemeColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={({ state, emitter, navigateToTab }) => {
          const tabBg = palette.mode === 'light' ? '#FFFFFF' : '#0D111C';
          const activeCapsuleBg = palette.mode === 'light' ? '#E0F2FE' : '#2D3A56';
          const activeColor = palette.mode === 'light' ? palette.primary : '#FFFFFF';

          return (
            <View
              style={[
                styles.bottomDock,
                {
                  backgroundColor: tabBg,
                  borderTopColor: palette.border,
                  paddingBottom: bottomInset,
                },
              ]}
            >
              <MiniPlayer />

              <View style={styles.tabBarRow}>
                {state.routes.map((route, index) => {
                  const focused = state.index === index;
                  const iconColor = focused ? activeColor : palette.textMuted;

                  const onPress = () => {
                    const event = emitter.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                      navigateToTab(route.key);
                    }
                  };

                  const renderIcon = () => {
                    switch (route.name) {
                      case 'index':
                        return <Home color={iconColor} size={22} fill={focused ? iconColor : 'transparent'} />;
                      case 'library':
                        return <ListMusic color={iconColor} size={22} />;
                      case 'search':
                        return <Search color={iconColor} size={22} />;
                      case 'settings':
                      default:
                        return <Settings color={iconColor} size={22} />;
                    }
                  };

                  return (
                    <TouchableOpacity
                      key={route.key}
                      accessibilityRole="button"
                      accessibilityState={focused ? { selected: true } : {}}
                      onPress={onPress}
                      activeOpacity={0.8}
                      style={styles.tabItemButton}
                    >
                      <View
                        style={[
                          styles.iconWrapper,
                          focused && [styles.activeCapsule, { backgroundColor: activeCapsuleBg }],
                        ]}
                      >
                        {renderIcon()}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
      >
        <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
        <Tabs.Screen name="library" options={{ title: t.tabs.library }} />
        <Tabs.Screen name="search" options={{ title: t.tabs.search }} />
        <Tabs.Screen name="settings" options={{ title: t.tabs.settings }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomDock: {
    borderTopWidth: 1,
    elevation: 14,
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    paddingHorizontal: 8,
  },
  tabItemButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 36,
    borderRadius: 18,
  },
  activeCapsule: {
    width: 54,
    height: 36,
  },
});
