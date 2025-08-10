import { DatabaseService } from './DatabaseService';
import PushNotification from 'react-native-push-notification';
import BackgroundJob from 'react-native-background-job';

class UpdateTracker {
  constructor() {
    this.isTracking = false;
    this.trackingInterval = null;
    this.checkInterval = 30 * 60 * 1000; // 30 minutes
    this.maxRetries = 3;
  }

  async initializeUpdateTracking() {
    try {
      // Configure push notifications
      PushNotification.configure({
        onRegister: function (token) {
          console.log('TOKEN:', token);
        },
        onNotification: function (notification) {
          console.log('NOTIFICATION:', notification);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: true,
      });

      // Create notification channel for Android
      PushNotification.createChannel(
        {
          channelId: 'manga-updates',
          channelName: 'Manga Updates',
          channelDescription: 'Notifications for new manga chapters',
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Notification channel created: ${created}`)
      );

      console.log('Update tracking initialized');
      return true;
    } catch (error) {
      console.error('Error initializing update tracking:', error);
      return false;
    }
  }

  async startTracking() {
    if (this.isTracking) {
      console.log('Update tracking already running');
      return;
    }

    try {
      this.isTracking = true;
      
      // Start background job
      BackgroundJob.start({
        jobKey: 'mangaUpdateTracker',
        period: this.checkInterval,
      });

      // Set up periodic checking
      this.trackingInterval = setInterval(() => {
        this.checkForUpdates();
      }, this.checkInterval);

      // Initial check
      this.checkForUpdates();

      console.log('Update tracking started');
    } catch (error) {
      console.error('Error starting update tracking:', error);
      this.isTracking = false;
    }
  }

  async stopTracking() {
    try {
      this.isTracking = false;

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }

      BackgroundJob.stop({
        jobKey: 'mangaUpdateTracker',
      });

      console.log('Update tracking stopped');
    } catch (error) {
      console.error('Error stopping update tracking:', error);
    }
  }

  async checkForUpdates() {
    if (!this.isTracking) {
      return;
    }

    try {
      console.log('Checking for manga updates...');
      
      const bookmarks = await DatabaseService.getBookmarkedManga();
      const updatePromises = bookmarks.map(manga => this.checkMangaUpdate(manga));
      
      const results = await Promise.allSettled(updatePromises);
      
      let updatesFound = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          updatesFound++;
        } else if (result.status === 'rejected') {
          console.error(`Error checking update for ${bookmarks[index].title}:`, result.reason);
        }
      });

      console.log(`Update check completed. Found ${updatesFound} updates.`);
      
      // Save last check time
      await DatabaseService.setSetting('lastUpdateCheck', Date.now(), 'number');
      
    } catch (error) {
      console.error('Error in checkForUpdates:', error);
    }
  }

  async checkMangaUpdate(manga) {
    try {
      const { title, url, site } = manga;
      
      // Get the latest chapter info from the manga page
      const latestChapter = await this.fetchLatestChapter(url, site);
      
      if (!latestChapter) {
        return false;
      }

      // Check if this is a new chapter
      const isNewChapter = await this.isNewChapter(manga, latestChapter);
      
      if (isNewChapter) {
        // Save update notification
        await this.saveUpdateNotification(manga, latestChapter);
        
        // Send push notification
        await this.sendUpdateNotification(manga, latestChapter);
        
        // Update bookmark with latest chapter info
        await DatabaseService.updateBookmark(url, {
          latestChapter: latestChapter.title,
          latestChapterUrl: latestChapter.url,
          lastUpdated: Date.now()
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error checking update for ${manga.title}:`, error);
      return false;
    }
  }

  async fetchLatestChapter(mangaUrl, site) {
    try {
      // This would typically involve web scraping or API calls
      // For now, we'll simulate the process
      
      const response = await fetch(mangaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Parse HTML to extract latest chapter info
      const latestChapter = this.parseLatestChapter(html, site);
      
      return latestChapter;
    } catch (error) {
      console.error('Error fetching latest chapter:', error);
      return null;
    }
  }

  parseLatestChapter(html, site) {
    try {
      // This is a simplified parser - in a real app you'd use a proper HTML parser
      // or better yet, use APIs when available
      
      let chapterRegex;
      let urlRegex;
      
      if (site.includes('komikcast')) {
        // Komikcast specific parsing
        chapterRegex = /<a[^>]*class="[^"]*chapter-link-item[^"]*"[^>]*>([^<]+)<\/a>/i;
        urlRegex = /<a[^>]*class="[^"]*chapter-link-item[^"]*"[^>]*href="([^"]+)"/i;
      } else if (site.includes('komiku')) {
        // Komiku specific parsing
        chapterRegex = /<a[^>]*class="[^"]*chapter[^"]*"[^>]*>([^<]+)<\/a>/i;
        urlRegex = /<a[^>]*class="[^"]*chapter[^"]*"[^>]*href="([^"]+)"/i;
      } else {
        // Generic parsing
        chapterRegex = /<a[^>]*href="[^"]*chapter[^"]*"[^>]*>([^<]+)<\/a>/i;
        urlRegex = /<a[^>]*href="([^"]*chapter[^"]*)"[^>]*>/i;
      }

      const titleMatch = html.match(chapterRegex);
      const urlMatch = html.match(urlRegex);

      if (titleMatch && urlMatch) {
        return {
          title: titleMatch[1].trim(),
          url: urlMatch[1],
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing latest chapter:', error);
      return null;
    }
  }

  async isNewChapter(manga, latestChapter) {
    try {
      // Check against stored latest chapter
      if (manga.latestChapter && manga.latestChapter === latestChapter.title) {
        return false;
      }

      // Check against reading progress
      const progress = await DatabaseService.getMangaProgress(manga.url);
      if (progress.length > 0) {
        const lastReadChapter = progress[0].chapterTitle;
        if (lastReadChapter === latestChapter.title) {
          return false;
        }
      }

      // Check if we've already notified about this chapter
      const existingNotification = await this.getExistingNotification(manga.url, latestChapter.title);
      if (existingNotification) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking if chapter is new:', error);
      return false;
    }
  }

  async getExistingNotification(mangaUrl, chapterTitle) {
    try {
      // This would query the update_notifications table
      // For now, we'll return null
      return null;
    } catch (error) {
      console.error('Error getting existing notification:', error);
      return null;
    }
  }

  async saveUpdateNotification(manga, latestChapter) {
    try {
      // Save to database
      await DatabaseService.database.executeSql(
        `INSERT INTO update_notifications 
         (mangaTitle, mangaUrl, newChapterTitle, newChapterUrl, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [manga.title, manga.url, latestChapter.title, latestChapter.url, Date.now()]
      );

      console.log(`Saved update notification for ${manga.title}: ${latestChapter.title}`);
    } catch (error) {
      console.error('Error saving update notification:', error);
    }
  }

  async sendUpdateNotification(manga, latestChapter) {
    try {
      PushNotification.localNotification({
        channelId: 'manga-updates',
        title: 'New Chapter Available!',
        message: `${manga.title}\n${latestChapter.title}`,
        bigText: `New chapter of ${manga.title} is now available: ${latestChapter.title}`,
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
          mangaUrl: manga.url,
          chapterUrl: latestChapter.url,
          mangaTitle: manga.title,
          chapterTitle: latestChapter.title
        }
      });

      console.log(`Sent notification for ${manga.title}: ${latestChapter.title}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async getUpdateNotifications(limit = 50) {
    try {
      const [results] = await DatabaseService.database.executeSql(
        'SELECT * FROM update_notifications ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );

      const notifications = [];
      for (let i = 0; i < results.rows.length; i++) {
        notifications.push(results.rows.item(i));
      }

      return notifications;
    } catch (error) {
      console.error('Error getting update notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      await DatabaseService.database.executeSql(
        'UPDATE update_notifications SET isRead = 1 WHERE id = ?',
        [notificationId]
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async clearOldNotifications(daysOld = 30) {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      await DatabaseService.database.executeSql(
        'DELETE FROM update_notifications WHERE timestamp < ?',
        [cutoffTime]
      );

      console.log(`Cleared notifications older than ${daysOld} days`);
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }

  async getTrackingSettings() {
    try {
      const settings = {
        isEnabled: await DatabaseService.getSetting('updateTrackingEnabled', true),
        checkInterval: await DatabaseService.getSetting('updateCheckInterval', 30),
        notificationsEnabled: await DatabaseService.getSetting('updateNotificationsEnabled', true),
        lastCheckTime: await DatabaseService.getSetting('lastUpdateCheck', 0),
        trackingCount: 0
      };

      const bookmarks = await DatabaseService.getBookmarkedManga();
      settings.trackingCount = bookmarks.length;

      return settings;
    } catch (error) {
      console.error('Error getting tracking settings:', error);
      return {
        isEnabled: false,
        checkInterval: 30,
        notificationsEnabled: true,
        lastCheckTime: 0,
        trackingCount: 0
      };
    }
  }

  async updateTrackingSettings(settings) {
    try {
      const {
        isEnabled,
        checkInterval,
        notificationsEnabled
      } = settings;

      await DatabaseService.setSetting('updateTrackingEnabled', isEnabled, 'boolean');
      await DatabaseService.setSetting('updateCheckInterval', checkInterval, 'number');
      await DatabaseService.setSetting('updateNotificationsEnabled', notificationsEnabled, 'boolean');

      // Update check interval
      if (checkInterval !== this.checkInterval / (60 * 1000)) {
        this.checkInterval = checkInterval * 60 * 1000;
        
        if (this.isTracking) {
          await this.stopTracking();
          await this.startTracking();
        }
      }

      // Start/stop tracking based on enabled setting
      if (isEnabled && !this.isTracking) {
        await this.startTracking();
      } else if (!isEnabled && this.isTracking) {
        await this.stopTracking();
      }

      console.log('Tracking settings updated');
    } catch (error) {
      console.error('Error updating tracking settings:', error);
    }
  }

  async forceUpdateCheck() {
    try {
      console.log('Forcing update check...');
      await this.checkForUpdates();
      return true;
    } catch (error) {
      console.error('Error in force update check:', error);
      return false;
    }
  }

  // Get statistics
  async getUpdateStats() {
    try {
      const [totalNotifications] = await DatabaseService.database.executeSql(
        'SELECT COUNT(*) as count FROM update_notifications'
      );

      const [unreadNotifications] = await DatabaseService.database.executeSql(
        'SELECT COUNT(*) as count FROM update_notifications WHERE isRead = 0'
      );

      const [recentUpdates] = await DatabaseService.database.executeSql(
        'SELECT COUNT(*) as count FROM update_notifications WHERE timestamp > ?',
        [Date.now() - (7 * 24 * 60 * 60 * 1000)] // Last 7 days
      );

      const settings = await this.getTrackingSettings();

      return {
        totalNotifications: totalNotifications.rows.item(0).count,
        unreadNotifications: unreadNotifications.rows.item(0).count,
        recentUpdates: recentUpdates.rows.item(0).count,
        isTracking: this.isTracking,
        lastCheckTime: settings.lastCheckTime,
        trackingCount: settings.trackingCount
      };
    } catch (error) {
      console.error('Error getting update stats:', error);
      return {
        totalNotifications: 0,
        unreadNotifications: 0,
        recentUpdates: 0,
        isTracking: false,
        lastCheckTime: 0,
        trackingCount: 0
      };
    }
  }
}

// Create singleton instance
const updateTracker = new UpdateTracker();

export { updateTracker as UpdateTracker };

