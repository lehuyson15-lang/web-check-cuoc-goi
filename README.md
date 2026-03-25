# Call Management & STT Web App

Ứng dụng quản trị cuộc gọi và chuyển âm thanh thành văn bản cho phòng khám thẩm mỹ.

## Tech Stack
-   **Frontend**: React + TailwindCSS + Vite
-   **Backend**: Node.js + Express + Prisma + Bull (Redis)
-   **Database**: PostgreSQL
-   **STT**: OpenAI Whisper API

## Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống
-   Docker & Docker Compose
-   Node.js 20+ (nếu chạy local không qua Docker)
-   Redis (nếu chạy local)

### 2. Cấu hình môi trường
Copy file `.env.example` thành `.env` trong thư mục gốc và `backend/.env`.
Cập nhật các biến:
-   `DATABASE_URL`
-   `OPENAI_API_KEY`
-   `JWT_SECRET`
-   `REDIS_URL`

### 3. Chạy ứng dụng bằng Docker
```bash
docker-compose up --build
```

### 4. Chạy local (Development)
**Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Tích hợp VoIP (Stringee)
Hệ thống đã sẵn sàng nhận webhook từ Stringee tại endpoint `/api/calls/webhook`. Cần cấu hình URL của host (ngrok hoặc domain thật) vào Stringee Portal.

## Tài khoản mẫu
- **Admin**: `admin@clinic.com` / `password123`
- **Nhân viên**: `staff@clinic.com` / `password123`
