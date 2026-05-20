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
import { HomeScreen } from '@/screens/HomeScreen';
import { OffenseScreen } from '@/screens/OffenseScreen';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
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
            <Stack.Screen name="Game">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="GAME"
                  description="A vs-bot or local 2P match begins here in Phase 4."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Offense">
              {({ navigation }) => (
                <OffenseScreen
                  defenderLevel={1}
                  onTurnEnd={() => navigation.navigate('Home')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Defense">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="DEFENSE"
                  description="Swipe-to-block ships in Phase 3."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Score">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="FINAL SCORE"
                  description="End-of-match screen ships in Phase 4."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Progression">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="PROGRESSION"
                  description="XP + unlock shop ships in Phase 5."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Settings">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="SETTINGS"
                  description="Mute toggle + haptics ship in Phase 6/7."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PassThePhone">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="PASS THE PHONE"
                  description="Local 2P handoff ships in Phase 4."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Highlight">
              {({ navigation }) => (
                <PlaceholderScreen
                  title="HIGHLIGHT"
                  description="Replay + share ships in Phase 8."
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
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
