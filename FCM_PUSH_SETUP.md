# DOORA push notification setup

The app and API support Firebase Cloud Messaging (FCM).

## 1. Firebase Android app

1. Open Firebase Console and select the DOORA project.
2. Confirm the Android app package name is `com.doora.doora_mobile`.
3. In Project settings → General → Your apps, obtain the API key for this Android app. It must belong to project `doora-bb425`.
4. Confirm Firebase Cloud Messaging is enabled and the API key is not deleted or restricted from Firebase Installations / FCM registration APIs.

## 2. Configure the Android build

In the GitHub repository, open **Settings → Secrets and variables → Actions** and create/update this repository secret:

- `FIREBASE_API_KEY` — the valid API key from the DOORA Firebase project.

The workflow already supplies the matching DOORA Android App ID, sender ID, and project ID. It reads the API key from this secret when building the APK and stops with a clear error if it is missing.

Do not use a Google service-account JSON key as the Android API key.

## 3. Configure server-side sending

1. In Google Cloud Console, create a service account for the Firebase project and grant it the Firebase Cloud Messaging API Admin role.
2. Create a JSON key for that service account.
3. In Cloudflare Dashboard, open the DOORA Worker → **Settings → Variables and Secrets**.
4. Add a secret named `FIREBASE_SERVICE_ACCOUNT_JSON` and paste the complete service-account JSON.
5. Redeploy the Worker.

Never commit the service-account JSON to GitHub or put it in the Flutter app.

## 4. Test

Install the newly built APK, sign in, allow notifications, and send a message or create an offer from a second account. Test with the app open, in the background, and with the screen locked.
