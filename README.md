# 💬 RelayChat

> A full-stack, real-time messaging application with **end-to-end encryption**, **WebRTC video calling**, and **multi-device support** — built for privacy-first communication.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://mongoosejs.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://vercel.com/)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Data Models](#-data-models)
- [API Routes](#-api-routes)
- [Socket Events](#-socket-events)
- [End-to-End Encryption](#-end-to-end-encryption)
- [Environment Setup](#-environment-setup)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)

---

## 🌟 Overview

RelayChat is a production-grade, real-time chat application that prioritizes **user privacy** through client-side end-to-end encryption. Messages are encrypted in the browser before being sent, meaning the server never sees plaintext. It supports direct and group chats, WebRTC-based video calls, voice messages, file attachments, and a cross-device history sync protocol — all wrapped in a polished, themeable UI.

**Live Demo:** `https://relay-chat-am.vercel.app`  
**Backend API:** `https://relaychat-backend.onrender.com`

---

## ✨ Features

| Category | Features |
|---|---|
| **Authentication** | Email/Password login, Email OTP (passwordless), Google OAuth 2.0 |
| **Messaging** | Real-time messaging, Group chats, Reply-to messages, Reactions (emoji), Edit & delete messages (for me / for everyone) |
| **Media** | File attachments (encrypted), Voice messages (recording + waveform player), Avatar upload |
| **Encryption** | AES-256-GCM message encryption, RSA-OAEP 2048-bit key wrapping, Per-device key registration, Cloud key backup (PIN-protected), Multi-device history sync |
| **Calls** | WebRTC peer-to-peer video & audio calls, ICE/STUN negotiation, Mute/Camera toggle, Renegotiation support |
| **Presence** | Online/offline status, Last seen timestamps, Typing indicators, Read receipts (seen/delivered) |
| **Privacy** | Signal Visibility toggle (hide online status), Vault Protocol mode, Unread counts per user |
| **UI/UX** | Multiple chat themes, GSAP scroll animations, Framer Motion transitions, Dark mode, Responsive layout |
| **Admin** | Admin-only user deletion route, Role-based middleware |

---

## 🛠 Tech Stack

### Frontend (Client)
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI framework |
| **Vite** | 7.x | Build tool & dev server |
| **React Router DOM** | 7.x | Client-side routing |
| **Socket.io Client** | 4.x | Real-time WebSocket communication |
| **Framer Motion** | 12.x | Page & component animations |
| **GSAP** | 3.x | Scroll reveal animations |
| **Axios** | 1.x | HTTP client with interceptors |
| **TailwindCSS** | 3.x | Utility-first styling |
| **Radix UI** | Latest | Accessible dialog primitives |
| **Lucide React** | Latest | Icon library |
| **@react-oauth/google** | Latest | Google OAuth integration |
| **Web Crypto API** | Native | RSA-OAEP + AES-GCM encryption (browser built-in) |

### Backend (Server)
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | LTS | JavaScript runtime |
| **Express** | 5.x | HTTP server framework |
| **Socket.io** | 4.x | WebSocket server |
| **Mongoose** | 9.x | MongoDB ODM |
| **MongoDB** | Cloud (Atlas) | Primary database |
| **JSON Web Token** | 9.x | Auth token signing |
| **bcryptjs** | 3.x | Password hashing |
| **Multer** | 2.x | File upload middleware |
| **Helmet** | 8.x | Security HTTP headers (CSP, CORP, COOP) |
| **express-rate-limit** | 8.x | API rate limiting |
| **@sendgrid/mail** | 8.x | OTP email delivery |
| **google-auth-library** | 10.x | Google ID token verification |
| **cookie-parser** | 1.x | HTTP-only cookie auth |
| **cors** | 2.x | Cross-origin resource sharing |
| **nodemon** | 3.x | Dev auto-reload |

### Infrastructure & DevOps
| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting & CDN |
| **Render** | Backend hosting |
| **MongoDB Atlas** | Cloud database |
| **SendGrid** | Transactional email (OTP) |
| **Google STUN Servers** | WebRTC ICE negotiation |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │  React   │   │  Axios   │   │ Socket   │   │ Web Crypto │  │
│  │  Pages & │   │  HTTP    │   │ .io      │   │ API (E2EE) │  │
│  │ Comps    │   │  Client  │   │ Client   │   │ RSA + AES  │  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └─────┬──────┘  │
│       │              │              │                │          │
│       └──────────────┴──────────────┴────────────────┘          │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────┼──────────────────────────────────┐
│                        SERVER (Node.js)                         │
│                              │                                  │
│  ┌───────────────────────────┴─────────────────────────────┐    │
│  │                     Express App                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │    │
│  │  │  Auth    │  │  User    │  │  Chat    │  │Message │  │    │
│  │  │  Routes  │  │  Routes  │  │  Routes  │  │Routes  │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │    │
│  │          ↓ Controllers ↓ Middleware (JWT, Rate Limit)   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Socket.io Server (socket.js)                 │  │
│  │   Messaging | Typing | Presence | Video Signaling | E2EE  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ Mongoose ODM
┌──────────────────────────────┼──────────────────────────────────┐
│                     MongoDB Atlas                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐   │
│   │  Users   │  │  Chats   │  │ Messages │  │  EmailOtps  │   │
│   └──────────┘  └──────────┘  └──────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User Action
    │
    ▼
React Component
    │
    ├── REST (Axios) ──► Express Router ──► Middleware (JWT Auth / Rate Limit)
    │                           │
    │                           ▼
    │                     Controller
    │                           │
    │                           ▼
    │                    Mongoose Model ──► MongoDB Atlas
    │
    └── WebSocket ──► Socket.io Server ──► Broadcast to Room
             ▲
             └── JWT verified on handshake
```

---

## 📁 Project Structure

```
RelayChat/
├── client/                         # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ChatWindow.jsx      # Main chat area (messages, input, attachments)
│   │   │   ├── Sidebar.jsx         # Chat list, search, contacts
│   │   │   ├── Login.jsx           # Login form (password + OTP + Google)
│   │   │   ├── Register.jsx        # Registration flow
│   │   │   ├── Settings.jsx        # Profile, Privacy, Backup tabs
│   │   │   ├── VideoCall.jsx       # WebRTC video call UI
│   │   │   ├── Message.jsx         # Individual message bubble
│   │   │   ├── VoiceRecorder.jsx   # Audio recording component
│   │   │   ├── WaveformPlayer.jsx  # Audio message playback
│   │   │   ├── ReactionPicker.jsx  # Emoji reaction picker
│   │   │   ├── ContactInfoPanel.jsx
│   │   │   ├── ThemeSelector.jsx
│   │   │   ├── auth/               # Auth sub-components
│   │   │   ├── chat/               # Chat sub-components
│   │   │   ├── message/            # Message sub-components
│   │   │   ├── stitch/             # MCP Stitch integration
│   │   │   └── ui/                 # Base UI primitives (Avatar, Button, Input, Switch)
│   │   │
│   │   ├── pages/
│   │   │   ├── Auth.jsx            # Auth page (login/register switcher)
│   │   │   └── chat.jsx            # Main chat page (layout + socket setup)
│   │   │
│   │   ├── services/
│   │   │   ├── api.js              # Axios instance with interceptors
│   │   │   ├── socket.js           # Socket.io client singleton
│   │   │   └── e2ee.js             # Full E2EE implementation (RSA + AES)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useChatTheme.js     # Theme state & CSS class resolver
│   │   │   ├── useChatSearch.js    # Chat search/filter logic
│   │   │   └── useGsapScrollReveal.js
│   │   │
│   │   ├── utils/
│   │   │   ├── auth.js             # Token validation helpers
│   │   │   └── navigation.js       # URL redirect utilities
│   │   │
│   │   ├── config/                 # API endpoint config
│   │   ├── lib/                    # Shared utilities (cn, etc.)
│   │   ├── App.jsx                 # Root component with auth gate
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles + theme tokens
│   │
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json                 # Vercel deployment config
│   └── package.json
│
├── server/                         # Express + Socket.io backend
│   ├── src/
│   │   ├── app.js                  # Express app (CORS, Helmet, routes)
│   │   ├── server.js               # HTTP server entry point
│   │   ├── socket.js               # Socket.io server (all real-time logic)
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js  # Login, OTP, Google OAuth, Register
│   │   │   ├── user.controller.js  # Profile, contacts, encryption keys, backup
│   │   │   ├── chat.controller.js  # Create/get/delete chats, group management
│   │   │   └── message.controller.js # Fetch messages, reactions, file upload
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js      # /api/auth/*
│   │   │   ├── user.routes.js      # /api/user/*
│   │   │   ├── chat.routes.js      # /api/chat/*
│   │   │   ├── message.routes.js   # /api/message/*
│   │   │   └── admin.route.js      # /api/admin/*
│   │   │
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Chat.js
│   │   │   ├── Message.js
│   │   │   └── EmailOtp.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js  # JWT token verification
│   │   │   ├── role.middleware.js  # Admin role guard
│   │   │   ├── rateLimit.js        # express-rate-limit config
│   │   │   └── upload.middleware.js # Multer file upload config
│   │   │
│   │   ├── config/
│   │   │   ├── db.js               # MongoDB connection
│   │   │   └── sendgrid.js         # Email delivery config
│   │   │
│   │   └── utils/
│   │
│   ├── uploads/                    # Static file storage (avatars, attachments)
│   ├── Procfile                    # Render process definition
│   └── package.json
│
├── package.json                    # Root-level shared deps
└── README.md
```

---

## 🗃 Data Models

### User
```js
{
  name, email, phoneNumber, password (hashed),
  avatar, status, role: ["user" | "admin"],
  isOnline, lastSeen, lastLoginAt,
  signalVisibility,       // Hide/show online status to others
  vaultProtocol,          // Privacy mode flag
  globalTheme,            // UI theme preference
  encryptionPublicKey,    // RSA public key (JWK format) for E2EE
  encryptionDevices: [    // Per-device public key registry
    { deviceId, publicKey, label, lastSeenAt }
  ],
  encryptedBackupKey,     // AES-encrypted private key (cloud backup)
  backupSalt,             // PBKDF2 salt for backup key derivation
  contacts: [{ userId, savedName }]
}
```

### Chat
```js
{
  participants: [userId],
  isGroup, groupName, groupAdmin,
  lastMessage: messageId,
  unreadCounts: Map<userId, number>,
  visibleTo: [userId],    // Soft-delete visibility control
  deletedBy: [userId],
  pinnedMessages: [messageId]
}
```

### Message
```js
{
  sender, chat,
  content,                // Plaintext (when E2EE disabled)
  encryptedContent: {     // E2EE payload
    ciphertext, iv, algorithm, version,
    encryptedKeys: [{ userId, deviceId, key }]  // Per-device AES key (RSA-wrapped)
  },
  fileUrl, fileType, fileName,
  encryptedFile: {        // Encrypted attachment metadata
    iv, metadataIv, metadataCiphertext, algorithm, version, size,
    encryptedKeys: [...]
  },
  status: "sent" | "delivered" | "seen",
  seenBy: [{ userId, readAt }],
  reactions: [{ emoji, user }],
  replyTo: messageId,
  isEdited, isDeleted,
  deletedFor: [userId]
}
```

### EmailOtp
```js
{
  email, otpHash (HMAC-SHA256),
  expiresAt, attemptCount, lastSentAt
}
```

---

## 🌐 API Routes

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| `POST` | `/login` | Email + password login |
| `POST` | `/send-email-otp` | Send 6-digit OTP to email |
| `POST` | `/verify-email-otp` | Verify OTP & login/register |
| `POST` | `/complete-registration` | Set name/phone after OTP |
| `POST` | `/google` | Google OAuth login |
| `POST` | `/logout` | Clear auth cookie |

### User — `/api/user`
| Method | Path | Description |
|---|---|---|
| `GET` | `/profile` | Get current user profile |
| `PUT` | `/profile` | Update name, status, theme, privacy |
| `POST` | `/profile/avatar` | Upload avatar image |
| `POST` | `/encryption-key` | Register device public key |
| `POST` | `/backup` | Upload encrypted private key backup |
| `GET` | `/backup` | Download encrypted key backup |
| `POST` | `/verify-reset` | Verify phone for backup PIN reset |
| `GET/POST` | `/contacts` | Manage contact list |
| `POST` | `/history-sync` | Push E2EE message key to new device |

### Chat — `/api/chat`
| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Get all chats for current user |
| `POST` | `/` | Create or fetch a direct chat |
| `POST` | `/group` | Create group chat |
| `PUT` | `/:chatId/group` | Update group details |
| `DELETE` | `/:chatId` | Delete/hide chat |

### Message — `/api/message`
| Method | Path | Description |
|---|---|---|
| `GET` | `/:chatId` | Fetch messages for a chat |
| `POST` | `/upload` | Upload file attachment |
| `POST` | `/:messageId/react` | Add/remove emoji reaction |

### Admin — `/api/admin`
| Method | Path | Description |
|---|---|---|
| `DELETE` | `/user/:id` | Delete user (admin only) |

---

## ⚡ Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join-chat` | `chatId` | Join a chat room |
| `send-message` | `{ chatId, content, encryptedPayload, clientTempId, replyToId }` | Send a message |
| `edit-message` | `{ chatId, messageId, newContent, newEncryptedPayload }` | Edit a message |
| `mark-seen` | `{ chatId }` | Mark all messages as read |
| `typing` | `chatId` | Start typing indicator |
| `stop-typing` | `chatId` | Stop typing indicator |
| `open-chat` | `chatId` | Reset unread count |
| `close-chat` | `chatId` | Unset active chat |
| `delete-for-me` | `{ messageId }` | Hide message for self |
| `delete-for-everyone` | `{ messageId, chatId }` | Delete message for all |
| `call-user` | `{ to, offer, fromName }` | Initiate WebRTC call |
| `answer-call` | `{ to, answer }` | Accept WebRTC call |
| `ice-candidate` | `{ to, candidate }` | Exchange ICE candidate |
| `end-call` | `{ to }` | End video call |
| `request-history-sync` | `{ requesterDeviceId, requesterLabel, requesterPublicKey }` | Request E2EE history from another device |
| `respond-history-sync` | `{ requestId, approved }` | Approve/deny history sync request |
| `logout` | — | Disconnect socket cleanly |

### Server → Client
| Event | Description |
|---|---|
| `new-message` | Broadcast new message to room |
| `message-delivered` | Delivery acknowledgement |
| `message-seen` | Read receipt with reader info |
| `message-edited` | Broadcast edited message |
| `message-deleted-for-everyone` | Broadcast deletion |
| `message-deleted-for-me` | Self-only deletion confirmation |
| `new-chat` | Notify participants of first message |
| `typing` / `stop-typing` | Typing indicators |
| `chat-opened` | Notify room that a user opened the chat |
| `user-online` / `user-offline` | Presence broadcasts |
| `online-users` | List of currently online users (on connect) |
| `incoming-call` | WebRTC call invitation |
| `call-accepted` | WebRTC answer from callee |
| `call-ended` | Remote ended the call |
| `history-sync-requested` | Forward sync request to other devices |
| `history-sync-response` | Forward sync approval to requester |
| `history-sync-complete` | Sync finished notification |

---

## 🔐 End-to-End Encryption

RelayChat implements a **hybrid RSA + AES encryption scheme** entirely in the browser using the native **Web Crypto API** — the server never handles plaintext messages.

### How It Works

```
Sender                          Server                    Recipient
  │                               │                           │
  │  1. Generate AES-256 key      │                           │
  │  2. Encrypt message with AES  │                           │
  │  3. For each recipient device:│                           │
  │     Encrypt AES key with      │                           │
  │     their RSA-2048 public key │                           │
  │                               │                           │
  │──── send-message ────────────►│                           │
  │     { ciphertext, iv,         │                           │
  │       encryptedKeys: [        │                           │
  │         { userId, deviceId,   │                           │
  │           key: RSA(AES key) } │                           │
  │       ] }                     │                           │
  │                               │──── new-message ─────────►│
  │                               │                           │ 4. Find own entry
  │                               │                           │    in encryptedKeys
  │                               │                           │ 5. Decrypt AES key
  │                               │                           │    with private RSA key
  │                               │                           │ 6. Decrypt ciphertext
  │                               │                           │    with AES key
  │                               │                           │ → Plaintext visible
```

### Key Storage & Lifecycle

- **Private key** is stored in `localStorage` (never leaves the browser)
- **Public key** is registered with the server per device on first login
- **Cloud Backup**: Private key can be backed up to the server, encrypted with a user-chosen PIN using PBKDF2 key derivation + AES-GCM
- **Multi-device sync**: When a new device logs in, it can request history from an existing trusted device via Socket.io — the existing device re-wraps message keys for the new device's public key

### Algorithms Used

| Purpose | Algorithm |
|---|---|
| Message & file encryption | AES-256-GCM |
| Key wrapping (per device) | RSA-OAEP (2048-bit, SHA-256) |
| Private key backup | PBKDF2 (100,000 iterations, SHA-256) → AES-256-GCM |
| OTP hashing | HMAC-SHA256 |
| Password hashing | bcrypt (salt rounds: 10) |
| Session tokens | JWT (HS256, 5h expiry) |

---

## ⚙️ Environment Setup

### Server `.env`
```env
PORT=5002
NODE_ENV=development

MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/relaychat

JWT_SECRET=your_jwt_secret
OTP_SECRET=your_otp_secret

SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM=noreply@yourdomain.com

GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

BASE_URL=http://localhost:5002
CORS_ORIGIN=http://localhost:5173

OTP_TTL_SECONDS=300
OTP_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
```

### Client `.env`
```env
VITE_API_URL=http://localhost:5002
VITE_SOCKET_URL=http://localhost:5002
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/RelayChat.git
cd RelayChat
```

### 2. Setup & Run the Server
```bash
cd server
npm install
# Copy and fill in the .env file
cp .env.example .env
npm run dev
# Server runs on http://localhost:5002
```

### 3. Setup & Run the Client
```bash
cd client
npm install
# Copy and fill in the .env file
cp .env.example .env
npm run dev
# Client runs on http://localhost:5173
```

### 4. Seed Mock Data (Optional)
```bash
cd server
node seed-mock-data.js
```

---

## ☁️ Deployment

### Frontend → Vercel
1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `client`
3. Add environment variables from `client/.env`
4. Deploy — Vercel handles the SPA routing via `vercel.json`

### Backend → Render
1. Create a new **Web Service** on Render
2. Set **Root Directory** to `server`
3. Set **Start Command**: `node src/server.js`
4. Add all environment variables from `server/.env`
5. Set `NODE_ENV=production`

> See [`server/RENDER_DEPLOYMENT.md`](server/RENDER_DEPLOYMENT.md) for detailed Render setup instructions.

---

## 🔒 Security Highlights

- **HTTP-only cookies** for auth tokens (XSS-safe)
- **Helmet.js** with custom CSP, CORP, and COOP headers
- **Rate limiting** on all `/api` routes
- **HMAC-SHA256** OTP hashing with timing-safe comparison
- **bcrypt** password hashing (never stored in plaintext)
- **JWT** with short expiry (5h) and role claims
- **E2EE** — server is a blind relay for encrypted messages
- **CORS** restricted to known origins + `.vercel.app` wildcard

---

## 📄 License

ISC License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ by Akshita*