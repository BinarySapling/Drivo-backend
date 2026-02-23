# Drivo Backend

> Node.js REST API for the Drivo car rental platform.  
> Strict MVC architecture · JWT auth · MongoDB · Redis · RabbitMQ · Cloudinary

---

## Architecture

```
drivo-backend/
├── server.js               # Entry point — bootstraps DB, Redis, RabbitMQ, workers, HTTP server
└── src/
    ├── app.js              # Express app — middleware, security headers, routes
    ├── config/             # DB, Redis, RabbitMQ, Cloudinary, Stripe connections
    ├── controllers/        # Handle req/res only — delegate 100% to services
    ├── models/             # Mongoose schemas: User, Car, Booking, Review
    ├── routes/             # Route definitions — no logic
    ├── middlewares/        # auth (protect/authorize), rateLimiter, csrf, upload
    ├── services/           # All business logic: authService, bookingService, etc.
    ├── workers/            # RabbitMQ consumers: otpWorker, notificationWorker
    ├── validators/         # express-validator rules for every endpoint
    ├── utils/              # ApiError, ApiResponse, asyncHandler
    └── seeders/            # superadmin.js — initial SUPERADMIN seed
```

**Architecture rules enforced:**
- ✅ No business logic in routes or controllers
- ✅ No DB queries outside services
- ✅ Controllers only call services and send responses

---

## ER Diagram

```
User ─────┬──< Booking >──────── Car ──< (belongs to) ── User[RENTER]
          │
          └──< Review >──────── Car
                  │
                  └──── Booking (one review per booking, unique constraint)
```

| Model     | Key Fields                                                                         |
| --------- | ---------------------------------------------------------------------------------- |
| `User`    | name, email, passwordHash, role (USER/RENTER/ADMIN/SUPERADMIN), isVerified, avatar |
| `Car`     | brand, model, year, pricePerDay, city, images, renterId, isApproved, averageRating |
| `Booking` | userId, carId, startDate, endDate, totalPrice, status, paymentStatus               |
| `Review`  | userId, carId, bookingId (unique), rating (1-5), comment                           |

---

## API Endpoints

| Method | Route                          | Access     | Description            |
| ------ | ------------------------------ | ---------- | ---------------------- |
| POST   | `/api/v1/auth/register`        | Public     | Register + OTP         |
| POST   | `/api/v1/auth/verify-otp`      | Public     | Verify email           |
| POST   | `/api/v1/auth/login`           | Public     | Cookie-based JWT login |
| POST   | `/api/v1/auth/forgot-password` | Public     | Send reset email       |
| POST   | `/api/v1/auth/reset-password`  | Public     | Reset with token       |
| GET    | `/api/v1/auth/me`              | Protected  | Get profile            |
| PUT    | `/api/v1/auth/avatar`          | Protected  | Upload avatar          |
| GET    | `/api/v1/cars`                 | Public     | List / search cars     |
| POST   | `/api/v1/cars`                 | RENTER     | List a car             |
| PUT    | `/api/v1/cars/:id/approve`     | ADMIN      | Approve car            |
| POST   | `/api/v1/bookings`             | USER       | Create booking         |
| PUT    | `/api/v1/bookings/:id/confirm` | RENTER     | Confirm booking        |
| POST   | `/api/v1/reviews`              | USER       | Submit review          |
| GET    | `/api/v1/reviews/car/:carId`   | Public     | Car reviews            |
| GET    | `/api/v1/admin/stats`          | ADMIN      | Platform stats         |
| PUT    | `/api/v1/users/:id/role`       | SUPERADMIN | Assign role            |

---

## Security

| Feature            | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| Password hashing   | bcrypt (10 rounds)                                  |
| Authentication     | httpOnly cookie JWT (access 15m + refresh 7d)       |
| CSRF protection    | Double-submit cookie pattern                        |
| Rate limiting      | express-rate-limit + Redis (per IP)                 |
| Input sanitization | express-mongo-sanitize + xss-clean                  |
| NoSQL injection    | mongo-sanitize on all inputs                        |
| Security headers   | helmet                                              |
| Role-based access  | authorize middleware (USER/RENTER/ADMIN/SUPERADMIN) |

---

## Setup & Deployment

### Local Development

```bash
# 1. Clone
git clone https://github.com/your-org/drivo-backend.git
cd drivo-backend

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your values

# 4. Seed SUPERADMIN (first time only)
node src/seeders/superadmin.js

# 5. Start dev server
npm run dev
```

**Prerequisites:** MongoDB Atlas (or local), Redis, RabbitMQ

### Production Deployment (Render)

1. Push to `main` branch
2. Create a new **Web Service** on [Render](https://render.com)
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `npm start`
5. Add all environment variables from `.env.example`
6. Use **MongoDB Atlas** (not localhost), **Redis Cloud** / Upstash, **CloudAMQP**

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

Key variables:

| Variable                  | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `MONGODB_URI`             | MongoDB Atlas connection string                       |
| `JWT_ACCESS_SECRET`       | JWT signing secret (access token)                     |
| `JWT_REFRESH_SECRET`      | JWT signing secret (refresh token)                    |
| `REDIS_URL`               | Redis connection URL                                  |
| `RABBITMQ_URL`            | RabbitMQ broker URL                                   |
| `CLOUDINARY_*`            | Cloudinary image hosting credentials                  |
| `EMAIL_USER / EMAIL_PASS` | SMTP credentials for transactional email              |
| `FRONTEND_URL`            | Frontend origin (used in CORS + password reset links) |
| `SUPERADMIN_EMAIL`        | Email for the seeded SUPERADMIN account               |

---

## Validation

All endpoints use `express-validator` with:
- Email format check
- Password strength (uppercase + lowercase + number, min 6 chars)
- Required field enforcement
- Booking status enum validation
- MongoDB ObjectId validation (`isValidObjectId`)

---

## Git Flow

```
main ← dev ← feature/auth
                ← feature/bookings
                ← feature/cars
                ← feature/reviews
                ← feature/admin
```

Commit convention: `feat:`, `fix:`, `refactor:`, `chore:`
