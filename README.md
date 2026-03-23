# 🚀 Mini Social SaaS API

A high-performance, secure, and production-ready social media backend built with **NestJS**, **Prisma**, **PostgreSQL**, and **Redis**.

---

## 🛠️ Tech Stack & Features

*   **⚡ Framework**: [NestJS](https://nestjs.com/) (Express-based)
*   **database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
*   **🏎️ Caching**: [Redis](https://redis.io/) (Feed & Profile caching)
*   **🔐 Auth**: Dual-JWT system (**Access** & **Refresh** tokens)
*   **📖 API Documentation**: [Swagger (OpenAPI 3.0)](https://swagger.io/)
*   **🛡️ Security**: Helmet, Rate Limiting (Throttler), and CORS
*   **📦 Validation**: `class-validator` & `class-transformer`

---

## 🌟 Core Functionality

### 1. **Authentication & Authorization**
*   Secure **Register** & **Login** with password hashing (`bcryptjs`).
*   **Access Token** (15m expiry) & **Refresh Token** (7d expiry).
*   Automatic token rotation with `/auth/refresh` endpoint.
*   **Role-based Access Control**: Admin vs. User permissions.

### 2. **Social Interaction Engine**
*   **Posts**: Create, read (paginated feed), and delete posts.
*   **Feed**: Includes author info, total likes, and total comments per post.
*   **Comments**: Add and retrieve comments on any post (with pagination).
*   **Likes**: Toggle like/unlike toggle on any post.
*   **Transactions**: Ensures all toggles and state changes are atomic.

### 3. **Smart User Profiles & Stats**
*   **Detailed Analytics**: Fetch user profiles with live stats:
    *   Total posts created.
    *   Total likes received.
    *   Total comments received.
    *   Interactions made by the user.

### 4. **Administrative Controls**
*   Full admin panel endpoints to **list all users**, **update user details**, or **delete accounts/content**.

---

## 🚀 Key Optimizations

### **⚡ Performance**
*   **Redis Caching**: Caches the global feed and user profile stats to reduce DB load.
*   **Indexing**: Strategic B-Tree indexes on `user_id`, `post_id`, and `created_at` for O(1)/O(log n) lookups.
*   **Pagination & Sorting**: Universal support for `page`, `limit`, `sortBy`, and `sortOrder` query parameters across all list APIs.
*   **BigInt Polyfill**: Handles high-performance Raw SQL serialization automatically.

### **🛡️ Security**
*   **Helmet.js**: Standardizes security headers to prevent XSS, clickjacking, etc.
*   **Rate Limiting**: Limits requests to 10 per minute per IP to prevent brute-force attacks.
*   **Data Sanitization**: Global filtering to ensure password hashes are **never** returned in JSON responses.
*   **ValidationPipe**: Strict whitelisting of request bodies to prevent mass-assignment vulnerabilities.

---

## 🛠️ Setup & Running

### **1. Environment Setup**
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secure-64-char-hex-key"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
```

### **2. Installation**
```bash
npm install
```

### **3. Database Migration**
```bash
npx prisma db push
npx prisma generate
```

### **4. Run the App**
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### **5. API Documentation**
Once running, visit: `http://localhost:3000/api/docs`

---

## 📁 Standardized Response Format
```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    "result": [...],
    "meta": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```
