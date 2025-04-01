// // src/routes/restaurantRoutes.js
// const express = require("express");
// const {
//   getRestaurant,
//   updateRestaurant,
//   uploadLogo,
//   getRestaurantPublic,
// } = require("../controllers/restaurantController");
// const { protectAdminRoute } = require("../middleware/auth");

// const router = express.Router();

// // Public routes
// router.get("/:id/public", getRestaurantPublic);

// // Protected routes
// router.get("/:id", protectAdminRoute, getRestaurant);
// router.put("/:id", protectAdminRoute, updateRestaurant);
// router.post("/:id/logo", protectAdminRoute, uploadLogo);

// module.exports = router;

// src/routes/restaurantRoutes.js
const express = require("express");
const {
  getRestaurant,
  updateRestaurant,
  uploadLogo,
  getRestaurantPublic,
  getCurrentRestaurant,
  updateGeneralInfo,
  updateAppearance,
} = require("../controllers/restaurantController");
const { protectAdminRoute } = require("../middleware/auth");
const upload = require("../middleware/multer"); // Assuming you have multer set up for file uploads

const router = express.Router();

// Public routes
router.get("/:id/public", getRestaurantPublic);

// Protected routes - requires any authenticated user
router.get("/current", protectAdminRoute, getCurrentRestaurant);

// Protected routes - requires admin access to specific restaurant
router.get("/:id", protectAdminRoute, getRestaurant);
router.put("/:id", protectAdminRoute, updateRestaurant);
router.put("/:id/general", protectAdminRoute, updateGeneralInfo);
router.put("/:id/appearance", protectAdminRoute, updateAppearance);
router.post(
  "/:id/upload-logo",
  protectAdminRoute,
  upload.single("file"),
  uploadLogo
);

module.exports = router;
