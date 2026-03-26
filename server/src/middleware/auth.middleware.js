const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    
    // Try to get token from Authorization header first
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no token in header, try to get from cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        message: "Access denied. No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next(); 
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

module.exports = authMiddleware;
