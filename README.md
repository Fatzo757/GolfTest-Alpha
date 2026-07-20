# Golf Card Game (Multiplayer)

A multiplayer web and mobile implementation of the classic "Golf" card game. Play against friends in real-time or against a CPU opponent.

## Tech Stack

**Frontend:**
- [React 19](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Frontend tooling
- [TailwindCSS v4](https://tailwindcss.com/) - Styling
- [Framer Motion](https://motion.dev/) - Animations
- [Lucide React](https://lucide.dev/) - Icons

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) - API Server
- [SQLite](https://sqlite.org/) (`better-sqlite3`) - Database
- JWT Authentication (`jsonwebtoken`, `bcryptjs`)
- Push Notifications (`web-push`, `firebase-admin`)
- AI Features (`@google/genai`)

**Mobile:**
- [Capacitor](https://capacitorjs.com/) - Native Android wrapper

##  Local Development

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18+ recommended)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file and fill in the necessary values. If you are using AI features, set your `GEMINI_API_KEY`.
```bash
cp .env.example .env
```
*(Note: Push notification VAPID keys will be automatically generated into `vapid.json` on the first run if not provided in `.env`).*

### 3. Run the App
```bash
npm run dev
```
This single command uses `tsx` to start the backend Express server, which concurrently serves the Vite frontend. Open your browser to the local URL provided in the terminal (typically `http://localhost:3000`).

## Android Setup & Build

This project uses **Capacitor** to wrap the web application into a native Android app.

**Prerequisites:** [Android Studio](https://developer.android.com/studio) installed on your machine.

### Syncing Changes to Android

Whenever you make changes to the React web app and want to update the Android build, follow these steps:

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
   Launch Android Studio to build the final APK, or run it on an emulator/device:
   ```bash
   npx cap open android
   ```
   *(Alternatively, you can manually open Android Studio and choose the `android` folder located in the root of this project.)*

4. **Run the App**
   In Android Studio, click the green "Play" button at the top to compile and launch the app!
