import RNFS from 'react-native-fs';
import { DatabaseService } from './DatabaseService';
import { Alert } from 'react-native';

class DownloadService {
  constructor() {
    this.downloadQueue = [];
    this.isDownloading = false;
    this.currentDownload = null;
    this.downloadPath = `${RNFS.DocumentDirectoryPath}/MangaDownloads`;
  }

  async initializeDownloadDirectory() {
    try {
      const exists = await RNFS.exists(this.downloadPath);
      if (!exists) {
        await RNFS.mkdir(this.downloadPath);
        console.log('Download directory created');
      }
      return true;
    } catch (error) {
      console.error('Error creating download directory:', error);
      return false;
    }
  }

  async downloadChapter(chapterData) {
    try {
      const {
        mangaTitle,
        mangaUrl,
        chapterTitle,
        chapterUrl,
        images = []
      } = chapterData;

      if (!images || images.length === 0) {
        throw new Error('No images to download');
      }

      // Initialize download directory
      await this.initializeDownloadDirectory();

      // Create manga folder
      const mangaFolderName = this.sanitizeFileName(mangaTitle);
      const mangaFolderPath = `${this.downloadPath}/${mangaFolderName}`;
      
      const mangaFolderExists = await RNFS.exists(mangaFolderPath);
      if (!mangaFolderExists) {
        await RNFS.mkdir(mangaFolderPath);
      }

      // Create chapter folder
      const chapterFolderName = this.sanitizeFileName(chapterTitle);
      const chapterFolderPath = `${mangaFolderPath}/${chapterFolderName}`;
      
      const chapterFolderExists = await RNFS.exists(chapterFolderPath);
      if (!chapterFolderExists) {
        await RNFS.mkdir(chapterFolderPath);
      }

      // Add to database
      const downloadId = await DatabaseService.addDownload({
        mangaTitle,
        mangaUrl,
        chapterTitle,
        chapterUrl,
        downloadPath: chapterFolderPath,
        totalImages: images.length,
        status: 'pending'
      });

      // Add to download queue
      const downloadTask = {
        id: downloadId,
        mangaTitle,
        mangaUrl,
        chapterTitle,
        chapterUrl,
        images,
        downloadPath: chapterFolderPath,
        totalImages: images.length,
        downloadedImages: 0,
        status: 'pending'
      };

      this.downloadQueue.push(downloadTask);

      // Start download if not already downloading
      if (!this.isDownloading) {
        this.processDownloadQueue();
      }

      return downloadId;
    } catch (error) {
      console.error('Error starting download:', error);
      throw error;
    }
  }

  async processDownloadQueue() {
    if (this.isDownloading || this.downloadQueue.length === 0) {
      return;
    }

    this.isDownloading = true;

    while (this.downloadQueue.length > 0) {
      const downloadTask = this.downloadQueue.shift();
      this.currentDownload = downloadTask;

      try {
        await this.downloadImages(downloadTask);
      } catch (error) {
        console.error('Error downloading chapter:', error);
        await DatabaseService.updateDownloadProgress(
          downloadTask.id,
          downloadTask.downloadedImages,
          'failed'
        );
      }
    }

    this.isDownloading = false;
    this.currentDownload = null;
  }

