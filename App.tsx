import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PressStart2P_400Regular,
  useFonts,
} from '@expo-google-fonts/press-start-2p';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ProgressionProvider } from '@/context/ProgressionContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { GameScreen } from '@/screens/GameScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ProgressionScreen } from '@/screens/ProgressionScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { RootStackParamList } from '@/navigation';
import { PALETTE } from '@/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  dark: true,
  colors: {
    primary: PALETTE.orangeBall,
    background: PALETTE.midnight,
    card: PALETTE.midnight,
    text: PALETTE.lineWhite,
    border: PALETTE.black,
    notification: PALETTE.redHot,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={PALETTE.orangeBall} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
        <ProgressionProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="Progression" component={ProgressionScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        </ProgressionProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.midnight },
  loading: {
    flex: 1,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
