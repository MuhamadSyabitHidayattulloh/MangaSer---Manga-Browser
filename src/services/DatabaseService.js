import SQLite from 'react-native-sqlite-storage';

// Enable debugging
SQLite.DEBUG(true);
SQLite.enablePromise(true);

class DatabaseService {
  constructor() {
    this.database = null;
  }

  async initDatabase() {
    try {
      this.database = await SQLite.openDatabase({
        name: 'MangaReader.db',
        location: 'default',
      });

      console.log('Database opened successfully');
      await this.createTables();
      return this.database;
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  async createTables() {
    try {
      // Bookmarks table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT UNIQUE NOT NULL,
          thumbnail TEXT,
          description TEXT,
          genre TEXT,
          status TEXT,
          site TEXT,
          dateAdded INTEGER,
          lastRead INTEGER,
          totalChapters INTEGER,
          currentChapter TEXT,
          currentChapterUrl TEXT,
          isFavorite INTEGER DEFAULT 0,
          tags TEXT
        )
      `);

      // Reading history table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          timestamp INTEGER,
          domain TEXT,
          chapterTitle TEXT,
          chapterUrl TEXT,
          scrollPosition INTEGER DEFAULT 0,
          readingTime INTEGER DEFAULT 0
        )
      `);

      // Reading progress table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS reading_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mangaUrl TEXT NOT NULL,
          chapterUrl TEXT NOT NULL,
          chapterTitle TEXT,
          currentPage INTEGER DEFAULT 1,
          totalPages INTEGER DEFAULT 1,
          scrollPosition INTEGER DEFAULT 0,
          scrollPercentage INTEGER DEFAULT 0,
          timestamp INTEGER,
          isCompleted INTEGER DEFAULT 0,
          readingTime INTEGER DEFAULT 0,
          UNIQUE(mangaUrl, chapterUrl)
        )
      `);

      // Downloads table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS downloads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mangaTitle TEXT NOT NULL,
          mangaUrl TEXT NOT NULL,
          chapterTitle TEXT NOT NULL,
          chapterUrl TEXT NOT NULL,
          downloadPath TEXT,
          totalImages INTEGER,
          downloadedImages INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          dateStarted INTEGER,
          dateCompleted INTEGER,
          fileSize INTEGER DEFAULT 0
        )
      `);

