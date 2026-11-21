# DOORA Mobile

Native Flutter Android application. This is a separate mobile client and does not replace or modify the existing Next.js website.

## Foundation
- Flutter + Material 3
- Mobile-first Discover screen and bottom navigation
- Initial tabs: Keşfet, İşlerim, Mesajlar, Hesabım
- No fake login or fabricated live API data

## Next steps
1. Inspect and document the existing backend API and Neon Auth session contract.
2. Implement real sign-in, sign-up and secure session persistence.
3. Connect real categories, tasks, offers, messages and profile data.
4. Add location, image upload and push notifications.
5. Configure Android release signing and Play Store delivery.

## Build
```sh
flutter pub get
flutter run
flutter build apk --release
```