  async downloadImages(downloadTask) {
    try {
      // Update status to downloading
      await DatabaseService.updateDownloadProgress(
        downloadTask.id,
        0,
        'downloading'
      );

      const { images, downloadPath, id } = downloadTask;
      let downloadedCount = 0;

      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        const imageExtension = this.getImageExtension(imageUrl);
        const imageName = `page_${String(i + 1).padStart(3, '0')}.${imageExtension}`;
        const imagePath = `${downloadPath}/${imageName}`;

        try {
          // Check if image already exists
          const exists = await RNFS.exists(imagePath);
          if (exists) {
            downloadedCount++;
            continue;
          }

          // Download image
          const downloadResult = await RNFS.downloadFile({
            fromUrl: imageUrl,
            toFile: imagePath,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
              'Referer': downloadTask.chapterUrl
            }
          }).promise;

          if (downloadResult.statusCode === 200) {
            downloadedCount++;
            
            // Update progress in database
            await DatabaseService.updateDownloadProgress(id, downloadedCount);
            
            console.log(`Downloaded ${downloadedCount}/${images.length} images`);
          } else {
            console.error(`Failed to download image ${i + 1}: Status ${downloadResult.statusCode}`);
          }
        } catch (imageError) {
          console.error(`Error downloading image ${i + 1}:`, imageError);
        }

        // Small delay to prevent overwhelming the server
        await this.delay(100);
      }

