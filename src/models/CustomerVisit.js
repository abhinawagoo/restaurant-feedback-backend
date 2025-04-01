// src/models/CustomerVisit.js
const mongoose = require("mongoose");

const customerVisitSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Table",
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  customerName: {
    type: String,
    trim: true,
  },
  googleId: {
    type: String, // If the customer signs in with Google
  },
  visitDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CustomerVisit", customerVisitSchema);
