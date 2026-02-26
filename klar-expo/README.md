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
