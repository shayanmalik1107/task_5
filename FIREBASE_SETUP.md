# Firebase Cloud Messaging (FCM) Setup Guide

## ✅ What's Already Done

This project has been configured with:

- ✅ React Native Firebase dependencies installed
- ✅ Android build configuration updated
- ✅ Android manifest with FCM permissions and services
- ✅ Background message handler configured
- ✅ Complete FCM implementation in MainScreen
- ✅ iOS Podfile ready for auto-linking

## 🔥 Required Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or use existing project
3. Follow the setup wizard

### 2. Android Configuration

1. In Firebase Console, click "Add app" → Android
2. Enter your Android package name: `com.task_5`
3. Download `google-services.json`
4. **IMPORTANT**: Place `google-services.json` in `android/app/` directory
   ```
   android/
   ├── app/
   │   ├── google-services.json  ← Place here
   │   └── build.gradle
   ```

### 3. iOS Configuration

1. In Firebase Console, click "Add app" → iOS
2. Enter your iOS bundle ID: `org.reactjs.native.example.task-5`
3. Download `GoogleService-Info.plist`
4. **IMPORTANT**: Place `GoogleService-Info.plist` in `ios/task_5/` directory
   ```
   ios/
   ├── task_5/
   │   ├── GoogleService-Info.plist  ← Place here
   │   └── Info.plist
   ```

### 4. Build the Project

#### Android
```bash
# Clean and build
cd android
./gradlew clean
cd ..
npx react-native run-android
```

#### iOS
```bash
# Install pods and build
cd ios
pod install
cd ..
npx react-native run-ios
```

## 🚀 Testing FCM

### 1. Get FCM Token
- Run the app
- The FCM token will be displayed on the main screen
- Tap on the token to copy it

### 2. Send Test Message

#### Using Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and message text
4. Click "Send test message"
5. Paste your FCM token
6. Send the message

#### Using cURL:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test Message",
      "body": "This is a test FCM message"
    },
    "data": {
      "custom_key": "custom_value"
    }
  }'
```

## 🔧 Common Issues & Solutions

### Issue 1: "No FCM Token Generated"
**Solution:**
- Ensure `google-services.json` (Android) is in correct location
- Ensure `GoogleService-Info.plist` (iOS) is in correct location
- Check if Firebase project is properly configured
- Verify internet connection

### Issue 2: "Messages Not Received"
**Solution:**
- Check notification permissions are granted
- Verify FCM token is current
- Test with Firebase Console first
- Check device logs for errors

### Issue 3: "Build Errors"
**Solution:**
- Clean and rebuild project
- Ensure all dependencies are installed
- Check Android SDK and build tools versions
- For iOS: run `pod install` in ios directory

### Issue 4: "Background Messages Not Working"
**Solution:**
- Ensure background message handler is registered in `index.js`
- Check if app has background app refresh enabled
- Verify Firebase project configuration

## 📱 Message States

The app handles FCM messages in three states:

1. **Foreground**: App is open and visible
   - Shows alert dialog
   - Message appears in message list

2. **Background**: App is in background
   - Shows system notification
   - Message saved when notification tapped

3. **Killed**: App is completely closed
   - Shows system notification
   - Message saved when app opened from notification

## 🎯 Next Steps

1. Add `google-services.json` and `GoogleService-Info.plist` files
2. Build and run the app
3. Get FCM token from the app
4. Send test message using Firebase Console
5. Verify messages are received and displayed

## 📝 Server Key Location

To find your Server Key for API calls:
1. Firebase Console → Project Settings
2. Cloud Messaging tab
3. Server key (legacy) - copy this for API calls

⚠️ **Important**: Keep your server key secure and never expose it in client-side code.