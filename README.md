# HaloTicket Mobile App

Ứng dụng di động cho nền tảng bán vé sự kiện **HaloTicket**, xây dựng bằng Expo và React Native.

## Công nghệ

- Expo SDK 58, React Native 0.88, React 19
- Expo Router (định tuyến theo cấu trúc thư mục)
- TypeScript
- Axios, i18next (tiếng Việt và tiếng Anh)
- Đăng nhập Keycloak qua `expo-auth-session`, lưu token bằng `expo-secure-store`
- Quét mã QR check-in bằng `expo-camera`

## Cấu trúc thư mục

```text
src/
├── app/          # Màn hình và route (auth, tabs, events, check-in)
├── components/   # Thành phần giao diện dùng chung
├── constants/    # Hằng số
├── hooks/        # Custom hook
├── locales/      # Bản dịch
├── services/     # Gọi API backend
├── theme/        # Màu sắc, kiểu chữ
├── types/        # Kiểu TypeScript
└── utils/        # Hàm tiện ích
tests/            # Kiểm thử
assets/           # Hình ảnh, font
```

## Yêu cầu

- Node.js 20 trở lên
- Ứng dụng Expo Go hoặc development build trên điện thoại, hoặc Android Emulator / iOS Simulator
- Backend HaloTicket đang chạy (xem README của `haloticket-backend`)

## Cấu hình

```bash
cp .env.example .env
```

| Biến | Ý nghĩa |
|---|---|
| `EXPO_PUBLIC_API_URL` | Địa chỉ API Gateway, kết thúc bằng `/api` |
| `EXPO_PUBLIC_KEYCLOAK_URL` | Địa chỉ Keycloak |
| `EXPO_PUBLIC_KEYCLOAK_REALM` | Tên realm Keycloak |
| `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID` | Client dùng cho ứng dụng di động |

Lưu ý về địa chỉ `EXPO_PUBLIC_API_URL`:

- Thiết bị thật: dùng IP LAN của máy tính, cùng Wi-Fi với điện thoại, ví dụ `http://192.168.1.100:8888/api`.
- Không dùng `localhost`, `127.0.0.1` hay IP ảo (vEthernet, WSL, Docker 172.x.x.x) vì điện thoại không truy cập được.
- Android Emulator trên cùng máy: `http://10.0.2.2:8888/api`.

## Chạy ứng dụng

```bash
npm install
npm start          # Expo dev server, cổng 8099
npm run android    # mở trên Android
npm run ios        # mở trên iOS
npm run web        # chạy bản web
```

## Kiểm thử

```bash
npm test
```

Kiểm tra kiểu TypeScript:

```bash
npx tsc --noEmit
```

## Build

Cấu hình build EAS nằm trong `eas.json`:

```bash
npx eas build --platform android
```

Quy ước và hướng dẫn thêm cho công cụ AI nằm trong `CLAUDE.md` và `AGENTS.md`.
