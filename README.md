# CBC Senior School Management System

A complete, production-ready school management system for Kenyan CBC Senior Schools (Grades 10, 11, 12). Built with the MERN stack (MongoDB, Express, React, Node.js) with M-PESA integration for fee payments.

## Features

### User Roles & Permissions
| Role | Access |
|------|--------|
| **Admin** | Full access - manage users, fees, marks, news, payments, settings |
| **Teacher** | Enter/view marks for own class/subject, create assignments, mark attendance, view timetable |
| **Student** | View own marks, fees, assignments, attendance, timetable. Pay fees via M-PESA |
| **School Worker** | View assigned tasks, school news, events |
| **Community Member** | View public news and events only |

### Core Features
- **CBC Competency-Based Assessment** - Beginning (B), Approaching (A), Meeting (M), Exceeding (E)
- **Three Pathways** - STEM, Arts & Sports, Social Sciences
- **M-PESA Integration** - Lipa Na M-PESA STK Push for fee payments
- **PDF Report Cards** - CBC format with competency levels
- **Push Notifications** - Fee reminders, assignment deadlines
- **Attendance Tracking** - Daily per-class attendance
- **Digital Timetable** - Weekly schedule per class
- **Assignment System** - Create, submit, grade with file uploads
- **News & Events** - Public and internal announcements
- **Multi-year Support** - 2026 to 2030

## Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **MongoDB** + **Mongoose** - Database with ODM
- **JWT** - Authentication with httpOnly cookies
- **pdfkit** - PDF report generation
- **node-cron** - Scheduled tasks (fee reminders, assignment alerts)
- **Firebase Admin** - Push notifications (FCM)
- **helmet, cors, rate-limit** - Security middleware

### Frontend
- **React 18** + **Vite** - Fast development and build
- **React Router v6** - Client-side routing with role-based protection
- **Tailwind CSS** - Utility-first responsive design
- **Axios** - HTTP client with interceptors and token refresh
- **Recharts** - Charts and graphs
- **Lucide React** - Modern icon set
- **Custom Toast** - Notification system

## Project Structure

```
school-management-system/
├── backend/
│   ├── server.js                 # Express server entry point
│   ├── package.json
│   ├── .env.example              # Environment variables template
│   └── src/
│       ├── config/
│       │   └── db.js             # MongoDB connection
│       ├── models/
│       │   ├── User.js           # User model (all roles)
│       │   ├── Mark.js           # CBC marks with competency levels
│       │   ├── Fee.js            # Fee tracking per student/term
│       │   ├── Payment.js        # Payment records (M-PESA + manual)
│       │   ├── Assignment.js     # Teacher assignments
│       │   ├── Submission.js     # Student submissions
│       │   ├── Attendance.js     # Daily attendance
│       │   ├── Timetable.js      # Class schedule
│       │   ├── News.js           # School announcements
│       │   └── Event.js          # School events
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── userController.js
│       │   ├── markController.js
│       │   ├── feeController.js
│       │   ├── paymentController.js   # M-PESA integration
│       │   ├── assignmentController.js
│       │   ├── attendanceController.js
│       │   ├── timetableController.js
│       │   ├── newsController.js
│       │   └── reportController.js    # PDF generation
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── userRoutes.js
│       │   ├── markRoutes.js
│       │   ├── feeRoutes.js
│       │   ├── paymentRoutes.js
│       │   ├── assignmentRoutes.js
│       │   ├── attendanceRoutes.js
│       │   ├── timetableRoutes.js
│       │   ├── newsRoutes.js
│       │   └── reportRoutes.js
│       ├── middleware/
│       │   ├── auth.js           # JWT verify, role checker
│       │   ├── error.js          # Error handler
│       │   └── upload.js         # File upload (multer)
│       └── services/
│           └── notificationService.js  # FCM + cron jobs
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Router setup with protected routes
│       ├── index.css             # Tailwind + custom components
│       ├── utils/
│       │   └── api.js            # Axios instance with interceptors
│       ├── context/
│       │   ├── AuthContext.jsx   # Auth state management
│       │   └── ToastContext.jsx  # Toast notifications
│       ├── components/
│       │   ├── Navbar.jsx        # Role-based navigation
│       │   ├── Footer.jsx
│       │   └── Loading.jsx
│       └── pages/
│           ├── LandingPage.jsx
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           ├── ForgotPasswordPage.jsx
│           ├── PublicNewsPage.jsx
│           ├── admin/
│           │   ├── AdminDashboard.jsx
│           │   ├── AdminUsers.jsx
│           │   ├── AdminFees.jsx
│           │   ├── AdminMarks.jsx
│           │   ├── AdminPayments.jsx
│           │   ├── AdminNews.jsx
│           │   └── AdminSettings.jsx
│           ├── teacher/
│           │   ├── TeacherDashboard.jsx
│           │   ├── TeacherMarks.jsx
│           │   ├── TeacherAssignments.jsx
│           │   ├── TeacherAttendance.jsx
│           │   └── TeacherTimetable.jsx
│           ├── student/
│           │   ├── StudentDashboard.jsx
│           │   ├── StudentMarks.jsx
│           │   ├── StudentFees.jsx
│           │   ├── StudentAssignments.jsx
│           │   ├── StudentAttendance.jsx
│           │   └── StudentTimetable.jsx
│           └── worker/
│               └── WorkerDashboard.jsx
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB (local or Atlas)
- M-PESA Daraja API account (for payments)
- Firebase project (for push notifications, optional)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# Required: MONGO_URI, JWT_SECRET
# Optional: M-PESA keys, Firebase credentials, Email config
```

