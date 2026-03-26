# Environment Variables Setup

## 📁 Files Created/Modified

### 1. Environment Configuration
- **`.env.example`** - Template for environment variables
- **`src/config/index.js`** - Centralized configuration file

### 2. Updated Services
- **`src/services/api.js`** - Uses `VITE_API_URL`
- **`src/services/socket.js`** - Uses `VITE_SOCKET_URL`
- **`src/services/e2ee.js`** - Uses both API and file URLs

## 🚀 How to Use

### For Development:
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your local backend URL:
   ```env
   VITE_API_URL=http://localhost:5002
   VITE_SOCKET_URL=http://localhost:5002
   ```

### For Production (Vercel Deployment):
1. In Vercel dashboard, go to **Settings → Environment Variables**
2. Add these variables:
   ```
   VITE_API_URL=https://your-backend-domain.com
   VITE_SOCKET_URL=https://your-backend-domain.com
   ```

## 🔧 Configuration Details

### Environment Variables:
- **`VITE_API_URL`** - Backend API server URL
- **`VITE_SOCKET_URL`** - Socket.IO server URL (usually same as API)

### Config File Features:
- **Fallback values** - Uses localhost if env vars not set
- **Endpoint helpers** - Dynamic URL generation
- **Type safety** - Centralized configuration management

## 📝 Usage in Code:

```javascript
import { config } from '../config';

// API calls
const response = await api.get('/users'); // Uses config.endpoints.base()

// Socket connection
const socket = io(config.socketUrl); // Uses config.socketUrl

// File URLs
const fileUrl = config.endpoints.files('/uploads/file.jpg');
```

## 🌍 Deployment Notes:

- **Vite automatically prefixes** env vars with `VITE_` for frontend access
- **No server-side access** - These variables are bundled into the frontend
- **Security** - Never store sensitive secrets in frontend env vars
- **Build-time** - Variables are embedded during build, not runtime
