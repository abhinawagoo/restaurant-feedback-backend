// src/routes/feedbackRoutes.js
const express = require("express");
const {
  getFeedbackForms,
  getFeedbackForm,
  createFeedbackForm,
  addQuestion,
  submitFeedback,
  getFeedbackResponses,
  updateQuestion,
} = require("../controllers/feedbackController");
const {
  protectAdminRoute,
  authenticateCustomer,
  verifyRestaurantAccess,
} = require("../middleware/auth");

const router = express.Router();

// Admin routes
router.get(
  "/restaurants/:restaurantId/forms",
  protectAdminRoute,
  verifyRestaurantAccess,
  getFeedbackForms
);
router.post(
  "/restaurants/:restaurantId/forms",
  protectAdminRoute,
  verifyRestaurantAccess,
  createFeedbackForm
);
router.get(
  "/restaurants/:restaurantId/responses",
  protectAdminRoute,
  verifyRestaurantAccess,
  getFeedbackResponses
);

// Form management routes
router.get("/forms/:formId", getFeedbackForm);
router.post("/forms/:formId/questions", protectAdminRoute, addQuestion);
router.put("/forms/:formId/questions/:questionId", protectAdminRoute, updateQuestion);



// Customer feedback submission routes
// router.post("/forms/:formId/submit", authenticateCustomer, submitFeedback);
router.post("/forms/:formId/submit", submitFeedback);

module.exports = router;