**Environment Variables (.env):**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/cbc_school_db
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
FRONTEND_URL=http://localhost:5173

# M-PESA Daraja API
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/mpesa/callback

# Firebase (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# Email (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Start the backend:**
```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### 3. Seed Initial Data (Optional)

Create an admin user and sample data by running:
```bash
cd backend
node src/utils/seed.js
```

## API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Private | Get current user |
| POST | `/api/auth/refresh` | Public | Refresh token |
| POST | `/api/auth/logout` | Private | Logout |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| PUT | `/api/auth/reset-password/:token` | Public | Reset password |
| PUT | `/api/auth/update-password` | Private | Update password |

### Users (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users (with pagination, search, filter) |
| GET | `/api/users/stats` | Get user statistics |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Marks
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/marks` | All (role-filtered) | Get marks |
| GET | `/api/marks/summary/:studentId` | All | Student marks summary |
| POST | `/api/marks` | Admin, Teacher | Create mark |
| POST | `/api/marks/bulk` | Admin, Teacher | Bulk create marks |
| PUT | `/api/marks/:id` | Admin, Teacher | Update mark |
| PUT | `/api/marks/:id/approve` | Admin | Approve mark |
| DELETE | `/api/marks/:id` | Admin | Delete mark |

### Fees
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/fees` | Admin: all, Student: own | Get fees |
| GET | `/api/fees/stats` | Admin | Fee statistics |
| POST | `/api/fees` | Admin | Create fee record |
| POST | `/api/fees/bulk` | Admin | Bulk create fees |
| PUT | `/api/fees/:id` | Admin | Update fee |
| DELETE | `/api/fees/:id` | Admin | Delete fee |

### Payments (M-PESA)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/payments/mpesa/stkpush` | Private | Initiate STK Push |
| POST | `/api/payments/mpesa/callback` | Public | M-PESA callback |
| POST | `/api/payments/mpesa/validation` | Public | M-PESA validation |
| GET | `/api/payments/mpesa/query/:id` | Private | Query STK status |
| GET | `/api/payments` | All (role-filtered) | Get payments |
| POST | `/api/payments/manual` | Admin | Record manual payment |

