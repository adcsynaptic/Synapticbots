import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CoinsTickerBar } from './src/components/CoinsTickerBar';
import { LoginScreen } from './src/screens/LoginScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { PositionsScreen } from './src/screens/PositionsScreen';
import { PerformanceScreen } from './src/screens/PerformanceScreen';
import { MarketScreen } from './src/screens/MarketScreen';
import { ChartScreen } from './src/screens/ChartScreen';
import { EngineScreen } from './src/screens/EngineScreen';
import { useAuthStore } from './src/state/auth-store';
import { initSentry } from './src/lib/sentry';
import { LandingScreen } from './src/screens/LandingScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { PricingScreen } from './src/screens/PricingScreen';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <View style={{ flex: 1 }}>
      <CoinsTickerBar />
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
          }}
        >
          {/* Names align with web app header: Cockpit, Paper Trade, … */}
          <Tab.Screen name="Cockpit" component={OverviewScreen} options={{ title: 'Cockpit' }} />
          <Tab.Screen
            name="Paper"
            component={PositionsScreen}
            options={{ title: 'Paper Trade', tabBarLabel: 'Paper' }}
          />
          <Tab.Screen name="Stats" component={PerformanceScreen} options={{ title: 'Stats' }} />
          <Tab.Screen name="Market" component={MarketScreen} />
          <Tab.Screen name="Chart" component={ChartScreen} />
          <Tab.Screen name="Engine" component={EngineScreen} options={{ title: 'Engine' }} />
        </Tab.Navigator>
      </View>
    </View>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const restore = useAuthStore((s) => s.restore);
  const setTokens = useAuthStore((s) => s.setTokens);
  const clear = useAuthStore((s) => s.clear);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    initSentry();
  }, []);

  React.useEffect(() => {
    void restore().finally(() => setReady(true));
  }, [restore]);

  React.useEffect(() => {
    async function bootstrapSession() {
      if (!token && refreshToken) {
        try {
          const { mobileRefresh } = await import('./src/lib/api');
          const next = await mobileRefresh(refreshToken);
          await setTokens(next.accessToken, next.refreshToken);
        } catch {
          await clear();
        }
      }
    }
    if (ready) void bootstrapSession();
  }, [token, refreshToken, ready, setTokens, clear]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token ? (
            <Stack.Screen name="MainTabs" component={AppTabs} />
          ) : (
            <>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Pricing" component={PricingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
    </SafeAreaProvider>
  );
}
