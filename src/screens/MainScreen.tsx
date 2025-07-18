import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationHelper, FCMError } from '../utils/NotificationHelper';

interface FCMMessage {
  id: string;
  title: string;
  body: string;
  data: any;
  timestamp: number;
}

const MainScreen: React.FC = () => {
  const [fcmToken, setFcmToken] = useState<string>('');
  const [messages, setMessages] = useState<FCMMessage[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  const notificationHelper = NotificationHelper.getInstance();

  useEffect(() => {
    initializeFCM();
    
    // Set up error handling
    const errorCallback = (error: FCMError) => {
      setError(`${error.code}: ${error.message}`);
    };
    
    notificationHelper.onError(errorCallback);
    
    return () => {
      notificationHelper.removeErrorCallback(errorCallback);
    };
  }, []);

  const initializeFCM = async () => {
    try {
      setError('');
      
      // Request permissions using helper
      const hasPermission = await notificationHelper.requestPermissions();
      if (!hasPermission) {
        setError('Notification permissions not granted');
        return;
      }

      // Get FCM token using helper
      const token = await notificationHelper.getToken();
      if (token) {
        setFcmToken(token);
      }

      // Load stored messages
      await loadStoredMessages();

      // Set up message handlers using helper
      setupMessageHandlers();

      // Get diagnostic info
      const info = await notificationHelper.getDiagnosticInfo();
      setDiagnosticInfo(info);

      setIsInitialized(true);
    } catch (error) {
      console.error('FCM initialization error:', error);
      setError('Failed to initialize FCM');
    }
  };

  const setupMessageHandlers = () => {
    // Handle messages when app is in foreground
    const unsubscribeForeground = notificationHelper.onForegroundMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      
      if (!notificationHelper.validateMessage(remoteMessage)) {
        return;
      }
      
      const newMessage: FCMMessage = {
        id: Date.now().toString(),
        title: remoteMessage.notification?.title || 'No Title',
        body: remoteMessage.notification?.body || 'No Body',
        data: remoteMessage.data || {},
        timestamp: Date.now(),
      };

      setMessages(prev => [newMessage, ...prev]);
      await saveMessage(newMessage);

      // Show local notification for foreground messages
      notificationHelper.showLocalNotification(newMessage.title, newMessage.body);
    });

    // Handle messages when app is opened from background/quit state
    notificationHelper.onNotificationOpenedApp((remoteMessage) => {
      console.log('Background message opened:', remoteMessage);
      handleMessageOpened(remoteMessage);
    });

    // Handle messages when app is opened from quit state
    notificationHelper.getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Initial message:', remoteMessage);
        handleMessageOpened(remoteMessage);
      }
    });

    // Handle token refresh
    const unsubscribeTokenRefresh = notificationHelper.onTokenRefresh(async (token) => {
      console.log('Token refreshed:', token);
      setFcmToken(token);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  };

  const handleMessageOpened = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    if (!notificationHelper.validateMessage(remoteMessage)) {
      return;
    }

    const newMessage: FCMMessage = {
      id: Date.now().toString(),
      title: remoteMessage.notification?.title || 'No Title',
      body: remoteMessage.notification?.body || 'No Body',
      data: remoteMessage.data || {},
      timestamp: Date.now(),
    };

    setMessages(prev => [newMessage, ...prev]);
    await saveMessage(newMessage);
  };

  const saveMessage = async (message: FCMMessage) => {
    try {
      const storedMessages = await AsyncStorage.getItem('fcmMessages');
      const messages = storedMessages ? JSON.parse(storedMessages) : [];
      const updatedMessages = [message, ...messages].slice(0, 50); // Keep only last 50 messages
      await AsyncStorage.setItem('fcmMessages', JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Save message error:', error);
    }
  };

  const loadStoredMessages = async () => {
    try {
      const storedMessages = await AsyncStorage.getItem('fcmMessages');
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const clearMessages = async () => {
    try {
      await AsyncStorage.removeItem('fcmMessages');
      setMessages([]);
    } catch (error) {
      console.error('Clear messages error:', error);
    }
  };

  const copyToken = () => {
    if (fcmToken) {
      Alert.alert(
        'FCM Token',
        fcmToken,
        [
          { text: 'OK' }
        ]
      );
    }
  };

  const retryInitialization = () => {
    setIsInitialized(false);
    initializeFCM();
  };

  const resetFCM = async () => {
    Alert.alert(
      'Reset FCM',
      'This will clear all FCM data and reinitialize. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            await notificationHelper.reset();
            setFcmToken('');
            setMessages([]);
            setIsInitialized(false);
            setError('');
            initializeFCM();
          }
        }
      ]
    );
  };

  const showDiagnostics = () => {
    if (diagnosticInfo) {
      Alert.alert(
        'FCM Diagnostics',
        `Platform: ${diagnosticInfo.platform} ${diagnosticInfo.version}\n` +
        `Permissions: ${diagnosticInfo.hasPermissions ? '✅' : '❌'}\n` +
        `Registered: ${diagnosticInfo.isRegistered ? '✅' : '❌'}\n` +
        `Token: ${diagnosticInfo.token ? '✅' : '❌'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderMessage = (message: FCMMessage) => (
    <View key={message.id} style={styles.messageCard}>
      <Text style={styles.messageTitle}>{message.title}</Text>
      <Text style={styles.messageBody}>{message.body}</Text>
      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleString()}
      </Text>
      {Object.keys(message.data).length > 0 && (
        <Text style={styles.messageData}>
          Data: {JSON.stringify(message.data, null, 2)}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FCM Main Screen</Text>
        <Text style={styles.status}>
          Status: {isInitialized ? '✅ Initialized' : '⏳ Initializing...'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Error: {error}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.retryButton} onPress={retryInitialization}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={resetFCM}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.tokenSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>FCM Token:</Text>
          <TouchableOpacity style={styles.diagnosticButton} onPress={showDiagnostics}>
            <Text style={styles.diagnosticButtonText}>ℹ️ Info</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.tokenContainer} onPress={copyToken}>
          <Text style={styles.tokenText} numberOfLines={3}>
            {fcmToken || 'Generating token...'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.tokenHint}>Tap to view full token</Text>
      </View>

      <View style={styles.messagesSection}>
        <View style={styles.messageHeader}>
          <Text style={styles.sectionTitle}>
            Messages ({messages.length})
          </Text>
          {messages.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearMessages}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {messages.length === 0 ? (
          <View style={styles.noMessagesContainer}>
            <Text style={styles.noMessagesText}>
              📱 No FCM messages received yet
            </Text>
            <Text style={styles.noMessagesSubtext}>
              Send a test message to see it here
            </Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Make sure your Firebase project is configured correctly with this app's package name.
        </Text>
        <Text style={styles.footerSubtext}>
          See FIREBASE_SETUP.md for detailed setup instructions.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4285f4',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tokenSection: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  diagnosticButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  diagnosticButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tokenContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#666',
  },
  tokenHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },
  messagesSection: {
    margin: 15,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noMessagesContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
  },
  noMessagesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: '#999',
  },
  messageCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  messageBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  messageData: {
    fontSize: 11,
    color: '#007bff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
  footer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  footerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MainScreen;