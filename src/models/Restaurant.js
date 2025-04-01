const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Restaurant name is required"],
    trim: true,
  },
  logo: {
    type: String, // URL to logo image
  },
  primaryColor: {
    type: String,
    default: "#78716c", // Default Stone color
  },
  secondaryColor: {
    type: String,
    default: "#44403c", // Darker Stone
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  contactPhone: {
    type: String,
    trim: true,
  },
  // Change address from String to Object
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  googlePlaceId: {
    type: String, // For Google review integration
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

module.exports = mongoose.model("Restaurant", restaurantSchema);