### Assignments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/assignments` | All (role-filtered) | Get assignments |
| POST | `/api/assignments` | Admin, Teacher | Create assignment |
| POST | `/api/assignments/:id/submit` | Student | Submit assignment |
| GET | `/api/assignments/:id/submissions` | Admin, Teacher | View submissions |
| PUT | `/api/assignments/:aid/submissions/:sid` | Admin, Teacher | Grade submission |
| DELETE | `/api/assignments/:id` | Admin, Teacher | Delete assignment |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/attendance` | Attendance management |
| GET/POST/PUT/DELETE | `/api/timetable` | Timetable management |
| GET | `/api/news` | News (public for community, all for logged-in) |
| POST/PUT/DELETE | `/api/news` | News (admin only) |
| GET | `/api/news/events` | Events |
| GET | `/api/reports/generate/:studentId/:term/:year` | Generate PDF report |

## M-PESA Integration

### How It Works

1. **Student clicks "Pay via M-PESA"** on their fees page
2. **Frontend sends STK Push request** to backend with student ID, amount, phone number
3. **Backend calls Safaricom Daraja API** to initiate Lipa Na M-Pesa Online
4. **Student receives M-PESA prompt** on their phone
5. **Student enters M-PESA PIN** to complete payment
6. **Safaricom calls our callback URL** with payment result
7. **Backend updates payment record** and student's fee balance automatically
8. **Student sees updated balance** in real-time

### Configuration Steps

1. Register at [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Create a new app to get Consumer Key and Consumer Secret
3. For production, apply for Paybill shortcode
4. Add your callback URL to the Daraja portal
5. Update `.env` with your credentials

### Idempotency

The system prevents double payments by:
- Checking for existing completed transactions with the same transaction ID
- Using unique CheckoutRequestID for each STK Push
- Storing all callback data for audit trail

## Security Features

- **JWT Authentication** with httpOnly cookies and refresh token rotation
- **Role-Based Access Control** - every route checks user permissions
- **Input Validation** - express-validator on all inputs
- **Rate Limiting** - prevents brute force attacks
- **Helmet.js** - security headers (XSS, clickjacking, etc.)
- **CORS** - configured for frontend origin only
- **Password Hashing** - bcrypt with salt rounds
- **MongoDB Indexing** - unique constraints on email, admission number, transaction ID
- **File Upload Validation** - type and size restrictions

## Deployment Guide

### Backend Deployment (Railway / Render / DigitalOcean)

**Option 1: Railway (Easiest)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Option 2: Render**
1. Push code to GitHub
2. Connect repository on Render
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy

**Option 3: DigitalOcean Droplet**
```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js and MongoDB
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs mongodb

# Clone and setup
git clone your-repo
cd backend
npm install --production
cp .env.example .env
# Edit .env

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name "cbc-school-api"
pm2 save
pm2 startup

# Use Nginx as reverse proxy
apt-get install nginx
# Configure /etc/nginx/sites-available/cbc-school
```

### Frontend Deployment (Vercel / Netlify)

**Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

**Option 2: Netlify**
```bash
# Build and deploy
cd frontend
npm run build
# Upload dist/ folder to Netlify or connect GitHub repo
```

**Important:** Set `VITE_API_URL` environment variable to your deployed backend URL.

### MongoDB Atlas (Database)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create database user with read/write access
4. Whitelist your server IP (or 0.0.0.0/0 for all)
5. Get connection string and update `MONGO_URI` in `.env`

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (64+ characters)
- [ ] Configure CORS for production frontend URL only
- [ ] Set up SSL/HTTPS (Let's Encrypt)
- [ ] Configure M-PESA production credentials
- [ ] Set up Firebase for push notifications
- [ ] Configure email for password reset
- [ ] Set up database backups
- [ ] Enable MongoDB Atlas monitoring
- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Configure CDN for static assets
- [ ] Set up domain and DNS

## Competency Levels

| Score Range | Level | Label | Color |
|------------|-------|-------|-------|
| 80-100% | E | Exceeding | Green |
| 65-79% | M | Meeting | Blue |
| 50-64% | A | Approaching | Yellow |
| 0-49% | B | Beginning | Red |

## CBC Pathways

### STEM
Physics, Chemistry, Biology, Mathematics, Computer Science

### Arts & Sports
Music, Drama, Fine Art, Sports Science, Physical Education

### Social Sciences
History, Geography, Business Studies, CRE/IRE, Languages

## License

MIT License - Free for educational use.

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Built for Kenyan CBC Senior Schools | 2026-2030**
