# 📱 MangaSer - Manga Browser

<div align="center">

![Manga Reader](https://img.shields.io/badge/Manga-Reader-blue?style=for-the-badge&logo=android)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)

**A powerful, feature-rich manga reader application built with React Native**

[Features](#-features) • [Installation](#-installation) • [Screenshots](#-screenshots) • [Development](#-development) • [Contributing](#-contributing)

</div>

## 🌟 Features

### 📖 Reading Experience
- **WebView-based Reader**: Optimized manga reading experience with custom injection scripts
- **Site Optimization**: Custom UI improvements for popular manga sites (Komikcast, Komiku, MangaKakalot, etc.)
- **Ad Blocking**: Automatic removal of ads and unnecessary elements for clean reading
- **Reading Modes**: Support for various reading orientations and zoom levels

### 📚 Library Management
- **Bookmarks**: Save your favorite manga for quick access
- **Reading History**: Automatic tracking of read chapters and progress
- **Library Organization**: Categorize and organize your manga collection
- **Search & Filter**: Find manga quickly with advanced search options

### ⬇️ Download System
- **Offline Reading**: Download chapters for offline reading
- **Progress Tracking**: Real-time download progress with notifications
- **Storage Management**: Efficient storage with compression options
- **Batch Downloads**: Download multiple chapters simultaneously

### 🔔 Smart Notifications
- **Update Alerts**: Get notified when new chapters are available
- **Background Tracking**: Automatic checking for updates in the background
- **Reading Reminders**: Customizable reminders to continue reading
- **Download Notifications**: Progress and completion notifications

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface with Material Design
- **Dark/Light Theme**: Comfortable reading in any lighting condition
- **Responsive Layout**: Optimized for various screen sizes
- **Bottom Navigation**: Easy access to all features

### ⚙️ Advanced Features
- **Background Services**: Automatic update checking and notifications
- **Database Management**: SQLite for efficient local data storage
- **Settings Customization**: Extensive customization options
- **Performance Optimization**: Smooth scrolling and fast loading

## 📱 Installation

### Option 1: Download APK (Recommended)
1. Go to [Releases](https://github.com/MuhamadSyabitHidayattulloh/MangaSer---Manga-Browser/releases)
2. Download the latest APK file
3. Enable "Install from unknown sources" in Android settings
4. Install the APK and enjoy!

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/MuhamadSyabitHidayattulloh/MangaSer---Manga-Browser.git
cd MangaSer---Manga-Browser

# Install dependencies
npm install

# Setup React Native Vector Icons
npm run postinstall

# For Android
npx react-native run-android

# For iOS (macOS only)
cd ios && pod install && cd ..
npx react-native run-ios
```

## 🛠️ Development

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Java JDK 17

### Setup Development Environment
```bash
# Install React Native CLI
npm install -g @react-native-community/cli

# Clone and setup
git clone https://github.com/MuhamadSyabitHidayattulloh/MangaSer---Manga-Browser.git
cd MangaSer---Manga-Browser
npm install
npm run postinstall

# Start Metro bundler
npx react-native start

# Run on Android (in another terminal)
npx react-native run-android

# Run on iOS (macOS only)
npx react-native run-ios
```

### Project Structure
```
src/
├── components/          # Reusable UI components
│   └── MangaWebView.js # Main WebView component
├── screens/            # Application screens
│   ├── HomeScreen.js   # Home/Dashboard
│   ├── BrowserScreen.js # Manga reading screen
│   ├── LibraryScreen.js # Bookmarks and library
│   ├── HistoryScreen.js # Reading history
│   ├── DownloadsScreen.js # Download management
│   └── NotificationsScreen.js # Notifications
├── services/           # Business logic and services
│   ├── DatabaseService.js # SQLite database operations
│   ├── DownloadService.js # Download management
│   ├── UpdateTracker.js # Update tracking
│   ├── NotificationService.js # Push notifications
│   └── BackgroundService.js # Background tasks
└── utils/              # Utility functions
    └── InjectionScripts.js # WebView injection scripts
```

## 🔧 Configuration

### Supported Manga Sites
- Komikcast.li
- Komiku.id
- MangaKakalot
- Manganelo
- And many more...

### Customization
The app includes injection scripts that can be customized for different manga sites. Edit `src/utils/InjectionScripts.js` to add support for new sites or modify existing ones.

## 📸 Screenshots

*Screenshots will be added once the app is built and tested*

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow React Native best practices
- Write clean, documented code
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React Native community for the amazing framework
- All manga sites that provide content to readers
- Contributors and testers who help improve the app

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/MuhamadSyabitHidayattulloh/MangaSer---Manga-Browser/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about the issue

## 🔄 Updates

The app includes automatic update checking. You'll be notified when new versions are available.

---

<div align="center">

**Built with ❤️ for manga lovers**

[⭐ Star this repo](https://github.com/MuhamadSyabitHidayattulloh/MangaSer---Manga-Browser) if you find it useful!

</div>
