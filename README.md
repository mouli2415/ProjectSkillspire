# ⬡ SkillSpire — Elevate Your Career

> A full-stack web application for structured skill learning, progress tracking, and job discovery.

---

## 🗂 Project Structure

```
skillspire/
├── frontend/
│   ├── index.html          ← Single-page app (SPA)
│   ├── css/
│   │   └── style.css       ← All styles (CSS variables, responsive, animations)
│   └── js/
│       └── app.js          ← All JS (ES6+, Fetch API, DOM, events)
└── backend/
    ├── server.js           ← Express + Socket.IO + MongoDB entry....
    ├── package.json
    ├── routes/
    │   ├── authRoutes.js
    │   ├── skillRoutes.js
    │   ├── jobRoutes.js
    │   └── contactRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── skillController.js
    │   ├── jobController.js
    │   └── contactController.js
    ├── models/
    │   ├── User.js         ← Mongoose schema (name, email, password, skillsProgress)
    │   ├── Skill.js        ← title, description, category, level, rating, enrolled
    │   ├── Job.js          ← title, company, location, type, salary, requiredSkills
    │   └── Contact.js      ← name, email, message
    └── middleware/
        └── authMiddleware.js ← JWT verify + RBAC
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local on port 27017, or set `MONGO_URI` env var)
- npm

### Install & Run

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Start the server (MongoDB optional — falls back to in-memory mock)
node server.js

# 3. Open browser at:
#    http://localhost:3000
```

> **No MongoDB?** The app ships with a full in-memory mock. All API endpoints work out of the box — just run `node server.js` and open the browser.

---

## 🌐 API Endpoints

| Method | Endpoint                | Auth? | Description               |
|--------|-------------------------|-------|---------------------------|
| POST   | `/api/auth/signup`      | ✗     | Register new user         |
| POST   | `/api/auth/login`       | ✗     | Login, get JWT token      |
| GET    | `/api/auth/me`          | ✓     | Get current user profile  |
| GET    | `/api/skills`           | ✗     | List skills (paginated)   |
| POST   | `/api/skills/progress`  | ✓     | Update skill progress     |
| GET    | `/api/jobs`             | ✗     | List jobs (paginated)     |
| POST   | `/api/contact`          | ✗     | Submit contact form       |
| GET    | `/api/health`           | ✗     | Health check              |

### Query Parameters

**GET /api/skills**
- `page` (default: 1)
- `limit` (default: 10)
- `category` — Programming | Frontend | Backend | Database | Data | Design | DevOps
- `level` — Beginner | Intermediate | Advanced

**GET /api/jobs**
- `page`, `limit`
- `type` — Full-time | Part-time | Contract | Internship
- `search` — full-text across title, company, skills

---

## 🔐 Authentication

- **JWT** tokens (7-day expiry)
- Passwords hashed with **bcrypt** (12 rounds)
- Token sent as `Authorization: Bearer <token>` header
- Protected routes use `authMiddleware.js`
- Basic RBAC: `user` | `admin` roles on User model

---

## 🗄️ Database — MongoDB / Mongoose

### Users Collection
```js
{ name, email, password (hashed), role, skillsProgress: [{ skillId, skillTitle, progress, startedAt, completedAt }] }
```

### Skills Collection
```js
{ title, description, category, level, duration, rating, enrolled }
```

### Jobs Collection
```js
{ title, company, location, type, salary, requiredSkills[], description, logo }
```

### Contact Collection
```js
{ name, email, message, createdAt }
```

Database seeds automatically on first boot.

---

## 💡 JavaScript Concepts Covered

| Concept             | Where Used                                     |
|---------------------|------------------------------------------------|
| `const` / `let`     | Throughout `app.js`                            |
| Arrow functions     | All callbacks, API helpers                     |
| Async / Await       | `apiFetch`, `loadSkills`, `loadJobs`, auth     |
| Promises            | Fetch API calls                                |
| ES6 Classes         | `AppEventEmitter` in `app.js`                  |
| Array methods       | `.map()`, `.filter()`, `.find()`, `.reduce()`  |
| Objects & spread    | State object, user session                     |
| DOM manipulation    | Dynamic skill/job cards, modal open/close      |
| Event handling      | click, submit, input, scroll, keydown          |
| Template literals   | All HTML generation                            |
| Destructuring       | API response destructuring                     |
| `IntersectionObserver` | Counter animation trigger                  |
| `localStorage`      | Session persistence                            |

---

## ⚙️ Node.js Concepts Covered

| Concept              | Where                                         |
|----------------------|-----------------------------------------------|
| `http` module        | `http.createServer(app)` in server.js         |
| `fs` module          | Log file write stream in server.js            |
| `EventEmitter`       | `appEvents` — db:connected, server:started    |
| Express Router       | Separate route files per resource             |
| Middleware           | cors, cookie-parser, express-session, auth    |
| MVC Pattern          | routes → controllers → models                 |
| Async/Await          | All controller functions                      |
| Callbacks/Promises   | Mongoose operations                           |
| Socket.IO            | Real-time chat events (ws upgrade)            |
| Error handling       | Global error middleware                       |

---

## 🧪 Testing with Postman

### 1. Signup
```
POST http://localhost:3000/api/auth/signup
Body (JSON): { "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }
```

### 2. Login
```
POST http://localhost:3000/api/auth/login
Body (JSON): { "email": "jane@example.com", "password": "secret123" }
→ Copy the "token" from response
```

### 3. Get Skills
```
GET http://localhost:3000/api/skills?page=1&limit=6
```

### 4. Update Progress (requires token)
```
POST http://localhost:3000/api/skills/progress
Headers: Authorization: Bearer <your-token>
Body: { "skillId": "...", "skillTitle": "JavaScript Fundamentals", "progress": 45 }
```

### 5. Get Jobs
```
GET http://localhost:3000/api/jobs?type=Full-time&search=React
```

### 6. Contact
```
POST http://localhost:3000/api/contact
Body: { "name": "Jane", "email": "jane@example.com", "message": "Hello, I love SkillSpire!" }
```

---

## 🎨 Frontend Features

- **SPA routing** — no page reloads, JS-driven navigation
- **Responsive** — mobile hamburger menu, fluid grids
- **Form validation** — client-side with field-level error messages
- **Animated hero** — CSS keyframes, staggered reveals, floating cards
- **Animated counters** — IntersectionObserver + setInterval
- **Skill cards** — live progress bars, enroll/continue buttons
- **Job board** — search + filter by type, paginated
- **Dashboard** — progress sliders, completion tracking
- **Toast notifications** — success/error feedback
- **JWT session** — persisted via localStorage, restored on page load

---

## 📦 Dependencies

```json
{
  "express":         "^4.18.2",
  "mongoose":        "^7.5.0",
  "jsonwebtoken":    "^9.0.0",
  "bcryptjs":        "^2.4.3",
  "cors":            "^2.8.5",
  "cookie-parser":   "^1.4.6",
  "express-session": "^1.17.3",
  "socket.io":       "^4.6.1"
}
```

---

## 🌿 Environment Variables (optional)

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/skillspire
JWT_SECRET=your-secret-key
```

---

*Built with Node.js · Express · MongoDB · HTML5 · CSS3 · JavaScript (ES6+)*
