// src/controllers/authController.js
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const CustomerVisit = require("../models/CustomerVisit");
const {
  generateAdminToken,
  generateCustomerToken,
} = require("../utils/jwtUtils");

// Register a new restaurant and admin
exports.registerRestaurant = async (req, res) => {
  try {
    const { restaurantName, name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name: restaurantName,
    });

    // Create user with restaurant ID
    const user = await User.create({
      restaurantId: restaurant._id,
      name,
      email,
      password,
      role: "admin",
    });

    // Generate token
    const token = generateAdminToken(user);

    // Set cookie and send response
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Login admin
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateAdminToken(user);

    // Set cookie and send response
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Logout admin
exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// Get current admin user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Customer phone authentication
// exports.customerPhoneAuth = async (req, res) => {
//   try {
//     const { phone, restaurantId, tableId } = req.body;

//     // In a real app, you would validate and send an SMS code
//     // For MVP, we'll just create the customer visit record

//     console.log(req.body);

//     // Find restaurant
//     const restaurant = await Restaurant.findById(restaurantId);
//     if (!restaurant) {
//       return res.status(404).json({
//         success: false,
//         message: "Restaurant not found",
//       });
//     }

//     // Create customer visit
//     const customerVisit = await CustomerVisit.create({
//       restaurantId,
//       tableId,
//       customerPhone: phone,
//       visitDate: new Date(),
//     });

//     // Generate customer token
//     const token = generateCustomerToken(customerVisit);

//     // Set cookie and send response
//     res.cookie("customerToken", token, {
//       httpOnly: true,
//       maxAge: 24 * 60 * 60 * 1000, // 1 day
//       secure: process.env.NODE_ENV === "development",
//     });

//     res.status(200).json({
//       success: true,
//       token,
//       customer: {
//         visitId: customerVisit._id,
//         phone: customerVisit.customerPhone,
//         restaurantId: customerVisit.restaurantId,
//         tableId: customerVisit.tableId,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

exports.customerPhoneAuth = async (req, res) => {
  try {
    const { phone, restaurantId, tableId } = req.body;

    if (!phone || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Phone and restaurantId are required.",
      });
    }

    console.log("Incoming request data:", req.body);

    // ✅ Find restaurant safely
    const restaurant = await Restaurant.findById(restaurantId).catch(
      () => null
    );
    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found." });
    }

    // ✅ Prepare visit data
    const visitData = {
      restaurantId,
      customerPhone: phone,
      visitDate: new Date(),
    };
    if (tableId) visitData.tableId = tableId;

    // ✅ Create customer visit and convert to plain object
    let customerVisit = await CustomerVisit.create(visitData);
    customerVisit = customerVisit.toObject(); // Convert to JSON-safe object

    // ✅ Ensure token generation is valid
    if (!generateCustomerToken || typeof generateCustomerToken !== "function") {
      return res.status(500).json({
        success: false,
        message: "Internal error: Token generation function missing.",
      });
    }

    // ✅ Generate customer token (ensure it's a string)
    const token = generateCustomerToken(customerVisit);
    if (typeof token !== "string") {
      return res
        .status(500)
        .json({ success: false, message: "Token must be a string." });
    }

    // ✅ Set cookie safely
    res.cookie("customerToken", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === "production",
    });

    // ✅ Log debug info
    console.log("Customer Visit Created:", customerVisit);

    // ✅ Send response with plain object (no circular references)
    return res.status(200).json({
      success: true,
      token,
      customer: {
        visitId: customerVisit._id,
        phone: customerVisit.customerPhone,
        restaurantId: customerVisit.restaurantId,
        tableId: customerVisit.tableId || null,
      },
    });
  } catch (error) {
    console.error("Error in customerPhoneAuth:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
};

// Google authentication for customers
exports.customerGoogleAuth = async (req, res) => {
  try {
    const { googleId, email, name, restaurantId, tableId } = req.body;

    // Create customer visit
    const customerVisit = await CustomerVisit.create({
      restaurantId,
      tableId,
      customerEmail: email,
      customerName: name,
      googleId,
      visitDate: new Date(),
    });

    // Generate customer token
    const token = generateCustomerToken(customerVisit);

    // Set cookie and send response
    res.cookie("customerToken", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      success: true,
      token,
      customer: {
        visitId: customerVisit._id,
        email: customerVisit.customerEmail,
        name: customerVisit.customerName,
        googleId: customerVisit.googleId,
        restaurantId: customerVisit.restaurantId,
        tableId: customerVisit.tableId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
