// src/models/Table.js
const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  tableNumber: {
    type: String,
    required: [true, "Table number is required"],
    trim: true,
  },
  qrCodeUrl: {
    type: String,
  },
  qrCodeData: {
    type: String, // The data encoded in the QR code
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Table", tableSchema);
