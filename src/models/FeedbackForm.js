// src/models/FeedbackForm.js
const mongoose = require("mongoose");

const feedbackFormSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  name: {
    type: String,
    required: [true, "Form name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  thankYouMessage: {
    type: String,
    default: "Thank you for your feedback!",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FeedbackForm", feedbackFormSchema);
