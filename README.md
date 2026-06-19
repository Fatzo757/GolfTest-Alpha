<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0c43a272-9206-4831-a7d5-63b8185ecc98

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Android Setup & Build

This project uses [Capacitor](https://capacitorjs.com/) to wrap the web application into a native Android project.

**Prerequisites:** [Android Studio](https://developer.android.com/studio) installed on your machine.

### How to build and sync changes to Android

Whenever you make changes to the React web app and want to see them on Android, follow these steps:

1. **Build the Web Assets**
   Compile your React code into the `dist` folder:
   ```bash
   npm run build
   ```

2. **Sync with Android**
   Copy the newly built web assets into the Android native wrapper:
   ```bash
   npx cap sync
   ```

3. **Open in Android Studio**
   Open the generated Android project in Android Studio to build the final APK, or run it on an emulator/device:
   ```bash
   npx cap open android
   ```
   *(Alternatively, you can manually open Android Studio, select "Open", and choose the `android` folder located in the root of this project.)*

4. **Run the App**
   In Android Studio, click the green "Play" button at the top to compile and launch the app on your connected device or emulator!
