// Environment configuration for frontend
export const config = {
  // Backend API URL
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5002',
  
  // Socket.IO Server URL  
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002',
  
  // API endpoints
  endpoints: {
    base: () => `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api`,
    files: (fileUrl) => `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${fileUrl}`,
  }
};

export default config;
