# Klar Native (Expo)

React Native + Expo rewrite of the original Klar calendar project.

---

## ⚠️ Fix: "Unsupported engine" / "expo is not installed" / "Build failed"

You **must** use **Node.js >= 20.19.4**. Node 18 is not supported.

1. **Upgrade Node**
   - **With nvm:** `nvm install 20` then `nvm use` (this folder has `.nvmrc` with `20`).
   - **Without nvm:** Install Node 20 LTS from [nodejs.org](https://nodejs.org/).

2. **Confirm version**
   ```bash
   node -v   # must show v20.x or v22.x (e.g. v20.19.4)
   ```

3. **Clean install in this project**
   ```bash
   cd klar-expo
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Run or build again** (e.g. `npm run android`, or `eas build -p android --profile preview`).

---

## Requirements

- **Node.js >= 20.19.4** (LTS 20.x). Expo SDK 55 and React Native 0.83+ require Node 20+.  
  - Check: `node -v`  
  - Install: [nodejs.org](https://nodejs.org/) or use `nvm install 20` then `nvm use` (this repo has an `.nvmrc`).

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

## Offline LLM (llama.rn) in this app

This app now includes a native-only **Offline LLM** panel (inside the main screen) using `llama.rn`.

- Works on **Android/iOS native builds**.
- Does **not** run inference on Expo Web.

### Model format and shorthand

- GGUF model files are required.
- The shortcut you mentioned:
  - `unsloth/Qwen3-0.6B-GGUF:Q4_K_M`
  - is normalized to:
  - `unsloth/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q4_K_M.gguf`

### Important: about `llama-b8429-bin-win-vulkan-x64`

That package is for **Windows desktop** (`.dll` / `.exe`) and is **not used inside Android APKs**.
For APK builds, `llama.rn` compiles/links Android-native binaries during prebuild/build.

### Where to place local GGUF model for APK

Recommended runtime location inside Android app sandbox:

```text
file:///data/user/0/com.sandesb.klarnative/files/models/<your-model>.gguf
```

Example:

```text
file:///data/user/0/com.sandesb.klarnative/files/models/Qwen3-0.6B-Q4_K_M.gguf
```

The app UI lets you:

1. Download directly from HF using model id/shorthand, or
2. Load from a local absolute `file://` path.

### Practical workflow

1) Build/install APK (`eas build -p android --profile preview`).
2) Open app → Offline LLM panel.
3) Either:
   - Download HF model from panel, or
   - Set local path and tap **Load Model**.
4) Enter prompt and tap **Generate Response**.

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
