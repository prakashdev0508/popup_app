# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Floating overlay bubble (Android-only)

This app includes an **Android foreground service** that draws a **floating bubble overlay** (`SYSTEM_ALERT_WINDOW`). When you tap the bubble, the app opens a **React Native bottom-sheet picker**; selecting an item copies its **value** to the clipboard.

### Data model / storage

- **Structure**: up to ~50 items of `{ id, label, value }`
- **Storage**: `AsyncStorage` (`storage/saved-items.ts`)
- **Overlay sync**: items are mirrored into native storage via `OverlayModule.setItems(...)` so the overlay can work while the app is backgrounded.

### Permissions

- **Draw over other apps**: requested via `OverlayModule.requestOverlayPermission()` (opens Android settings screen)
- **Foreground service**: declared in Android manifest
- **Notifications (Android 13+)**: requested at runtime so the foreground service can show its persistent notification

### Run / build (native required)

The overlay needs native code, so it **will not work in Expo Go**.

- Local dev build (device/emulator required):

```bash
npx expo run:android
```

- Local APK build (no device required):

```bash
eas build --local --platform android --profile preview --clear-cache
```

The APK is written to `./build-*.apk`.

### User flow

1. User opens the app → adds items in the **Data** tab.
2. User taps **Start bubble** → grants overlay permission.
3. User opens any other app and taps an input field.
4. User taps the floating bubble.
5. The picker opens → user selects one item.
6. The value is copied to clipboard → user manually pastes.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
