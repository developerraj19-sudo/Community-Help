# 🏘️ Community Help Platform

A centralized platform for local emergency and utility services.
**Team 26_GB15 | Dept. of CS&E**

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Firebase Project (for OTP Authentication)
- Flutter SDK (for Mobile App)

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Firebase Admin credentials
npm install

# Start Backend (port 5000)
npm run dev
```

### 2. Setup React Web App (Frontend)

```bash
cd frontend
npm install

# Start React App (port 3000)
# (Using HTTPS=true to allow mobile Geolocation permissions)
npm start
```

### 3. Setup Flutter Mobile App

```bash
cd mobile
flutter pub get

# Run on emulator or physical device
flutter run
```

### 4. Setup AI Microservice (Optional)

```bash
cd other/ai-service
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

---

## 🔑 Authentication (Firebase OTP)

The application uses real **Phone Number + OTP** authentication powered by Firebase.
- You must enter a valid phone number.
- Firebase will send a real 6-digit OTP via SMS.
- Demo login and mock OTPs have been strictly removed for production readiness.
- Ensure your `firebase.js` is set up with your actual Firebase project keys.

---

## 🏗️ Architecture

```text
community-help-platform/
├── backend/                   # Node.js + Express API
│   ├── models/                # User, Provider, Emergency, ServiceRequest
│   ├── routes/                # authRoutes, providerRoutes, emergencyRoutes...
│   ├── config/                # firebase.js, db.js
│   └── server.js              # Entry point
│
├── frontend/                  # React + Tailwind Web App
│   ├── public/                # Vector SVG Favicons
│   ├── src/
│   │   ├── pages/             # Landing, UtilityServices, Emergency, Login...
│   │   ├── components/        # Navbar, AIChatbot...
│   │   └── api/               # Axios API config
│   └── package.json           # React Scripts (HTTPS enabled)
│
├── mobile/                    # Flutter Mobile App
│   ├── lib/
│   │   ├── screens/           # Login, Home, SOS, Services...
│   │   ├── services/          # API integrations
│   │   └── main.dart          # Entry point
│   └── pubspec.yaml
│
└── other/ai-service/          # Python AI Microservice
```

---

## ✨ Features Implemented

### 📱 Cross-Platform
- **Responsive Web App**: Perfectly scales on mobile browsers (stacking grids, collapsible mobile menus, vector SVGs).
- **Native Flutter App**: Dedicated mobile application for Android/iOS with real-time UI mapping.

### 🚨 Emergency Services (3 types)
- 🚑 **Ambulance SOS** — dispatches nearest hospital, shows ETA
- 🚔 **Police SOS** — alerts nearest station + complaint registration
- 🚒 **Fire Brigade SOS** — dispatches fire station
> **How it works (Core Logic):** When an SOS is triggered, the frontend captures the user's precise HTML5 Geolocation coordinates. The Node.js backend uses MongoDB's `$near` geospatial queries to scan the `Emergency` collections and instantly find the nearest relevant emergency facility. It then establishes a real-time Socket.io room to broadcast live ETA updates between the dispatched unit and the user.

### 🛠️ Utility Services
- 🔧 Plumber, Electrician, Carpenter, AC Repair, Appliance Repair
- 🏠 Cleaning, Maid, Cook (home services)
- ⭐ Live filtering, distance-based matching, and real-time scheduling.
> **How it works (Core Logic):** Utility Service booking uses a bipartite matching approach. Providers register with their skills, location, and availability. When a user requests a service (e.g., Plumber), the backend filters the `Provider` schema for `isAvailable: true` and calculates the Haversine distance to the user. Requests are pushed to the Provider's dashboard in real-time, allowing them to Accept/Reject based on their current workload.

### 🔒 Security & Auth
- Real **Firebase Phone OTP** Verification
- JWT session management
- Role-based access (User, Provider, Admin)
> **How it works (Core Logic):** To ensure platform integrity, we enforce Firebase Phone Auth. The user receives a real SMS OTP. Upon verification, the frontend sends the Firebase ID token to the Express backend. The backend verifies this token securely via the Firebase Admin SDK, ensuring the phone number is genuinely verified, before issuing a secure JSON Web Token (JWT) that dictates their Role-Based Access Control (RBAC) across the platform.

### 🤖 AI Chatbot
- Floating chat widget for quick emergency triage and service guidance.
> **How it works (Core Logic):** The React frontend communicates with a separate Python (FastAPI) microservice. This microservice acts as an NLP (Natural Language Processing) layer, interpreting the user's intent. If a user types "I smell gas", the AI detects the emergency intent and immediately prompts the frontend to trigger a Fire Brigade SOS, bypassing manual navigation.

---

## ⚙️ Environment Variables (.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/community-help
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

## 📱 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Frontend** | React 18, Tailwind CSS, Vite/Webpack |
| **Mobile App** | Flutter, Dart |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Authentication** | Firebase Auth (OTP), JWT |
| **Real-time** | Socket.io |
| **AI / Microservices** | Python, FastAPI |