      // Mark as completed
      if (downloadedCount === images.length) {
        await DatabaseService.updateDownloadProgress(id, downloadedCount, 'completed');
        
        // Create CBZ file
        await this.createCBZFile(downloadTask);
        
        console.log(`Chapter download completed: ${downloadTask.chapterTitle}`);
      } else {
        await DatabaseService.updateDownloadProgress(id, downloadedCount, 'partial');
        console.log(`Chapter download partially completed: ${downloadedCount}/${images.length} images`);
      }

    } catch (error) {
      console.error('Error in downloadImages:', error);
      throw error;
    }
  }

  async createCBZFile(downloadTask) {
    try {
      const { downloadPath, chapterTitle } = downloadTask;
      const cbzFileName = `${this.sanitizeFileName(chapterTitle)}.cbz`;
      const cbzPath = `${downloadPath}/../${cbzFileName}`;

      // Get all image files
      const files = await RNFS.readDir(downloadPath);
      const imageFiles = files
        .filter(file => file.isFile() && this.isImageFile(file.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (imageFiles.length === 0) {
        console.log('No images found to create CBZ');
        return;
      }

      // Note: React Native doesn't have built-in ZIP functionality
      // You would need to install a library like react-native-zip-archive
      // For now, we'll just log that CBZ creation would happen here
      console.log(`CBZ file would be created at: ${cbzPath}`);
      console.log(`Images to include: ${imageFiles.length}`);

      return cbzPath;
    } catch (error) {
      console.error('Error creating CBZ file:', error);
    }
  }

  async pauseDownload(downloadId) {
    try {
      // Find download in queue
      const queueIndex = this.downloadQueue.findIndex(task => task.id === downloadId);
      if (queueIndex !== -1) {
        this.downloadQueue.splice(queueIndex, 1);
        await DatabaseService.updateDownloadProgress(downloadId, 0, 'paused');
        return true;
      }

      // If it's the current download, we can't pause it mid-download
      // but we can mark it as paused for next time
      if (this.currentDownload && this.currentDownload.id === downloadId) {
        await DatabaseService.updateDownloadProgress(downloadId, this.currentDownload.downloadedImages, 'paused');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error pausing download:', error);
      return false;
    }
  }

  async resumeDownload(downloadId) {
    try {
      // Get download info from database
      const downloads = await DatabaseService.getDownloads();
      const download = downloads.find(d => d.id === downloadId);

      if (!download) {
        throw new Error('Download not found');
      }

      // Check if already in queue or downloading
      const inQueue = this.downloadQueue.some(task => task.id === downloadId);
      const isCurrentDownload = this.currentDownload && this.currentDownload.id === downloadId;

      if (inQueue || isCurrentDownload) {
        return false; // Already downloading
      }

      // Recreate download task
      const downloadTask = {
        id: download.id,
        mangaTitle: download.mangaTitle,
        mangaUrl: download.mangaUrl,
        chapterTitle: download.chapterTitle,
        chapterUrl: download.chapterUrl,
        images: [], // Would need to re-extract images
        downloadPath: download.downloadPath,
        totalImages: download.totalImages,
        downloadedImages: download.downloadedImages,
        status: 'pending'
      };

      this.downloadQueue.push(downloadTask);

      if (!this.isDownloading) {
        this.processDownloadQueue();
      }

      return true;
    } catch (error) {
      console.error('Error resuming download:', error);
      return false;
    }
  }

  async cancelDownload(downloadId) {
    try {
      // Remove from queue
      const queueIndex = this.downloadQueue.findIndex(task => task.id === downloadId);
      if (queueIndex !== -1) {
        this.downloadQueue.splice(queueIndex, 1);
      }

      // Update database
      await DatabaseService.updateDownloadProgress(downloadId, 0, 'cancelled');

      // Delete downloaded files
      const downloads = await DatabaseService.getDownloads();
      const download = downloads.find(d => d.id === downloadId);
      
      if (download && download.downloadPath) {
        const exists = await RNFS.exists(download.downloadPath);
        if (exists) {
          await RNFS.unlink(download.downloadPath);
        }
      }

      return true;
    } catch (error) {
      console.error('Error cancelling download:', error);
      return false;
    }
  }

  async deleteDownload(downloadId) {
    try {
      const downloads = await DatabaseService.getDownloads();
      const download = downloads.find(d => d.id === downloadId);

      if (download && download.downloadPath) {
        // Delete files
        const exists = await RNFS.exists(download.downloadPath);
        if (exists) {
          await RNFS.unlink(download.downloadPath);
        }

        // Delete CBZ file if exists
        const cbzPath = `${download.downloadPath}/../${this.sanitizeFileName(download.chapterTitle)}.cbz`;
        const cbzExists = await RNFS.exists(cbzPath);
        if (cbzExists) {
          await RNFS.unlink(cbzPath);
        }
      }

      // Remove from database
      // Note: You'll need to add this method to DatabaseService
      // await DatabaseService.deleteDownload(downloadId);

      return true;
    } catch (error) {
      console.error('Error deleting download:', error);
      return false;
    }
  }

  async getDownloadedChapters() {
    try {
      const downloads = await DatabaseService.getDownloads('completed');
      return downloads;
    } catch (error) {
      console.error('Error getting downloaded chapters:', error);
      return [];
    }
  }

  async getDownloadProgress() {
    return {
      isDownloading: this.isDownloading,
      currentDownload: this.currentDownload,
      queueLength: this.downloadQueue.length
    };
  }

  // Utility methods
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
  }

  getImageExtension(url) {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return match ? match[1].toLowerCase() : 'jpg';
  }

  isImageFile(fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get storage usage
  async getStorageUsage() {
    try {
      const exists = await RNFS.exists(this.downloadPath);
      if (!exists) {
        return { totalSize: 0, fileCount: 0 };
      }

      const calculateSize = async (path) => {
        const items = await RNFS.readDir(path);
        let totalSize = 0;
        let fileCount = 0;

        for (const item of items) {
          if (item.isDirectory()) {
            const subResult = await calculateSize(item.path);
            totalSize += subResult.totalSize;
            fileCount += subResult.fileCount;
          } else {
            totalSize += item.size;
            fileCount++;
          }
        }

        return { totalSize, fileCount };
      };

      return await calculateSize(this.downloadPath);
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { totalSize: 0, fileCount: 0 };
    }
  }

  // Clear all downloads
  async clearAllDownloads() {
    try {
      const exists = await RNFS.exists(this.downloadPath);
      if (exists) {
        await RNFS.unlink(this.downloadPath);
        await RNFS.mkdir(this.downloadPath);
      }

      // Clear download queue
      this.downloadQueue = [];
      this.currentDownload = null;
      this.isDownloading = false;

      // Clear database
      // Note: You'll need to add this method to DatabaseService
      // await DatabaseService.clearAllDownloads();

      return true;
    } catch (error) {
      console.error('Error clearing all downloads:', error);
      return false;
    }
  }
}

// Create singleton instance
const downloadService = new DownloadService();

export { downloadService as DownloadService };

