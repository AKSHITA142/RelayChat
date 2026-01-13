const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // get auth header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided"
      });
    }

    // format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Invalid token format"
      });
    }

    // verify token
    const decoded = jwt.verify(token, "SECRET_KEY");

    // attach user to request
    req.user = decoded;

    next(); // allow request to continue

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

module.exports = authMiddleware;
