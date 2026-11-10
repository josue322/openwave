import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, ListMusic, Music, Disc3, Settings } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { MiniPlayer } from '../../src/components/player/MiniPlayer';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false, // Icon-only sleek bottom bar like Reference 1
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#64748B',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.activeCapsule]}>
                <Home color={color} size={22} fill={focused ? color : 'transparent'} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Biblioteca',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.activeCapsule]}>
                <ListMusic color={color} size={22} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Explorar',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.activeCapsule]}>
                <Music color={color} size={22} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrapper, focused && styles.activeCapsule]}>
                <Settings color={color} size={22} />
              </View>
            ),
          }}
        />
      </Tabs>

      {/* Floating Mini Player from Reference 1 */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090C15',
  },
  tabBar: {
    backgroundColor: '#0D111C', // Dark navy bar matching Reference 1
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 12,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 38,
    borderRadius: 19,
  },
  activeCapsule: {
    backgroundColor: '#2D3A56', // Active rounded capsule as in Reference 1
    width: 52,
    height: 38,
  },
});
