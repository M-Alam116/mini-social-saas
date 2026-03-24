# 🚀 Mini Social SaaS API

A robust social media backend designed for stability under load, featuring asynchronous write-processing and multi-process orchestration.

---

## 🛠️ Tech Stack & Infrastructure

*   **⚡ Framework**: [NestJS](https://nestjs.com/) (Module-based architecture)
*   **🗄️ Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
*   **🏎️ Caching**: Redis (ioredis) for Feed, Profile, and Aggregate hydration
*   **📬 Message Queue**: BullMQ (Redis-based) for asynchronous write-shaving
*   **🐳 Orchestration**: Docker Compose (Managed cluster of API, Redis, and Nginx)
*   **⚖️ Load Balancer**: Nginx (Reverse proxy and TCP connection buffering)
*   **⚙️ Process Management**: PM2 Cluster Mode for multi-core utilization
*   **📖 API Docs**: Swagger (OpenAPI 3.0)

---

## 🚀 Performance & Hardening

### **1. Database Layer Hardening**
*   **B-Tree Indexing**: Optimized for high-concurrency lookups on `user_id`, `post_id`, and `created_at`.
*   **Atomic Operations**: Uses `createMany` with `skipDuplicates` to prevent deadlocks during simultaneous like/unlike interactions.
*   **Smart Pooling**: Precision-tuned PostgreSQL connection pool to prevent exhaustion under heavy concurrent traffic.

### **2. Asynchronous Write-Shaving**
*   **Non-blocking Writes**: Likes and Comments are offloaded to **BullMQ** workers, removing database write latency from the API request path.
*   **Zero-DB validation**: Authenticated requests for interactions are validated against long-lived Redis caches to eliminate redundant DB reads.

### **3. Strategic Redis Caching**
*   **Atomic Counter Caching**: Post interaction counts (likes/comments) are maintained in real-time Redis counters to avoid expensive SQL `COUNT(*)` aggregates.
*   **Batch MGET Hydration**: The social feed utilizes Redis `MGET` batching to hydrate post metadata in a single network round-trip.
*   **Long-Term TTL**: Aggressive caching strategy for stable data (profiles and feed metadata) to protect the primary database.

### **4. Stability Verified**
*   **High-Concurrency Testing**: System stability verified under a sustained load of **500 Virtual Users** on a single host.
*   **Fault-Tolerant Logic**: Implemented atomic toggle logic to maintain data integrity across distributed workers.

---

## 🛠️ Setup & Deployment

### **1. Environment Setup**
Create a `.env` file:
```env
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/social"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secure-key"
DB_POOL_MAX=30
DB_POOL_MIN=10
```

### **2. Running with Docker (Recommended for Scale)**
The system is pre-configured to run as a load-balanced cluster:
```bash
docker-compose up --build -d
```
*Port mapping: `localhost:8080` (Nginx Balancer) or `localhost:3000` (Direct Node).*

### **3. Manual Installation (Development)**
```bash
npm install
npx prisma db push
npm run start:dev
```

---

## 🔭 Observability
*   **Query Profiling**: Built-in interceptor to log any SQL query exceeding 200ms.
*   **Performance Telemetry**: Global interceptor tracking Event Loop Lag and internal request duration.
*   **Load Testing**: Baseline scripts available in `mix-load-test.js` using `k6`.

---

## 📁 API Documentation
Once running, visit: `http://localhost:8080/api/docs`
