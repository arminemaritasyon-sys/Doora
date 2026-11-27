# DOORA push notification setup

The app and API now support Firebase Cloud Messaging (FCM). Push delivery remains disabled until the Firebase project credentials below are configured.

## 1. Create the Firebase Android app

1. Open Firebase Console and create/select the DOORA project.
2. Add an Android app with package name `com.doora.doora_mobile`.
3. In Project settings, copy the Android app's API key and App ID, plus the project's sender ID and project ID.
4. In Firebase Console, ensure Firebase Cloud Messaging is enabled.

## 2. Add GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions** and add:

- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PROJECT_ID`

The Android APK workflow injects these values at build time. Rebuild the APK after adding them.

## 3. Add the server credential to Cloudflare

1. In Google Cloud Console, create a service account for the Firebase project and grant it the Firebase Cloud Messaging API Admin role.
2. Create a JSON key for that service account.
3. In Cloudflare Dashboard, open the DOORA Worker → **Settings → Variables and Secrets**.
4. Add a secret named `FIREBASE_SERVICE_ACCOUNT_JSON` and paste the complete service-account JSON.
5. Redeploy the Worker so the secret and the notification sender code are active.

Never commit the service-account JSON to GitHub or put it in the Flutter app.

## 4. Test

Install the newly built APK, sign in, allow notifications, and send a message or create an offer from a second account. Test with the app open, in the background, and with the screen locked. Android notification permission and device battery restrictions must allow DOORA notifications.
