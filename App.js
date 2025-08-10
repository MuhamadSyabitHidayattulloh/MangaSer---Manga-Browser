import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Text,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import BrowserScreen from './src/screens/BrowserScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Import services
import { DatabaseService } from './src/services/DatabaseService';
import { NotificationService } from './src/services/NotificationService';
import { BackgroundService } from './src/services/BackgroundService';
import { UpdateTracker } from './src/services/UpdateTracker';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Library') {
            iconName = 'library-books';
          } else if (route.name === 'Downloads') {
            iconName = 'download';
          } else if (route.name === 'History') {
            iconName = 'history';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
        }}
      />
      <Tab.Screen 
        name="Downloads" 
        component={DownloadsScreen}
        options={{
          tabBarLabel: 'Downloads',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen 
        name="Browser" 
        component={BrowserScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Manga Reader App...');

      // Request permissions
      await requestPermissions();

      // Initialize database
      console.log('Initializing database...');
      const dbInitialized = await DatabaseService.initializeDatabase();
      if (!dbInitialized) {
        throw new Error('Failed to initialize database');
      }

      // Initialize notification service
      console.log('Initializing notification service...');
      const notificationInitialized = await NotificationService.initializeUpdateTracking();
      if (!notificationInitialized) {
        console.warn('Failed to initialize notification service');
      }

      // Initialize update tracker
      console.log('Initializing update tracker...');
      const updateTrackerInitialized = await UpdateTracker.initializeUpdateTracking();
      if (!updateTrackerInitialized) {
        console.warn('Failed to initialize update tracker');
      }

      // Initialize background service
      console.log('Initializing background service...');
      const backgroundInitialized = await BackgroundService.initialize();
      if (!backgroundInitialized) {
        console.warn('Failed to initialize background service');
      }

      // Check if update tracking should be started
      const settings = await DatabaseService.getSetting('updateTrackingEnabled', true);
      if (settings) {
        console.log('Starting update tracking...');
        await UpdateTracker.startTracking();
      }

      console.log('App initialization completed successfully');
      setIsInitialized(true);

    } catch (error) {
      console.error('Error initializing app:', error);
      setInitializationError(error.message);
      
      Alert.alert(
        'Initialization Error',
        `Failed to initialize the app: ${error.message}`,
        [
          {
            text: 'Retry',
            onPress: () => {
              setInitializationError(null);
              initializeApp();
            }
          },
          {
            text: 'Continue Anyway',
            onPress: () => setIsInitialized(true)
          }
        ]
      );
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Request storage permissions
        const storagePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'Manga Reader needs storage permission to download chapters',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        // Request notification permissions (Android 13+)
        if (Platform.Version >= 33) {
          const notificationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'Manga Reader needs notification permission to alert you about new chapters',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
        }

        console.log('Permissions requested');
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    }
  };

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Icon name="auto-stories" size={64} color="#007AFF" />
        <Text style={styles.loadingTitle}>Manga Reader</Text>
        <Text style={styles.loadingText}>
          {initializationError ? 'Initialization failed' : 'Initializing...'}
        </Text>
        {initializationError && (
          <Text style={styles.errorText}>{initializationError}</Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
  },
});

