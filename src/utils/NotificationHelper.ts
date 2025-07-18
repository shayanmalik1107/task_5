import { Platform, PermissionsAndroid, Alert } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FCMError {
  code: string;
  message: string;
  details?: any;
}

export class NotificationHelper {
  private static instance: NotificationHelper;
  private isInitialized: boolean = false;
  private errorCallbacks: ((error: FCMError) => void)[] = [];

  static getInstance(): NotificationHelper {
    if (!NotificationHelper.instance) {
      NotificationHelper.instance = new NotificationHelper();
    }
    return NotificationHelper.instance;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      return enabled;
    } catch (error) {
      this.handleError('PERMISSION_ERROR', 'Failed to request permissions', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          return granted;
        }
        return true;
      }

      const authStatus = await messaging().hasPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      this.handleError('PERMISSION_CHECK_ERROR', 'Failed to check permissions', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      // Check if Firebase is available
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }

      const token = await messaging().getToken();
      
      if (token) {
        await AsyncStorage.setItem('fcm_token', token);
        console.log('FCM Token obtained:', token);
        return token;
      }
      
      this.handleError('TOKEN_ERROR', 'No FCM token received');
      return null;
    } catch (error) {
      this.handleError('TOKEN_ERROR', 'Failed to get FCM token', error);
      return null;
    }
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('fcm_token');
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * Delete FCM token
   */
  async deleteToken(): Promise<boolean> {
    try {
      await messaging().deleteToken();
      await AsyncStorage.removeItem('fcm_token');
      return true;
    } catch (error) {
      this.handleError('DELETE_TOKEN_ERROR', 'Failed to delete FCM token', error);
      return false;
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(topic: string): Promise<boolean> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      this.handleError('SUBSCRIBE_ERROR', `Failed to subscribe to topic: ${topic}`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      this.handleError('UNSUBSCRIBE_ERROR', `Failed to unsubscribe from topic: ${topic}`, error);
      return false;
    }
  }

  /**
   * Handle foreground messages
   */
  onForegroundMessage(callback: (message: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
    return messaging().onMessage(callback);
  }

  /**
   * Handle background messages when app is opened
   */
  onNotificationOpenedApp(callback: (message: FirebaseMessagingTypes.RemoteMessage) => void): void {
    messaging().onNotificationOpenedApp(callback);
  }

  /**
   * Handle messages when app is opened from quit state
   */
  async getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
    try {
      return await messaging().getInitialNotification();
    } catch (error) {
      this.handleError('INITIAL_NOTIFICATION_ERROR', 'Failed to get initial notification', error);
      return null;
    }
  }

  /**
   * Handle token refresh
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    return messaging().onTokenRefresh(callback);
  }

  /**
   * Show local notification (for foreground messages)
   */
  showLocalNotification(title: string, body: string): void {
    Alert.alert(
      title || 'Notification',
      body || 'You have a new message',
      [{ text: 'OK' }]
    );
  }

  /**
   * Validate message format
   */
  validateMessage(message: FirebaseMessagingTypes.RemoteMessage): boolean {
    if (!message) {
      this.handleError('INVALID_MESSAGE', 'Message is null or undefined');
      return false;
    }

    // Check for required fields
    if (!message.messageId && !message.data && !message.notification) {
      this.handleError('INVALID_MESSAGE', 'Message missing required fields');
      return false;
    }

    return true;
  }

  /**
   * Get message priority
   */
  getMessagePriority(message: FirebaseMessagingTypes.RemoteMessage): 'high' | 'normal' {
    return message.priority === 'high' ? 'high' : 'normal';
  }

  /**
   * Check if app is in foreground
   */
  async isAppInForeground(): Promise<boolean> {
    try {
      // This is a simplified check - in a real app you might want to use
      // AppState or a more sophisticated method
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  }

  /**
   * Add error callback
   */
  onError(callback: (error: FCMError) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(callback: (error: FCMError) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Handle errors
   */
  private handleError(code: string, message: string, details?: any): void {
    const error: FCMError = { code, message, details };
    console.error(`FCM Error [${code}]:`, message, details);
    
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Get diagnostic info
   */
  async getDiagnosticInfo(): Promise<{
    hasPermissions: boolean;
    token: string | null;
    isRegistered: boolean;
    platform: string;
    version: string;
  }> {
    try {
      const hasPermissions = await this.checkPermissions();
      const token = await this.getStoredToken();
      const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;

      return {
        hasPermissions,
        token,
        isRegistered,
        platform: Platform.OS,
        version: Platform.Version.toString(),
      };
    } catch (error) {
      this.handleError('DIAGNOSTIC_ERROR', 'Failed to get diagnostic info', error);
      return {
        hasPermissions: false,
        token: null,
        isRegistered: false,
        platform: Platform.OS,
        version: Platform.Version.toString(),
      };
    }
  }

  /**
   * Reset FCM state
   */
  async reset(): Promise<void> {
    try {
      await this.deleteToken();
      await AsyncStorage.removeItem('fcm_messages');
      this.isInitialized = false;
      console.log('FCM state reset successfully');
    } catch (error) {
      this.handleError('RESET_ERROR', 'Failed to reset FCM state', error);
    }
  }
}