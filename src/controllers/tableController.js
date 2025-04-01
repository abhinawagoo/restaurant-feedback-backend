// controllers/tableController.js
const Table = require("../models/Table");
const Restaurant = require("../models/Restaurant");

// Create a new table
exports.createTable = async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.body;

    // Validate inputs
    if (!restaurantId || !tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID and table number are required",
      });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Generate QR code data
    const qrCodeData = `${restaurantId}_${tableNumber}_${Date.now()}`;

    // Generate QR code URL - you may want to use a QR code service or frontend URL
    const qrCodeUrl = `${
      process.env.FRONTEND_URL || "https://yourapp.com"
    }/scan?data=${qrCodeData}`;

    // Create new table
    const newTable = await Table.create({
      restaurantId,
      tableNumber,
      qrCodeUrl,
      qrCodeData,
      active: true,
    });

    res.status(201).json({
      success: true,
      table: newTable,
    });
  } catch (error) {
    // Check for duplicate table number
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A table with this number already exists in this restaurant",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all tables for a restaurant
exports.getRestaurantTables = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const tables = await Table.find({ restaurantId, active: true });

    res.status(200).json({
      success: true,
      tables,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a table (soft delete by setting active to false)
exports.deleteTable = async (req, res) => {
  try {
    const { tableId } = req.params;

    const table = await Table.findByIdAndUpdate(
      tableId,
      { active: false },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Table deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
