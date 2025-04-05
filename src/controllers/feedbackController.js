// src/controllers/feedbackController.js
const FeedbackForm = require("../models/FeedbackForm");
const FeedbackQuestion = require("../models/FeedbackQuestion");
const FeedbackResponse = require("../models/FeedbackResponse");
const FeedbackAnswer = require("../models/FeedbackAnswer");
const Restaurant = require("../models/Restaurant");

// Get all feedback forms for a restaurant
exports.getFeedbackForms = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const forms = await FeedbackForm.find({ restaurantId });

    res.status(200).json({
      success: true,
      count: forms.length,
      data: forms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a feedback form with its questions
exports.getFeedbackForm = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await FeedbackForm.findById(formId);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    // Get questions for this form, sorted by order
    const questions = await FeedbackQuestion.find({ formId }).sort({
      order: 1,
    });

    res.status(200).json({
      success: true,
      data: {
        form,
        questions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new feedback form
exports.createFeedbackForm = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, thankYouMessage, isDefault } = req.body;

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // If creating a default form, unset any existing default
    if (isDefault) {
      await FeedbackForm.updateMany(
        { restaurantId, isDefault: true },
        { isDefault: false }
      );
    }

    // Create the form
    const form = await FeedbackForm.create({
      restaurantId,
      name,
      description,
      thankYouMessage,
      isDefault: isDefault || false,
    });

    res.status(201).json({
      success: true,
      data: form,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add a question to a form
exports.addQuestion = async (req, res) => {
  try {
    const { formId } = req.params;
    const {
      text,
      description,
      type,
      required,
      options,
      conditionalLogic,
      settings,
    } = req.body;

    // Find the form
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    // Get the highest existing order value
    const highestOrder = await FeedbackQuestion.findOne({ formId })
      .sort({ order: -1 })
      .select("order");

    const order = highestOrder ? highestOrder.order + 1 : 0;

    // Create the question
    const question = await FeedbackQuestion.create({
      formId,
      text,
      description,
      type,
      required: required !== undefined ? required : true,
      order,
      options,
      conditionalLogic,
      settings,
    });

    res.status(201).json({
      success: true,
      data: question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Submit feedback response
exports.submitFeedback = async (req, res) => {
  try {
    const { formId } = req.params;
    const { answers, customerVisitId, restaurantId } = req.body;

    // Convert `customerVisitId` to ObjectId if valid
    // if (customerVisitId && mongoose.Types.ObjectId.isValid(customerVisitId)) {
    //   customerVisitId = new mongoose.Types.ObjectId(customerVisitId);
    // } else {
    //   customerVisitId = null; // Handle as needed
    // }
    console.log("answers", answers);
    console.log("customerVisitId", customerVisitId);
    console.log("restaurantId", restaurantId);

    // Verify the form exists
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Feedback form not found",
      });
    }

    // Verify the restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Get all questions for this form
    const questions = await FeedbackQuestion.find({ formId });

    // Validate required questions are answered
    const requiredQuestions = questions
      .filter((q) => q.required)
      .map((q) => q._id.toString());
    const answeredQuestions = Object.keys(answers);

    const missingRequiredQuestions = requiredQuestions.filter(
      (qId) => !answeredQuestions.includes(qId)
    );

    if (missingRequiredQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some required questions are not answered",
        missingQuestions: missingRequiredQuestions,
      });
    }

    // Calculate overall rating if rating questions exist
    let overallRating = null;
    const ratingAnswers = [];

    for (const questionId in answers) {
      const question = questions.find((q) => q._id.toString() === questionId);
      if (question && question.type === "rating") {
        ratingAnswers.push(answers[questionId]);
      }
    }

    if (ratingAnswers.length > 0) {
      overallRating = Math.round(
        ratingAnswers.reduce((sum, val) => sum + val, 0) / ratingAnswers.length
      );
    }

    // Create the feedback response
    const response = await FeedbackResponse.create({
      formId,
      restaurantId,
      customerVisitId,
      overallRating,
      submittedAt: Date.now(),
    });

    // Create answer records for each question
    const answerPromises = [];
    for (const questionId in answers) {
      answerPromises.push(
        FeedbackAnswer.create({
          responseId: response._id,
          questionId,
          value: answers[questionId],
        })
      );
    }

    await Promise.all(answerPromises);

    res.status(201).json({
      success: true,
      data: {
        responseId: response._id,
        overallRating,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get feedback responses for a restaurant
exports.getFeedbackResponses = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { limit = 50, page = 1, formId } = req.query;

    // Build query
    const query = { restaurantId };
    if (formId) {
      query.formId = formId;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get responses
    const responses = await FeedbackResponse.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("customerVisitId", "customerName customerPhone customerEmail");

    // Get total count
    const total = await FeedbackResponse.countDocuments(query);

    res.status(200).json({
      success: true,
      count: responses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: responses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a question in a form
// src/controllers/feedbackController.js
exports.updateQuestion = async (req, res) => {
  try {
    const { formId, questionId } = req.params;
    const updateData = req.body;
    
    // Find the existing question
    const existingQuestion = await FeedbackQuestion.findById(questionId);
    
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }
    
    // Store original text before updating (for reporting purposes)
    const originalText = existingQuestion.text;
    const wasTextChanged = originalText !== updateData.text;
    
    // If text is changed, add modification history
    if (wasTextChanged && updateData.text) {
      // Add to questionHistory array if it doesn't exist
      if (!existingQuestion.questionHistory) {
        existingQuestion.questionHistory = [];
      }
      
      // Add the current version to history before updating
      existingQuestion.questionHistory.push({
        text: originalText,
        changedAt: new Date()
      });
    }
    
    // Update the question
    updateData.updatedAt = new Date();
    
    const updatedQuestion = await FeedbackQuestion.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedQuestion
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: error.message
    });
  }
};

