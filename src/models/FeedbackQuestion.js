// src/models/FeedbackQuestion.js
const mongoose = require("mongoose");

const feedbackQuestionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeedbackForm",
    required: true,
  },
  text: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ["rating", "text", "multiplechoice", "checkbox", "dropdown"],
    required: [true, "Question type is required"],
  },
  required: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    required: true,
  },
  // For multiple choice, checkbox, dropdown questions
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Conditional logic
  conditionalLogic: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Settings for the question
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  questionHistory: [{
    text: String,
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
});

module.exports = mongoose.model("FeedbackQuestion", feedbackQuestionSchema);
