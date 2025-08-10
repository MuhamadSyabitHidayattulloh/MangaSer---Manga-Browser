import PushNotification from 'react-native-push-notification';
import { DatabaseService } from './DatabaseService';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.configure();
  }

  configure() {
    PushNotification.configure({
      // Called when Token is generated (iOS and Android)
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },

      // Called when a remote is received or opened, or local notification is opened
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);

        // Handle notification tap
        if (notification.userInteraction) {
          NotificationService.handleNotificationTap(notification);
        }

        // Required on iOS only
        notification.finish(PushNotification.FetchResult.NoData);
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // Request permissions on iOS, does nothing on Android
      requestPermissions: Platform.OS === 'ios',

      // IOS ONLY: If `true`, the handler will be called _after_ the app returns from background
      invokeApp: false,

      // IOS ONLY: see https://reactnative.dev/docs/pushnotificationios
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
    });

    // Create notification channels for Android
    this.createChannels();
    this.isInitialized = true;
  }

  createChannels() {
    // Manga Updates Channel
    PushNotification.createChannel(
      {
        channelId: 'manga-updates',
        channelName: 'Manga Updates',
        channelDescription: 'Notifications for new manga chapters',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Manga updates channel created: ${created}`)
    );

    // Download Notifications Channel
    PushNotification.createChannel(
      {
        channelId: 'downloads',
        channelName: 'Downloads',
        channelDescription: 'Download progress and completion notifications',
        playSound: true,
        soundName: 'default',
        importance: 3,
        vibrate: false,
      },
      (created) => console.log(`Downloads channel created: ${created}`)
    );

    // General Notifications Channel
    PushNotification.createChannel(
      {
        channelId: 'general',
        channelName: 'General',
        channelDescription: 'General app notifications',
        playSound: true,
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      (created) => console.log(`General channel created: ${created}`)
    );
  }

  static handleNotificationTap(notification) {
    const { userInfo } = notification;
    
    if (userInfo && userInfo.type) {
      switch (userInfo.type) {
        case 'manga_update':
          // Navigate to manga chapter
          this.navigateToChapter(userInfo.mangaUrl, userInfo.chapterUrl);
          break;
        case 'download_complete':
          // Navigate to downloads screen
          this.navigateToDownloads();
          break;
        case 'reading_reminder':
          // Navigate to library
          this.navigateToLibrary();
          break;
        default:
          console.log('Unknown notification type:', userInfo.type);
      }
    }
  }

  static navigateToChapter(mangaUrl, chapterUrl) {
    // This would be handled by the navigation service
    console.log('Navigate to chapter:', chapterUrl);
  }

  static navigateToDownloads() {
    console.log('Navigate to downloads');
  }

  static navigateToLibrary() {
    console.log('Navigate to library');
  }

  // Send manga update notification
  sendMangaUpdateNotification(mangaTitle, chapterTitle, mangaUrl, chapterUrl) {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    PushNotification.localNotification({
      channelId: 'manga-updates',
      title: 'New Chapter Available!',
      message: `${mangaTitle}\n${chapterTitle}`,
      bigText: `New chapter of ${mangaTitle} is now available: ${chapterTitle}`,
      subText: 'Manga Reader',
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      color: '#007AFF',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
      actions: ['Read Now', 'Later'],
      userInfo: {
        type: 'manga_update',
        mangaUrl: mangaUrl,
        chapterUrl: chapterUrl,
        mangaTitle: mangaTitle,
        chapterTitle: chapterTitle,
      },
    });

    // Save notification to database
    this.saveNotificationToDatabase({
      type: 'manga_update',
      title: 'New Chapter Available!',
      message: `${mangaTitle}: ${chapterTitle}`,
      data: {
        mangaUrl,
        chapterUrl,
        mangaTitle,
        chapterTitle,
      },
      timestamp: Date.now(),
    });
  }

  // Send download completion notification
  sendDownloadCompleteNotification(chapterTitle, mangaTitle, downloadPath) {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    PushNotification.localNotification({
      channelId: 'downloads',
      title: 'Download Complete',
      message: `${chapterTitle} has been downloaded`,
      bigText: `${mangaTitle}: ${chapterTitle} has been successfully downloaded and is ready to read offline.`,
      subText: 'Manga Reader',
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      color: '#34C759',
      vibrate: false,
      playSound: true,
      soundName: 'default',
      actions: ['Open', 'Dismiss'],
      userInfo: {
        type: 'download_complete',
        chapterTitle: chapterTitle,
        mangaTitle: mangaTitle,
        downloadPath: downloadPath,
      },
    });

    this.saveNotificationToDatabase({
      type: 'download_complete',
      title: 'Download Complete',
      message: `${chapterTitle} has been downloaded`,
      data: {
        chapterTitle,
        mangaTitle,
        downloadPath,
      },
      timestamp: Date.now(),
    });
  }

  // Send download progress notification
  sendDownloadProgressNotification(chapterTitle, progress, total) {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    const percentage = Math.round((progress / total) * 100);

    PushNotification.localNotification({
      channelId: 'downloads',
      title: 'Downloading Chapter',
      message: `${chapterTitle} - ${percentage}%`,
      bigText: `Downloading ${chapterTitle}: ${progress}/${total} pages (${percentage}%)`,
      subText: 'Manga Reader',
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      color: '#007AFF',
      vibrate: false,
      playSound: false,
      ongoing: true,
      progress: {
        max: total,
        current: progress,
        indeterminate: false,
      },
      userInfo: {
        type: 'download_progress',
        chapterTitle: chapterTitle,
        progress: progress,
        total: total,
      },
    });
  }

  // Send reading reminder notification
  sendReadingReminderNotification() {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    PushNotification.localNotification({
      channelId: 'general',
      title: 'Time to Read!',
      message: 'You have unread chapters waiting for you',
      bigText: 'Don\'t forget to catch up on your favorite manga series. You have new chapters waiting to be read!',
      subText: 'Manga Reader',
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      color: '#FF9500',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
      actions: ['Open Library', 'Later'],
      userInfo: {
        type: 'reading_reminder',
      },
    });

    this.saveNotificationToDatabase({
      type: 'reading_reminder',
      title: 'Time to Read!',
      message: 'You have unread chapters waiting for you',
      data: {},
      timestamp: Date.now(),
    });
  }

  // Schedule reading reminder
  scheduleReadingReminder(hours = 24) {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    const date = new Date();
    date.setHours(date.getHours() + hours);

    PushNotification.localNotificationSchedule({
      channelId: 'general',
      title: 'Time to Read!',
      message: 'You have unread chapters waiting for you',
      date: date,
      userInfo: {
        type: 'reading_reminder',
      },
    });

    console.log(`Reading reminder scheduled for ${date}`);
  }

  // Cancel all notifications
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
    console.log('All notifications cancelled');
  }

  // Cancel notifications by type
  cancelNotificationsByType(type) {
    // Note: React Native Push Notification doesn't have built-in filtering
    // You would need to track notification IDs and cancel them individually
    console.log(`Cancelling notifications of type: ${type}`);
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const settings = {
        mangaUpdatesEnabled: await DatabaseService.getSetting('notificationMangaUpdates', true),
        downloadsEnabled: await DatabaseService.getSetting('notificationDownloads', true),
        readingRemindersEnabled: await DatabaseService.getSetting('notificationReadingReminders', true),
        soundEnabled: await DatabaseService.getSetting('notificationSound', true),
        vibrationEnabled: await DatabaseService.getSetting('notificationVibration', true),
        reminderInterval: await DatabaseService.getSetting('reminderInterval', 24), // hours
      };

      return settings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        mangaUpdatesEnabled: true,
        downloadsEnabled: true,
        readingRemindersEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        reminderInterval: 24,
      };
    }
  }

  // Update notification settings
  async updateNotificationSettings(settings) {
    try {
      const {
        mangaUpdatesEnabled,
        downloadsEnabled,
        readingRemindersEnabled,
        soundEnabled,
        vibrationEnabled,
        reminderInterval,
      } = settings;

      await DatabaseService.setSetting('notificationMangaUpdates', mangaUpdatesEnabled, 'boolean');
      await DatabaseService.setSetting('notificationDownloads', downloadsEnabled, 'boolean');
      await DatabaseService.setSetting('notificationReadingReminders', readingRemindersEnabled, 'boolean');
      await DatabaseService.setSetting('notificationSound', soundEnabled, 'boolean');
      await DatabaseService.setSetting('notificationVibration', vibrationEnabled, 'boolean');
      await DatabaseService.setSetting('reminderInterval', reminderInterval, 'number');

      console.log('Notification settings updated');
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }

  // Save notification to database for history
  async saveNotificationToDatabase(notification) {
    try {
      await DatabaseService.database.executeSql(
        `INSERT INTO notifications (type, title, message, data, timestamp, isRead) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          notification.type,
          notification.title,
          notification.message,
          JSON.stringify(notification.data),
          notification.timestamp,
          0, // isRead = false
        ]
      );
    } catch (error) {
      console.error('Error saving notification to database:', error);
    }
  }

  // Get notification history
  async getNotificationHistory(limit = 50) {
    try {
      const [results] = await DatabaseService.database.executeSql(
        'SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );

      const notifications = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        notifications.push({
          ...row,
          data: JSON.parse(row.data || '{}'),
        });
      }

      return notifications;
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      await DatabaseService.database.executeSql(
        'UPDATE notifications SET isRead = 1 WHERE id = ?',
        [notificationId]
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Clear notification history
  async clearNotificationHistory(daysOld = 30) {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      await DatabaseService.database.executeSql(
        'DELETE FROM notifications WHERE timestamp < ?',
        [cutoffTime]
      );

      console.log(`Cleared notifications older than ${daysOld} days`);
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  // Get unread notification count
  async getUnreadNotificationCount() {
    try {
      const [results] = await DatabaseService.database.executeSql(
        'SELECT COUNT(*) as count FROM notifications WHERE isRead = 0'
      );

      return results.rows.item(0).count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Test notification (for debugging)
  sendTestNotification() {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    PushNotification.localNotification({
      channelId: 'general',
      title: 'Test Notification',
      message: 'This is a test notification from Manga Reader',
      bigText: 'This is a test notification to verify that push notifications are working correctly in the Manga Reader app.',
      subText: 'Manga Reader',
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      color: '#007AFF',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
      userInfo: {
        type: 'test',
      },
    });

    console.log('Test notification sent');
  }

  // Check notification permissions
  checkPermissions() {
    PushNotification.checkPermissions((permissions) => {
      console.log('Notification permissions:', permissions);
      return permissions;
    });
  }

  // Request notification permissions (iOS)
  requestPermissions() {
    PushNotification.requestPermissions(['alert', 'badge', 'sound']).then(
      (permissions) => {
        console.log('Notification permissions granted:', permissions);
        return permissions;
      }
    );
  }

  // Get badge count
  getApplicationIconBadgeNumber() {
    PushNotification.getApplicationIconBadgeNumber((number) => {
      console.log('Badge number:', number);
      return number;
    });
  }

  // Set badge count
  setApplicationIconBadgeNumber(number) {
    PushNotification.setApplicationIconBadgeNumber(number);
  }

  // Clear badge
  clearBadge() {
    PushNotification.setApplicationIconBadgeNumber(0);
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export { notificationService as NotificationService };

