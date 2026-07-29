# Repository Guidelines

## Project Structure & Module Organization

This is an Expo SDK 53 React Native app. `App.js` configures providers and navigation; `index.js` is the Expo entry point. Application code lives under `src/`:

- `screens/` contains route-level views.
- `components/` contains reusable UI and modal components.
- `context/` owns shared meditation and modal state.
- `services/` handles Google authentication, Drive backup, and data merging.
- `utils/` contains helpers; `types/` documents data shapes.

Static app artwork belongs in `assets/`. Expo and build settings live in `app.json`, `eas.json`, and `babel.config.js`.

## Build, Test, and Development Commands

Run `npm install` to install locked dependencies.

- `npm start` starts the Expo development server.
- `npm run android` opens the app on an Android emulator or connected device.
- `npm run ios` starts the iOS simulator on macOS, although the current Expo config targets Android.
- `npm run web` starts the browser build.
- `npx eas build --profile preview --platform android` creates an internal Android build when EAS credentials are available.

## Coding Style & Naming Conventions

Follow the existing JavaScript style: two-space indentation, single quotes, semicolons, and functional components. Use `PascalCase` for components, screens, and providers; use `camelCase` for functions, hooks, variables, and utility files. Keep UI logic in components, state transitions in context reducers, persistence in `utils/storage.js`, and integrations in `services/`. Store dates as timezone-safe `YYYY-MM-DD` strings.

No formatter or linter is configured, so keep changes consistent with surrounding code and avoid drive-by formatting.

## Testing Guidelines

There is currently no automated test framework or coverage threshold. Before submitting changes, launch the affected platform and manually exercise the modified flow, including persistence after restart, timezone-sensitive dates, notification permissions, and backup merge conflicts where relevant. If adding tests, use `*.test.js` beside the module or under `src/__tests__/`, and add the corresponding npm script.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Fix calendar current date highlighting timezone issue` and `Add Hindi language support`. Keep each commit focused. Pull requests should explain user-visible behavior, list manual verification steps, link any issue, and include screenshots or recordings for UI changes. Call out changes to permissions, Google OAuth/Drive configuration, notifications, or stored-data formats.

## Security & Configuration

Never commit OAuth secrets, access tokens, EAS credentials, or user backup data. Treat changes to `app.json` permissions and identifiers as release-sensitive, and preserve backward compatibility for locally stored meditation records.
