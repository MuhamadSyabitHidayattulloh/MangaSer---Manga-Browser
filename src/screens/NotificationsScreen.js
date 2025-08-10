import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
  Modal,
  Switch,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NotificationService } from '../services/NotificationService';
import { BackgroundService } from '../services/BackgroundService';
import { UpdateTracker } from '../services/UpdateTracker';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, manga_update, download_complete, reading_reminder
  const [settings, setSettings] = useState({
    mangaUpdatesEnabled: true,
    downloadsEnabled: true,
    readingRemindersEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    reminderInterval: 24,
  });
  const [backgroundStats, setBackgroundStats] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      loadUnreadCount();
      loadSettings();
      loadBackgroundStats();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const notificationList = await NotificationService.getNotificationHistory(100);
      setNotifications(notificationList);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const notificationSettings = await NotificationService.getNotificationSettings();
      setSettings(notificationSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBackgroundStats = async () => {
    try {
      const stats = await BackgroundService.getStatistics();
      setBackgroundStats(stats);
    } catch (error) {
      console.error('Error loading background stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadNotifications(),
      loadUnreadCount(),
      loadBackgroundStats()
    ]);
    setRefreshing(false);
  };

  const markAsRead = async (notification) => {
    try {
      if (!notification.isRead) {
        await NotificationService.markNotificationAsRead(notification.id);
        await loadNotifications();
        await loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        await NotificationService.markNotificationAsRead(notification.id);
      }
      
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will delete all notification history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.clearNotificationHistory(0); // Clear all
              await loadNotifications();
              await loadUnreadCount();
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const handleNotificationTap = async (notification) => {
    // Mark as read
    await markAsRead(notification);
    
    // Handle navigation based on notification type
    const { type, data } = notification;
    
    switch (type) {
      case 'manga_update':
        if (data.chapterUrl) {
          navigation.navigate('Browser', {
            url: data.chapterUrl,
            title: data.chapterTitle
          });
        }
        break;
      case 'download_complete':
        navigation.navigate('Downloads');
        break;
      case 'reading_reminder':
        navigation.navigate('Library');
        break;
      default:
        console.log('Unknown notification type:', type);
    }
  };

  const saveSettings = async () => {
    try {
      const success = await NotificationService.updateNotificationSettings(settings);
      if (success) {
        setShowSettings(false);
        Alert.alert('Success', 'Notification settings saved');
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const testNotification = () => {
    NotificationService.sendTestNotification();
    Alert.alert('Test Sent', 'A test notification has been sent');
  };

  const forceUpdateCheck = async () => {
    try {
      Alert.alert('Update Check', 'Checking for manga updates...');
      const success = await UpdateTracker.forceUpdateCheck();
      if (success) {
        Alert.alert('Update Check Complete', 'Check completed. Any new chapters will appear as notifications.');
      } else {
        Alert.alert('Error', 'Failed to check for updates');
      }
    } catch (error) {
      console.error('Error in force update check:', error);
      Alert.alert('Error', 'Failed to check for updates');
    }
  };

  const getFilteredNotifications = () => {
    if (filterType === 'all') {
      return notifications;
    }
    return notifications.filter(notification => notification.type === filterType);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'manga_update': return 'new-releases';
      case 'download_complete': return 'download-done';
      case 'reading_reminder': return 'schedule';
      case 'test': return 'bug-report';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'manga_update': return '#007AFF';
      case 'download_complete': return '#34C759';
      case 'reading_reminder': return '#FF9500';
      case 'test': return '#8E44AD';
      default: return '#666';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationTap(item)}
    >
      <View style={styles.notificationIcon}>
        <Icon 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={getNotificationColor(item.type)} 
        />
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !item.isRead && styles.unreadText
        ]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={3}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.markReadButton}
        onPress={() => markAsRead(item)}
      >
        <Icon 
          name={item.isRead ? "check-circle" : "radio-button-unchecked"} 
          size={20} 
          color={item.isRead ? "#34C759" : "#ccc"} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        {filterType === 'all' 
          ? 'You\'ll see notifications for manga updates, downloads, and reminders here'
          : `No ${filterType.replace('_', ' ')} notifications`
        }
      </Text>
      <TouchableOpacity
        style={styles.testButton}
        onPress={testNotification}
      >
        <Text style={styles.testButtonText}>Send Test Notification</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
          <Icon name="done-all" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
          <Icon name="settings" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAllNotifications} style={styles.headerButton}>
          <Icon name="delete-sweep" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filters}>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
        onPress={() => setFilterType('all')}
      >
        <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'manga_update' && styles.filterButtonActive]}
        onPress={() => setFilterType('manga_update')}
      >
        <Text style={[styles.filterButtonText, filterType === 'manga_update' && styles.filterButtonTextActive]}>
          Updates
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'download_complete' && styles.filterButtonActive]}
        onPress={() => setFilterType('download_complete')}
      >
        <Text style={[styles.filterButtonText, filterType === 'download_complete' && styles.filterButtonTextActive]}>
          Downloads
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'reading_reminder' && styles.filterButtonActive]}
        onPress={() => setFilterType('reading_reminder')}
      >
        <Text style={[styles.filterButtonText, filterType === 'reading_reminder' && styles.filterButtonTextActive]}>
          Reminders
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickActionButton} onPress={forceUpdateCheck}>
        <Icon name="refresh" size={20} color="#007AFF" />
        <Text style={styles.quickActionText}>Check Updates</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickActionButton} onPress={testNotification}>
        <Icon name="notifications" size={20} color="#FF9500" />
        <Text style={styles.quickActionText}>Test Notification</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Notification Settings</Text>
          <TouchableOpacity onPress={saveSettings}>
            <Text style={styles.modalSave}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Manga Updates</Text>
              <Switch
                value={settings.mangaUpdatesEnabled}
                onValueChange={(value) => setSettings({...settings, mangaUpdatesEnabled: value})}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Download Notifications</Text>
              <Switch
                value={settings.downloadsEnabled}
                onValueChange={(value) => setSettings({...settings, downloadsEnabled: value})}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Reading Reminders</Text>
              <Switch
                value={settings.readingRemindersEnabled}
                onValueChange={(value) => setSettings({...settings, readingRemindersEnabled: value})}
              />
            </View>
          </View>
          
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Notification Behavior</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => setSettings({...settings, soundEnabled: value})}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(value) => setSettings({...settings, vibrationEnabled: value})}
              />
            </View>
          </View>
          
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Reading Reminders</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Reminder Interval (hours)</Text>
              <TextInput
                style={styles.settingInput}
                value={settings.reminderInterval.toString()}
                onChangeText={(text) => setSettings({...settings, reminderInterval: parseInt(text) || 24})}
                keyboardType="numeric"
                placeholder="24"
              />
            </View>
          </View>
          
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Background Service Status</Text>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Last Update Check:</Text>
              <Text style={styles.statusValue}>
                {backgroundStats.lastBackgroundUpdateCheck 
                  ? formatTime(backgroundStats.lastBackgroundUpdateCheck)
                  : 'Never'
                }
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Last Reminder:</Text>
              <Text style={styles.statusValue}>
                {backgroundStats.lastReadingReminder 
                  ? formatTime(backgroundStats.lastReadingReminder)
                  : 'Never'
                }
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Background Tasks:</Text>
              <Text style={[
                styles.statusValue,
                { color: backgroundStats.isBackgroundTasksEnabled ? '#34C759' : '#FF3B30' }
              ]}>
                {backgroundStats.isBackgroundTasksEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredNotifications = getFilteredNotifications();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {renderHeader()}
      {renderFilters()}
      {renderQuickActions()}
      
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      {renderSettingsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 5,
    marginLeft: 10,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginRight: 10,
  },
  quickActionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
    padding: 15,
    alignItems: 'flex-start',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  markReadButton: {
    padding: 8,
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
  settingSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    marginBottom: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default NotificationsScreen;

