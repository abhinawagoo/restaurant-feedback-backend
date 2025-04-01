// src/models/FeedbackResponse.js
const mongoose = require("mongoose");

const feedbackResponseSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeedbackForm",
    required: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  customerVisitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerVisit",
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  submittedToGoogle: {
    type: Boolean,
    default: false,
  },
  googleReviewText: {
    type: String,
  },
});

module.exports = mongoose.model("FeedbackResponse", feedbackResponseSchema);
