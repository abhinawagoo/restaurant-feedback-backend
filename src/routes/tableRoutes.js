// routes/tableRoutes.js
const express = require("express");
const {
  createTable,
  getRestaurantTables,
  deleteTable,
} = require("../controllers/tableController");
const { protectAdminRoute } = require("../middleware/auth");
const router = express.Router();

// Create a new table
router.post("/", protectAdminRoute, createTable);

// Get all tables for a restaurant
router.get("/restaurant/:restaurantId", protectAdminRoute, getRestaurantTables);

// Delete a table
router.delete("/:tableId", protectAdminRoute, deleteTable);

module.exports = router;