      // Update notifications table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS update_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mangaTitle TEXT NOT NULL,
          mangaUrl TEXT NOT NULL,
          newChapterTitle TEXT,
          newChapterUrl TEXT,
          timestamp INTEGER,
          isRead INTEGER DEFAULT 0,
          notificationSent INTEGER DEFAULT 0
        )
      `);

      // Settings table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          type TEXT DEFAULT 'string'
        )
      `);

      console.log('All tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Bookmark methods
  async addBookmark(mangaData) {
    try {
      const {
        title,
        url,
        thumbnail = null,
        description = null,
        genre = null,
        status = null,
        site = null,
        tags = null
      } = mangaData;

      const dateAdded = Date.now();

      await this.database.executeSql(
        `INSERT OR REPLACE INTO bookmarks 
         (title, url, thumbnail, description, genre, status, site, dateAdded, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, url, thumbnail, description, genre, status, site, dateAdded, tags]
      );

      console.log('Bookmark added successfully');
      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  async removeBookmark(url) {
    try {
      await this.database.executeSql(
        'DELETE FROM bookmarks WHERE url = ?',
        [url]
      );
      console.log('Bookmark removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  }

  async getBookmarkedManga() {
    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM bookmarks ORDER BY dateAdded DESC'
      );

      const bookmarks = [];
      for (let i = 0; i < results.rows.length; i++) {
        bookmarks.push(results.rows.item(i));
      }

      return bookmarks;
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      throw error;
    }
  }

  async updateBookmark(url, updateData) {
    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      await this.database.executeSql(
        `UPDATE bookmarks SET ${setClause} WHERE url = ?`,
        [...values, url]
      );

      console.log('Bookmark updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating bookmark:', error);
      throw error;
    }
  }

  // History methods
  async addToHistory(historyData) {
    try {
      const {
        title,
        url,
        timestamp = Date.now(),
        domain = null,
        chapterTitle = null,
        chapterUrl = null,
        scrollPosition = 0,
        readingTime = 0
      } = historyData;

      // Remove old entry if exists (to avoid duplicates)
      await this.database.executeSql(
        'DELETE FROM history WHERE url = ?',
        [url]
      );

      // Add new entry
      await this.database.executeSql(
        `INSERT INTO history 
         (title, url, timestamp, domain, chapterTitle, chapterUrl, scrollPosition, readingTime) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, url, timestamp, domain, chapterTitle, chapterUrl, scrollPosition, readingTime]
      );

      // Keep only last 1000 entries
      await this.database.executeSql(
        `DELETE FROM history WHERE id NOT IN (
          SELECT id FROM history ORDER BY timestamp DESC LIMIT 1000
        )`
      );

      console.log('History added successfully');
      return true;
    } catch (error) {
      console.error('Error adding to history:', error);
      throw error;
    }
  }

  async getHistory(limit = 50) {
    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM history ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );

      const history = [];
      for (let i = 0; i < results.rows.length; i++) {
        history.push(results.rows.item(i));
      }

      return history;
    } catch (error) {
      console.error('Error getting history:', error);
      throw error;
    }
  }

  async getRecentManga(limit = 10) {
    try {
      const [results] = await this.database.executeSql(
        `SELECT DISTINCT title, url, MAX(timestamp) as lastRead, chapterTitle as lastChapter
         FROM history 
         WHERE chapterTitle IS NOT NULL
         GROUP BY url 
         ORDER BY lastRead DESC 
         LIMIT ?`,
        [limit]
      );

      const recentManga = [];
      for (let i = 0; i < results.rows.length; i++) {
        recentManga.push(results.rows.item(i));
      }

      return recentManga;
    } catch (error) {
      console.error('Error getting recent manga:', error);
      throw error;
    }
  }

  async clearHistory() {
    try {
      await this.database.executeSql('DELETE FROM history');
      console.log('History cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  // Reading progress methods
  async updateReadingProgress(progressData) {
    try {
      const {
        mangaUrl,
        chapterUrl,
        chapterTitle = null,
        currentPage = 1,
        totalPages = 1,
        scrollPosition = 0,
        scrollPercentage = 0,
        timestamp = Date.now(),
        isCompleted = 0,
        readingTime = 0
      } = progressData;

      await this.database.executeSql(
        `INSERT OR REPLACE INTO reading_progress 
         (mangaUrl, chapterUrl, chapterTitle, currentPage, totalPages, scrollPosition, 
          scrollPercentage, timestamp, isCompleted, readingTime) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mangaUrl, chapterUrl, chapterTitle, currentPage, totalPages, scrollPosition,
         scrollPercentage, timestamp, isCompleted, readingTime]
      );

      // Update bookmark with current chapter info
      await this.database.executeSql(
        `UPDATE bookmarks 
         SET currentChapter = ?, currentChapterUrl = ?, lastRead = ?
         WHERE url = ?`,
        [chapterTitle, chapterUrl, timestamp, mangaUrl]
      );

      console.log('Reading progress updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating reading progress:', error);
      throw error;
    }
  }

  async getReadingProgress(mangaUrl, chapterUrl = null) {
    try {
      let query = 'SELECT * FROM reading_progress WHERE mangaUrl = ?';
      let params = [mangaUrl];

      if (chapterUrl) {
        query += ' AND chapterUrl = ?';
        params.push(chapterUrl);
      } else {
        query += ' ORDER BY timestamp DESC LIMIT 1';
      }

      const [results] = await this.database.executeSql(query, params);

      if (results.rows.length > 0) {
        return results.rows.item(0);
      }

      return null;
    } catch (error) {
      console.error('Error getting reading progress:', error);
      throw error;
    }
  }

  async getMangaProgress(mangaUrl) {
    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM reading_progress WHERE mangaUrl = ? ORDER BY timestamp DESC',
        [mangaUrl]
      );

      const progress = [];
      for (let i = 0; i < results.rows.length; i++) {
        progress.push(results.rows.item(i));
      }

      return progress;
    } catch (error) {
      console.error('Error getting manga progress:', error);
      throw error;
    }
  }

  // Download methods
  async addDownload(downloadData) {
    try {
      const {
        mangaTitle,
        mangaUrl,
        chapterTitle,
        chapterUrl,
        downloadPath = null,
        totalImages = 0,
        status = 'pending'
      } = downloadData;

      const dateStarted = Date.now();

      const [result] = await this.database.executeSql(
        `INSERT INTO downloads 
         (mangaTitle, mangaUrl, chapterTitle, chapterUrl, downloadPath, totalImages, status, dateStarted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mangaTitle, mangaUrl, chapterTitle, chapterUrl, downloadPath, totalImages, status, dateStarted]
      );

      console.log('Download added successfully');
      return result.insertId;
    } catch (error) {
      console.error('Error adding download:', error);
      throw error;
    }
  }

  async updateDownloadProgress(downloadId, downloadedImages, status = null) {
    try {
      let query = 'UPDATE downloads SET downloadedImages = ?';
      let params = [downloadedImages];

      if (status) {
        query += ', status = ?';
        params.push(status);

        if (status === 'completed') {
          query += ', dateCompleted = ?';
          params.push(Date.now());
        }
      }

      query += ' WHERE id = ?';
      params.push(downloadId);

      await this.database.executeSql(query, params);

      console.log('Download progress updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating download progress:', error);
      throw error;
    }
  }

  async getDownloads(status = null) {
    try {
      let query = 'SELECT * FROM downloads';
      let params = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY dateStarted DESC';

      const [results] = await this.database.executeSql(query, params);

      const downloads = [];
      for (let i = 0; i < results.rows.length; i++) {
        downloads.push(results.rows.item(i));
      }

      return downloads;
    } catch (error) {
      console.error('Error getting downloads:', error);
      throw error;
    }
  }

  // Settings methods
  async setSetting(key, value, type = 'string') {
    try {
      await this.database.executeSql(
        'INSERT OR REPLACE INTO settings (key, value, type) VALUES (?, ?, ?)',
        [key, value, type]
      );

      console.log('Setting saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving setting:', error);
      throw error;
    }
  }

  async getSetting(key, defaultValue = null) {
    try {
      const [results] = await this.database.executeSql(
        'SELECT * FROM settings WHERE key = ?',
        [key]
      );

      if (results.rows.length > 0) {
        const setting = results.rows.item(0);
        
        // Parse value based on type
        switch (setting.type) {
          case 'boolean':
            return setting.value === 'true';
          case 'number':
            return parseFloat(setting.value);
          case 'json':
            return JSON.parse(setting.value);
          default:
            return setting.value;
        }
      }

      return defaultValue;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  // Utility methods
  async closeDatabase() {
    try {
      if (this.database) {
        await this.database.close();
        console.log('Database closed successfully');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  async clearAllData() {
    try {
      await this.database.executeSql('DELETE FROM bookmarks');
      await this.database.executeSql('DELETE FROM history');
      await this.database.executeSql('DELETE FROM reading_progress');
      await this.database.executeSql('DELETE FROM downloads');
      await this.database.executeSql('DELETE FROM update_notifications');
      
      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async exportData() {
    try {
      const bookmarks = await this.getBookmarkedManga();
      const history = await this.getHistory(1000);
      const downloads = await this.getDownloads();

      const exportData = {
        bookmarks,
        history,
        downloads,
        exportDate: Date.now(),
        version: '1.0'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      // Import bookmarks
      if (data.bookmarks) {
        for (const bookmark of data.bookmarks) {
          await this.addBookmark(bookmark);
        }
      }

      // Import history
      if (data.history) {
        for (const historyItem of data.history) {
          await this.addToHistory(historyItem);
        }
      }

      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export { databaseService as DatabaseService };

