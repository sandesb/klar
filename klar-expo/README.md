# Klar Native (Expo)

React Native + Expo rewrite of the original Klar calendar project.

## What is included

- A.D / B.S mode toggle
- Year-at-a-glance month grids
- Date-range picking (tap dates or MM/DD input)
- Days mode (set range by number of days)
- Exclude weekends / custom working-day rules
- Lock / unlock range
- Saved ranges (local persistence via AsyncStorage)
- Review mode overrides (deduct/add workdays)
- Per-day todo tasks for saved ranges (long-press day in review mode)

## Run locally

```bash
npm install
npm run web
```

You can also run on device/emulator:

```bash
npm run android
npm run ios
```

## Build check

```bash
npx expo export --platform web
```

## Build Android APK (install on your phone)

This project includes `eas.json` with a `preview` profile configured to output an `.apk`.

1) Install dependencies:

```bash
npm install
```

2) Install EAS CLI:

```bash
npm install -g eas-cli
```

3) Login to Expo (first time only):

```bash
eas login
```

4) Configure EAS build metadata in this project (first time only):

```bash
eas build:configure
```

5) Build an Android APK in Expo cloud:

```bash
eas build -p android --profile preview
```

6) When build finishes, Expo prints a URL/QR code. Open it on your phone and download the APK.

If Android blocks install, allow **Install unknown apps** for your browser/file manager and retry.

### Optional: Local APK build (requires Android Studio toolchain)

```bash
npx expo prebuild -p android
cd android
./gradlew assembleRelease
```

Output APK path:

```bash
android/app/build/outputs/apk/release/app-release.apk
```

## Create a new repository for this app

From inside this folder:

```bash
git init
git add .
git commit -m "Initial Expo rewrite of Klar"
git branch -M main
gh repo create <your-new-repo-name> --private --source=. --remote=origin --push
```

Or use `--public` instead of `--private`.
