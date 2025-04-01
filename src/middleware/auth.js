// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect admin routes
exports.protectAdminRoute = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Get token from cookie
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Add user to request object
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// Middleware to check restaurant context
exports.verifyRestaurantAccess = (req, res, next) => {
  const { restaurantId } = req.params;

  if (!restaurantId) {
    return res.status(400).json({
      success: false,
      message: "Restaurant ID is required",
    });
  }

  // Check if user belongs to the requested restaurant
  if (req.user.restaurantId.toString() !== restaurantId) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this restaurant",
    });
  }

  next();
};

// Middleware to authenticate customer via phone number or Google
exports.authenticateCustomer = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Get token from cookie
    else if (req.cookies.customerToken) {
      token = req.cookies.customerToken;
    }

    // If no token, customer is accessing as a guest - still valid
    if (!token) {
      req.customer = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add customer info to request object
    req.customer = decoded;

    next();
  } catch (error) {
    // If token is invalid, treat as guest
    req.customer = null;
    next();
  }
};
