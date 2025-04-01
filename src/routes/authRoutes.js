// src/routes/authRoutes.js
const express = require("express");
const {
  registerRestaurant,
  loginAdmin,
  logout,
  getMe,
  customerPhoneAuth,
  customerGoogleAuth,
} = require("../controllers/authController");
const { protectAdminRoute } = require("../middleware/auth");

const router = express.Router();

// Admin routes
router.post("/register", registerRestaurant);
router.post("/login", loginAdmin);
router.get("/logout", logout);
router.get("/me", protectAdminRoute, getMe);

// Customer authentication routes
router.post("/customer/phone", customerPhoneAuth);
router.post("/customer/google", customerGoogleAuth);

module.exports = router;
