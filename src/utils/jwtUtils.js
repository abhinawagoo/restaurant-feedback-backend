// src/utils/jwtUtils.js
const jwt = require("jsonwebtoken");

// Generate token for admin users
exports.generateAdminToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      restaurantId: user.restaurantId,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Generate token for customers
exports.generateCustomerToken = (customer) => {
  return jwt.sign(
    {
      phone: customer.customerPhone,
      email: customer.customerEmail,
      name: customer.customerName,
      googleId: customer.googleId,
      restaurantId: customer.restaurantId,
      visitId: customer._id, // The customer visit ID
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};
