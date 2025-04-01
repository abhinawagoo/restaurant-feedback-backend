// src/models/FeedbackAnswer.js
const mongoose = require("mongoose");

const feedbackAnswerSchema = new mongoose.Schema({
  responseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeedbackResponse",
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeedbackQuestion",
    required: true,
  },
  // The value can be different types depending on the question type
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FeedbackAnswer", feedbackAnswerSchema);
