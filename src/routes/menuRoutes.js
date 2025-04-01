// src/routes/menuRoutes.js
const express = require("express");
const {
  getMenuItems,
  getCategories,
  addMenuItem,
  updateMenuItem,
  toggleItemAvailability,
  deleteMenuItem,
  addCategory,
  updateCategory,
  toggleCategoryVisibility,
  deleteCategory,
} = require("../controllers/menuController");
const {
  protectAdminRoute,
  verifyRestaurantAccess,
} = require("../middleware/auth");

const router = express.Router();

// Public routes - for customer menu viewing
router.get("/restaurants/:restaurantId/items/public", getMenuItems);
router.get("/restaurants/:restaurantId/categories/public", getCategories);

// Admin routes - protected
router.get(
  "/restaurants/:restaurantId/items",
  protectAdminRoute,
  verifyRestaurantAccess,
  getMenuItems
);
router.get(
  "/restaurants/:restaurantId/categories",
  protectAdminRoute,
  verifyRestaurantAccess,
  getCategories
);
router.post(
  "/restaurants/:restaurantId/items",
  protectAdminRoute,
  verifyRestaurantAccess,
  addMenuItem
);
router.post(
  "/restaurants/:restaurantId/categories",
  protectAdminRoute,
  verifyRestaurantAccess,
  addCategory
);

router.put("/items/:id", protectAdminRoute, updateMenuItem);
router.patch(
  "/items/:id/availability",
  protectAdminRoute,
  toggleItemAvailability
);
router.delete("/items/:id", protectAdminRoute, deleteMenuItem);

router.put("/categories/:id", protectAdminRoute, updateCategory);
router.patch(
  "/categories/:id/visibility",
  protectAdminRoute,
  toggleCategoryVisibility
);
router.delete("/categories/:id", protectAdminRoute, deleteCategory);

module.exports = router;
