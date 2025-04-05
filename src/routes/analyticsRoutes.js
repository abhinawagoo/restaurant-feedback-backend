// src/routes/analyticsRoutes.js
const express = require('express');
const { 
  getFormAnalytics, 
  getFormResponses,
  getQuestionAnalytics,
  getQuestionResponses,
  getFeedbackResponse,
  exportFormData,
  exportQuestionData
} = require('../controllers/analyticsController');
const {
    protectAdminRoute,
  } = require("../middleware/auth");
const router = express.Router();

// All routes require authentication
// router.use(protect);

// Form analytics routes (admin only)
router.get('/forms/:formId/analytics', protectAdminRoute, getFormAnalytics);
router.get('/forms/:formId/responses', protectAdminRoute, getFormResponses);
router.get('/forms/:formId/export', protectAdminRoute, exportFormData);

// Question analytics routes (admin only)
router.get('/questions/:questionId/analytics', protectAdminRoute, getQuestionAnalytics);
router.get('/questions/:questionId/responses', protectAdminRoute, getQuestionResponses);
router.get('/questions/:questionId/export', protectAdminRoute, exportQuestionData);

// Individual feedback response
router.get('/responses/:responseId', protectAdminRoute, getFeedbackResponse);

module.exports = router;

// src/server.js or src/app.js (where you set up your Express app)
// Add this to your existing routes setup

// Import analytics routes

// Use analytics routes