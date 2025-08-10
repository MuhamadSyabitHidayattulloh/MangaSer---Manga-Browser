import BackgroundJob from 'react-native-background-job';
import BackgroundTimer from 'react-native-background-timer';
import { AppState } from 'react-native';
import { UpdateTracker } from './UpdateTracker';
import { NotificationService } from './NotificationService';
import { DatabaseService } from './DatabaseService';

class BackgroundService {
  constructor() {
    this.isRunning = false;
    this.updateCheckInterval = null;
    this.reminderInterval = null;
    this.appState = AppState.currentState;
    this.lastUpdateCheck = 0;
    this.lastReminderSent = 0;
    
    this.setupAppStateListener();
  }

  setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  handleAppStateChange(nextAppState) {
    console.log('App state changed from', this.appState, 'to', nextAppState);
    
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      this.onAppForeground();
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App has gone to the background
      this.onAppBackground();
    }
    
    this.appState = nextAppState;
  }

  async onAppForeground() {
    console.log('App came to foreground');
    
    // Check if we need to perform any updates
    const settings = await this.getBackgroundSettings();
    
    if (settings.updateCheckEnabled) {
      const timeSinceLastCheck = Date.now() - this.lastUpdateCheck;
      const checkInterval = settings.updateCheckInterval * 60 * 1000; // Convert to milliseconds
      
      if (timeSinceLastCheck >= checkInterval) {
        console.log('Performing foreground update check');
        await this.performUpdateCheck();
      }
    }
    
    // Clear any ongoing background tasks
    this.stopBackgroundTasks();
  }

  async onAppBackground() {
    console.log('App went to background');
    
    const settings = await this.getBackgroundSettings();
    
    if (settings.backgroundTasksEnabled) {
      this.startBackgroundTasks();
    }
  }

  async startBackgroundTasks() {
    if (this.isRunning) {
      console.log('Background tasks already running');
      return;
    }

    try {
      const settings = await this.getBackgroundSettings();
      
      console.log('Starting background tasks with settings:', settings);
      
      // Start background job for update checking
      if (settings.updateCheckEnabled) {
        BackgroundJob.start({
          jobKey: 'mangaUpdateChecker',
          period: settings.updateCheckInterval * 60 * 1000, // Convert minutes to milliseconds
        });
        
        // Set up periodic update checking
        this.updateCheckInterval = BackgroundTimer.setInterval(() => {
          this.performUpdateCheck();
        }, settings.updateCheckInterval * 60 * 1000);
      }
      
      // Start background job for reading reminders
      if (settings.readingRemindersEnabled) {
        const reminderInterval = settings.reminderInterval * 60 * 60 * 1000; // Convert hours to milliseconds
        
        this.reminderInterval = BackgroundTimer.setInterval(() => {
          this.sendReadingReminder();
        }, reminderInterval);
      }
      
      this.isRunning = true;
      console.log('Background tasks started successfully');
      
    } catch (error) {
      console.error('Error starting background tasks:', error);
    }
  }

  stopBackgroundTasks() {
    if (!this.isRunning) {
      console.log('Background tasks not running');
      return;
    }

    try {
      // Stop background jobs
      BackgroundJob.stop({
        jobKey: 'mangaUpdateChecker',
      });
      
      // Clear intervals
      if (this.updateCheckInterval) {
        BackgroundTimer.clearInterval(this.updateCheckInterval);
        this.updateCheckInterval = null;
      }
      
      if (this.reminderInterval) {
        BackgroundTimer.clearInterval(this.reminderInterval);
        this.reminderInterval = null;
      }
      
      this.isRunning = false;
      console.log('Background tasks stopped');
      
    } catch (error) {
      console.error('Error stopping background tasks:', error);
    }
  }

  async performUpdateCheck() {
    try {
      console.log('Performing background update check...');
      
      const settings = await this.getBackgroundSettings();
      
      if (!settings.updateCheckEnabled) {
        console.log('Update checking disabled');
        return;
      }
      
      // Check if we're not checking too frequently
      const timeSinceLastCheck = Date.now() - this.lastUpdateCheck;
      const minInterval = 15 * 60 * 1000; // Minimum 15 minutes between checks
      
      if (timeSinceLastCheck < minInterval) {
        console.log('Skipping update check - too soon since last check');
        return;
      }
      
      this.lastUpdateCheck = Date.now();
      
      // Perform the actual update check
      const updatesFound = await UpdateTracker.checkForUpdates();
      
      console.log(`Background update check completed. Updates found: ${updatesFound}`);
      
      // Save last check time
      await DatabaseService.setSetting('lastBackgroundUpdateCheck', Date.now(), 'number');
      
    } catch (error) {
      console.error('Error in background update check:', error);
    }
  }

  async sendReadingReminder() {
    try {
      console.log('Checking if reading reminder should be sent...');
      
      const settings = await this.getBackgroundSettings();
      
      if (!settings.readingRemindersEnabled) {
        console.log('Reading reminders disabled');
        return;
      }
      
      // Check if we've sent a reminder recently
      const timeSinceLastReminder = Date.now() - this.lastReminderSent;
      const reminderInterval = settings.reminderInterval * 60 * 60 * 1000; // Convert hours to milliseconds
      
      if (timeSinceLastReminder < reminderInterval) {
        console.log('Skipping reminder - too soon since last reminder');
        return;
      }
      
      // Check if user has unread chapters
      const hasUnreadChapters = await this.checkForUnreadChapters();
      
      if (hasUnreadChapters) {
        NotificationService.sendReadingReminderNotification();
        this.lastReminderSent = Date.now();
        
        // Save last reminder time
        await DatabaseService.setSetting('lastReadingReminder', Date.now(), 'number');
        
        console.log('Reading reminder sent');
      } else {
        console.log('No unread chapters - skipping reminder');
      }
      
    } catch (error) {
      console.error('Error sending reading reminder:', error);
    }
  }

  async checkForUnreadChapters() {
    try {
      // Get bookmarked manga
      const bookmarks = await DatabaseService.getBookmarkedManga();
      
      if (bookmarks.length === 0) {
        return false;
      }
      
      // Check if any bookmarked manga has new chapters
      for (const bookmark of bookmarks) {
        const progress = await DatabaseService.getMangaProgress(bookmark.url);
        
        // If no progress exists, consider it as having unread chapters
        if (progress.length === 0) {
          return true;
        }
        
        // Check if latest chapter is different from last read
        if (bookmark.latestChapter && progress[0].chapterTitle !== bookmark.latestChapter) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for unread chapters:', error);
      return false;
    }
  }

  async getBackgroundSettings() {
    try {
      const settings = {
        backgroundTasksEnabled: await DatabaseService.getSetting('backgroundTasksEnabled', true),
        updateCheckEnabled: await DatabaseService.getSetting('backgroundUpdateCheck', true),
        updateCheckInterval: await DatabaseService.getSetting('updateCheckInterval', 30), // minutes
        readingRemindersEnabled: await DatabaseService.getSetting('readingRemindersEnabled', true),
        reminderInterval: await DatabaseService.getSetting('reminderInterval', 24), // hours
        wifiOnlyUpdates: await DatabaseService.getSetting('wifiOnlyUpdates', false),
        batteryOptimization: await DatabaseService.getSetting('batteryOptimization', true),
      };
      
      return settings;
    } catch (error) {
      console.error('Error getting background settings:', error);
      return {
        backgroundTasksEnabled: true,
        updateCheckEnabled: true,
        updateCheckInterval: 30,
        readingRemindersEnabled: true,
        reminderInterval: 24,
        wifiOnlyUpdates: false,
        batteryOptimization: true,
      };
    }
  }

  async updateBackgroundSettings(newSettings) {
    try {
      const {
        backgroundTasksEnabled,
        updateCheckEnabled,
        updateCheckInterval,
        readingRemindersEnabled,
        reminderInterval,
        wifiOnlyUpdates,
        batteryOptimization,
      } = newSettings;
      
      // Save settings to database
      await DatabaseService.setSetting('backgroundTasksEnabled', backgroundTasksEnabled, 'boolean');
      await DatabaseService.setSetting('backgroundUpdateCheck', updateCheckEnabled, 'boolean');
      await DatabaseService.setSetting('updateCheckInterval', updateCheckInterval, 'number');
      await DatabaseService.setSetting('readingRemindersEnabled', readingRemindersEnabled, 'boolean');
      await DatabaseService.setSetting('reminderInterval', reminderInterval, 'number');
      await DatabaseService.setSetting('wifiOnlyUpdates', wifiOnlyUpdates, 'boolean');
      await DatabaseService.setSetting('batteryOptimization', batteryOptimization, 'boolean');
      
      // Restart background tasks with new settings
      if (this.isRunning) {
        this.stopBackgroundTasks();
        if (backgroundTasksEnabled) {
          await this.startBackgroundTasks();
        }
      }
      
      console.log('Background settings updated');
      return true;
    } catch (error) {
      console.error('Error updating background settings:', error);
      return false;
    }
  }

  // Manual trigger for update check
  async triggerUpdateCheck() {
    try {
      console.log('Manually triggering update check...');
      await this.performUpdateCheck();
      return true;
    } catch (error) {
      console.error('Error in manual update check:', error);
      return false;
    }
  }

  // Manual trigger for reading reminder
  async triggerReadingReminder() {
    try {
      console.log('Manually triggering reading reminder...');
      await this.sendReadingReminder();
      return true;
    } catch (error) {
      console.error('Error in manual reading reminder:', error);
      return false;
    }
  }

  // Get background service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      appState: this.appState,
      lastUpdateCheck: this.lastUpdateCheck,
      lastReminderSent: this.lastReminderSent,
      hasUpdateInterval: !!this.updateCheckInterval,
      hasReminderInterval: !!this.reminderInterval,
    };
  }

  // Get background service statistics
  async getStatistics() {
    try {
      const lastBackgroundCheck = await DatabaseService.getSetting('lastBackgroundUpdateCheck', 0);
      const lastReminder = await DatabaseService.getSetting('lastReadingReminder', 0);
      const settings = await this.getBackgroundSettings();
      
      return {
        lastBackgroundUpdateCheck: lastBackgroundCheck,
        lastReadingReminder: lastReminder,
        nextUpdateCheck: lastBackgroundCheck + (settings.updateCheckInterval * 60 * 1000),
        nextReminder: lastReminder + (settings.reminderInterval * 60 * 60 * 1000),
        isBackgroundTasksEnabled: settings.backgroundTasksEnabled,
        isUpdateCheckEnabled: settings.updateCheckEnabled,
        isReadingRemindersEnabled: settings.readingRemindersEnabled,
      };
    } catch (error) {
      console.error('Error getting background statistics:', error);
      return {
        lastBackgroundUpdateCheck: 0,
        lastReadingReminder: 0,
        nextUpdateCheck: 0,
        nextReminder: 0,
        isBackgroundTasksEnabled: false,
        isUpdateCheckEnabled: false,
        isReadingRemindersEnabled: false,
      };
    }
  }

  // Initialize background service
  async initialize() {
    try {
      console.log('Initializing background service...');
      
      const settings = await this.getBackgroundSettings();
      
      // Load last check times
      this.lastUpdateCheck = await DatabaseService.getSetting('lastBackgroundUpdateCheck', 0);
      this.lastReminderSent = await DatabaseService.getSetting('lastReadingReminder', 0);
      
      // Start background tasks if enabled and app is in background
      if (settings.backgroundTasksEnabled && this.appState.match(/inactive|background/)) {
        await this.startBackgroundTasks();
      }
      
      console.log('Background service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing background service:', error);
      return false;
    }
  }

  // Cleanup background service
  cleanup() {
    try {
      console.log('Cleaning up background service...');
      
      this.stopBackgroundTasks();
      
      // Remove app state listener
      AppState.removeEventListener('change', this.handleAppStateChange);
      
      console.log('Background service cleaned up');
    } catch (error) {
      console.error('Error cleaning up background service:', error);
    }
  }

  // Force stop all background activities
  forceStop() {
    try {
      console.log('Force stopping background service...');
      
      // Stop all background jobs
      BackgroundJob.stop();
      
      // Clear all timers
      BackgroundTimer.clearInterval(this.updateCheckInterval);
      BackgroundTimer.clearInterval(this.reminderInterval);
      
      this.updateCheckInterval = null;
      this.reminderInterval = null;
      this.isRunning = false;
      
      console.log('Background service force stopped');
    } catch (error) {
      console.error('Error force stopping background service:', error);
    }
  }
}

// Create singleton instance
const backgroundService = new BackgroundService();

export { backgroundService as BackgroundService };

