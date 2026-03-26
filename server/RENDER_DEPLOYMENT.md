# Render Deployment Guide for RelayChat Backend

## 🚀 **Deployment Steps**

### **1. Prepare Your Repository**
- Ensure your backend code is in the `/server` directory
- Add the new files: `Procfile` and `.env.example`
- Push changes to GitHub

### **2. Set Up Render Services**

#### **A. Web Service (Backend API)**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. **Configure:**
   - **Name**: `relaychat-backend`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (or paid for production)

#### **B. MongoDB (Database)**
1. Click **"New +"** → **"MongoDB"**
2. **Name**: `relaychat-db`
3. **Plan**: `Free` (or paid for production)
4. Copy the connection string

#### **C. Redis (Optional - for caching)**
1. Click **"New +"** → **"Redis"**
2. **Name**: `relaychat-redis`
3. Copy the connection string

### **3. Environment Variables**
In your Web Service settings, add these environment variables:

```bash
NODE_ENV=production
PORT=5002
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret_key
REDIS_URL=your_redis_connection_string  # if using Redis
CORS_ORIGIN=https://your-frontend-domain.vercel.app

# Twilio (if using SMS)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_phone_number
```

### **4. Update Frontend Environment Variables**
In your Vercel frontend, update:
```env
VITE_API_URL=https://relaychat-backend.onrender.com
VITE_SOCKET_URL=https://relaychat-backend.onrender.com
```

### **5. Deploy**
1. Push all changes to GitHub
2. Render will automatically deploy
3. Check the deployment logs

## 🔧 **Important Notes**

### **Port Configuration**
- Render uses port 5002 (as configured in your server)
- Render automatically handles HTTPS

### **Database Connection**
- Use MongoDB Atlas for production database
- Update `MONGODB_URI` in Render environment variables

### **File Uploads**
- Render's filesystem is ephemeral
- Consider using cloud storage (AWS S3, Cloudinary) for production

### **CORS Settings**
- Update `CORS_ORIGIN` to your Vercel frontend URL
- Test with `*` during development

### **WebSocket Support**
- Render supports WebSocket connections
- Socket.IO should work out of the box

## 🐛 **Troubleshooting**

### **Common Issues:**
1. **Database Connection**: Check MongoDB URI format
2. **CORS Errors**: Verify CORS_ORIGIN setting
3. **WebSocket Issues**: Ensure Render plan supports WebSockets
4. **File Uploads**: Use cloud storage for production

### **Logs:**
- Check Render logs for deployment issues
- Use `console.log` for debugging

## 📋 **Post-Deployment Checklist**
- [ ] Backend API is accessible
- [ ] Database connection works
- [ ] WebSocket connections work
- [ ] Frontend can connect to backend
- [ ] File uploads work (if applicable)
- [ ] SMS/Twilio works (if applicable)

## 🌐 **Production URLs**
- Backend: `https://relaychat-backend.onrender.com`
- Frontend: `https://your-app.vercel.app`
- Database: MongoDB Atlas
- Redis: Render Redis (if used)
