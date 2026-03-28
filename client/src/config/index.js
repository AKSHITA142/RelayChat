// Environment configuration for frontend
export const config = {
  // Backend API URL
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5002',
  
  // Socket.IO Server URL  
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002',
  
  // API endpoints
  endpoints: {
    base: () => {
      const raw = import.meta.env.VITE_API_URL || 'http://localhost:5002';
      const normalized = raw.replace(/\/+$/, "");
      return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
    },
    files: (fileUrl) => {
      const raw = import.meta.env.VITE_API_URL || 'http://localhost:5002';
      return `${raw.replace(/\/+$/, "")}${fileUrl}`;
    },
  }
};

export default config;
