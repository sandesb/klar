# Klar Native (Expo)

React Native + Expo rewrite of the original Klar calendar project.

## Requirements

- **Node.js >= 20.19.4** (LTS 20.x). Expo SDK 55 and React Native 0.83+ require Node 20+.  
  - Check: `node -v`  
  - Install: [nodejs.org](https://nodejs.org/) or use `nvm install 20` then `nvm use 20` (this repo has an `.nvmrc`).

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

1) **Use Node 20+** (see Requirements). Then install dependencies (clean install if you previously used Node 18):

```bash
node -v   # must be >= 20.19.4
rm -rf node_modules package-lock.json   # optional but recommended if switching Node versions
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

**Build failed with "Unsupported engine" or "expo is not installed"?**  
Use Node >= 20.19.4, then from the project root run `rm -rf node_modules package-lock.json`, `npm install`, and try the build again.

**"Node.js (v18.x) is outdated" and "Cannot determine Expo SDK version / expo is not installed"?**  
Expo SDK 55 and this project require **Node >= 20.19.4**. Do not use Node 18.

1. Upgrade Node: install from [nodejs.org](https://nodejs.org/) (LTS 20 or 22) or run `nvm install 20` then `nvm use` (this repo has `.nvmrc`).
2. From the project root run:
   ```bash
   node -v   # must show v20.x or v22.x
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Run prebuild **without** `--no-install` so dependencies are available, or run `npm install` first if you use `--no-install` in CI.

### Optional: Local APK build (requires Android Studio toolchain)

Use Node 20+ and install dependencies first (`npm install`). Then:

```bash
npx expo prebuild -p android
cd android
./gradlew assembleRelease
```

If you use `npx expo prebuild --no-install`, ensure `npm install` has already been run with Node >= 20.19.4 so the `expo` module is present.

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
