# Leadsy Mobile

Leadsy Mobile is the field-sales companion app for Android and iOS. It focuses on daily sales work: assigned leads, quick contact actions, follow-up context, sales visits, GPS clock-in/out, photo evidence, client signature, and fake-location risk signals.

Current release: **v1.1.0**.

## MVP Scope

- Login with the existing Leadsy API token flow.
- Lead inbox for assigned/visible leads.
- Lead detail with call, WhatsApp, email, and Maps actions.
- Sales visit clock-in and clock-out.
- GPS capture with accuracy and distance checks on the backend.
- Photo evidence captured from the device camera.
- Client signature capture.
- Visit result and notes.
- Basic anti-fake-location risk signals from the device plus backend validation.

## Run Locally

Fastest path with Expo Go:

```bash
npm run mobile:expo-go
```

This detects the machine LAN IP, sets `EXPO_PUBLIC_API_BASE_URL` to `http://<LAN-IP>:3001/api`, and starts Expo in LAN mode. Install Expo Go on Android/iOS, then scan the QR code.

```bash
npm --prefix mobile install
npm --prefix mobile run start
```

Set the backend URL:

```bash
cp mobile/.env.example mobile/.env
```

For Android emulator, use a reachable host such as `http://10.0.2.2:8000/api`. For a physical device, use the LAN IP of the backend machine or the deployed VPS API URL.

## Distribution

Android users can install from Google Play, an internal testing track, or a signed APK/AAB distributed by the team. iOS users install from the Apple App Store or TestFlight. Expo EAS Build is the recommended packaging path:

```bash
npx eas build --platform android
npx eas build --platform ios
```

Production releases should use the deployed Leadsy API URL in `EXPO_PUBLIC_API_BASE_URL`.
