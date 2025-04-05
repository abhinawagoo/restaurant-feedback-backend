// src/controllers/analyticsController.js
const FeedbackForm = require('../models/FeedbackForm');
const FeedbackQuestion = require('../models/FeedbackQuestion');
const FeedbackResponse = require('../models/FeedbackResponse');
const FeedbackAnswer = require('../models/FeedbackAnswer');
// const mongoose = require('mongoose');
// const { ObjectId } = mongoose.Types;

/**
 * Get analytics for a specific form
 * @route GET /api/forms/:formId/analytics
 */
exports.getFormAnalytics = async (req, res) => {
  try {
    const { formId } = req.params;

    // Validate form exists
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Get all responses for this form
    const responses = await FeedbackResponse.find({ formId });
    
    // Get all questions for this form
    const questions = await FeedbackQuestion.find({ formId }).sort({ order: 1 });
    
    // Get all answers for these responses
    const responseIds = responses.map(response => response._id);
    const answers = await FeedbackAnswer.find({ 
      responseId: { $in: responseIds } 
    });

    // Calculate overall metrics
    const totalResponses = responses.length;
    let firstResponseDate = null;
    let lastResponseDate = null;
    
    if (totalResponses > 0) {
      const sortedResponses = [...responses].sort((a, b) => 
        new Date(a.submittedAt) - new Date(b.submittedAt)
      );
      firstResponseDate = sortedResponses[0].submittedAt;
      lastResponseDate = sortedResponses[sortedResponses.length - 1].submittedAt;
    }

    // Calculate average overall rating
    const ratingsSum = responses.reduce((sum, response) => {
      return response.overallRating ? sum + response.overallRating : sum;
    }, 0);
    
    const averageRating = totalResponses > 0 ? ratingsSum / totalResponses : 0;
    const ratingResponseCount = responses.filter(r => r.overallRating).length;

    // Calculate rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => {
      const count = responses.filter(r => r.overallRating === rating).length;
      return { rating, count };
    });

    // Calculate NPS data (assuming ratings 1-6 are detractors, 7-8 passives, 9-10 promoters)
    // For a 5-star system, we could consider 1-3 detractors, 4 passives, 5 promoters
    const npsData = {
      detractors: responses.filter(r => r.overallRating && r.overallRating <= 3).length,
      passives: responses.filter(r => r.overallRating === 4).length,
      promoters: responses.filter(r => r.overallRating === 5).length,
      total: ratingResponseCount
    };

    // Process time-series data for response trend
    const responseTrend = generateResponseTrend(responses);

    // Process individual question analytics
    const questionAnalytics = await generateQuestionAnalytics(questions, answers);

    // Generate timeline data
    const timelineData = generateTimelineData(responses, answers, questions);

    res.status(200).json({
      success: true,
      data: {
        totalResponses,
        totalViews: totalResponses * 3, // Placeholder - you might track form views separately
        firstResponseDate,
        lastResponseDate,
        averageRating,
        ratingResponseCount,
        ratingDistribution,
        npsData,
        responseTrend,
        questionAnalytics,
        timelineData
      }
    });
  } catch (error) {
    console.error('Error getting form analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting form analytics',
      error: error.message
    });
  }
};

/**
 * Get analytics for a specific question
 * @route GET /api/questions/:questionId/analytics
 */
exports.getQuestionAnalytics = async (req, res) => {
  try {
    const { questionId } = req.params;

    // Validate question exists
    const question = await FeedbackQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Get all answers for this question
    const answers = await FeedbackAnswer.find({ questionId });
    
    // Get response IDs to fetch submission dates
    const responseIds = [...new Set(answers.map(answer => answer.responseId))];
    const responses = await FeedbackResponse.find({
      _id: { $in: responseIds }
    });

    // Map of response IDs to their submission dates for quick lookup
    const responseDatesMap = responses.reduce((map, response) => {
      map[response._id.toString()] = response.submittedAt;
      return map;
    }, {});

    // Add timestamp to each answer
    const answersWithDates = answers.map(answer => {
      const responseId = answer.responseId.toString();
      return {
        ...answer.toObject(),
        submittedAt: responseDatesMap[responseId] || answer.createdAt
      };
    });

    // Sort answers by submission date
    const sortedAnswers = answersWithDates.sort((a, b) => 
      new Date(a.submittedAt) - new Date(b.submittedAt)
    );

    let analyticsData = {};
    let trendData = [];

    // Process analytics based on question type
    switch (question.type) {
      case 'rating':
        analyticsData = processRatingQuestionAnalytics(sortedAnswers);
        trendData = generateRatingTrendData(sortedAnswers);
        break;
      
      case 'multiplechoice':
      case 'checkbox':
      case 'dropdown':
        analyticsData = processChoiceQuestionAnalytics(sortedAnswers, question);
        trendData = generateChoiceTrendData(sortedAnswers, question);
        break;
      
      case 'text':
        analyticsData = processTextQuestionAnalytics(sortedAnswers);
        trendData = generateTextTrendData(sortedAnswers);
        break;
        
      default:
        analyticsData = {
          total: sortedAnswers.length,
          responses: sortedAnswers.map(a => ({
            value: a.value,
            date: a.submittedAt
          }))
        };
    }

    // Check if the question has been modified
    const hasBeenModified = question.questionHistory && question.questionHistory.length > 0;

    res.status(200).json({
      success: true,
      data: {
        questionId: question._id,
        questionText: question.text,
        questionType: question.type,
        hasBeenModified,
        modificationHistory: question.questionHistory || [],
        firstResponseDate: sortedAnswers.length > 0 ? sortedAnswers[0].submittedAt : null,
        lastResponseDate: sortedAnswers.length > 0 ? sortedAnswers[sortedAnswers.length - 1].submittedAt : null,
        responseCount: sortedAnswers.length,
        data: analyticsData,
        trendData
      }
    });
  } catch (error) {
    console.error('Error getting question analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting question analytics',
      error: error.message
    });
  }
};

/**
 * Get all responses for a form with pagination
 * @route GET /api/forms/:formId/responses
 */
exports.getFormResponses = async (req, res) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
    
    // Create sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Pagination setup
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get responses for this form
    const responses = await FeedbackResponse.find({ formId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await FeedbackResponse.countDocuments({ formId });
    
    // Get all answers for these responses
    const responseIds = responses.map(response => response._id);
    
    const answers = await FeedbackAnswer.find({
      responseId: { $in: responseIds }
    });
    
    // Get all questions for form
    const questions = await FeedbackQuestion.find({ formId });
    
    // Create a map of questions for quick lookup
    const questionsMap = questions.reduce((map, question) => {
      map[question._id.toString()] = question;
      return map;
    }, {});
    
    // Group answers by response
    const answersGroupedByResponse = answers.reduce((groups, answer) => {
      const responseId = answer.responseId.toString();
      if (!groups[responseId]) {
        groups[responseId] = [];
      }
      
      // Add question type to answer
      const questionId = answer.questionId.toString();
      const question = questionsMap[questionId];
      
      groups[responseId].push({
        ...answer.toObject(),
        type: question ? question.type : 'unknown',
        questionText: question ? question.text : 'Unknown question'
      });
      
      return groups;
    }, {});
    
    // Format response data
    const formattedResponses = responses.map(response => {
      const responseId = response._id.toString();
      return {
        _id: response._id,
        formId: response.formId,
        restaurantId: response.restaurantId,
        overallRating: response.overallRating,
        submittedAt: response.submittedAt,
        createdAt: response.createdAt,
        answers: answersGroupedByResponse[responseId] || []
      };
    });
    
    res.status(200).json({
      success: true,
      data: formattedResponses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting form responses:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting form responses',
      error: error.message
    });
  }
};

/**
 * Get responses for a specific question
 * @route GET /api/questions/:questionId/responses
 */
exports.getQuestionResponses = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { page = 1, limit = 20, sortOrder = 'desc' } = req.query;
    
    // Pagination setup
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get answers for this question
    const answers = await FeedbackAnswer.find({ questionId })
      .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await FeedbackAnswer.countDocuments({ questionId });
    
    // Get all response IDs
    const responseIds = answers.map(answer => answer.responseId);
    
    // Get response data for these answers
    const responses = await FeedbackResponse.find({
      _id: { $in: responseIds }
    });
    
    // Create a map of responses for quick lookup
    const responsesMap = responses.reduce((map, response) => {
      map[response._id.toString()] = response;
      return map;
    }, {});
    
    // Format the answers with response data
    const formattedAnswers = answers.map(answer => {
      const responseId = answer.responseId.toString();
      const response = responsesMap[responseId];
      
      return {
        _id: answer._id,
        questionId: answer.questionId,
        responseId: answer.responseId,
        feedbackId: answer.responseId, // Alias for frontend consistency
        value: answer.value,
        createdAt: answer.createdAt,
        submittedAt: response ? response.submittedAt : answer.createdAt,
        // You might want to add customer info here if you have that data
      };
    });
    
    res.status(200).json({
      success: true,
      data: formattedAnswers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting question responses:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting question responses',
      error: error.message
    });
  }
};

/**
 * Export form data to CSV/Excel
 * @route GET /api/forms/:formId/export
 */
exports.exportFormData = async (req, res) => {
  try {
    const { formId } = req.params;
    const { format = 'csv' } = req.query;
    
    // Get all data needed for export
    const form = await FeedbackForm.findById(formId);
    const questions = await FeedbackQuestion.find({ formId }).sort({ order: 1 });
    const responses = await FeedbackResponse.find({ formId }).sort({ submittedAt: -1 });
    
    const responseIds = responses.map(response => response._id);
    const answers = await FeedbackAnswer.find({
      responseId: { $in: responseIds }
    });
    
    // Group answers by response
    const answersGroupedByResponse = answers.reduce((groups, answer) => {
      const responseId = answer.responseId.toString();
      if (!groups[responseId]) {
        groups[responseId] = {};
      }
      
      groups[responseId][answer.questionId.toString()] = answer.value;
      return groups;
    }, {});
    
    // Prepare data rows
    const rows = [];
    
    // Add header row with question texts
    const headerRow = ['Response ID', 'Timestamp', 'Overall Rating'];
    questions.forEach(question => {
      headerRow.push(question.text);
    });
    rows.push(headerRow);
    
    // Add data rows
    responses.forEach(response => {
      const responseId = response._id.toString();
      const answerMap = answersGroupedByResponse[responseId] || {};
      
      const row = [
        responseId,
        new Date(response.submittedAt).toISOString(),
        response.overallRating || ''
      ];
      
      questions.forEach(question => {
        const questionId = question._id.toString();
        const value = answerMap[questionId];
        
        // Format value based on question type
        if (value === undefined || value === null) {
          row.push('');
        } else if (Array.isArray(value)) {
          row.push(value.join(', '));
        } else if (typeof value === 'object') {
          row.push(JSON.stringify(value));
        } else {
          row.push(value.toString());
        }
      });
      
      rows.push(row);
    });
    
    // Generate CSV content
    let content = '';
    if (format === 'csv') {
      content = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=feedback_${formId}.csv`);
    } else {
      // For Excel, you would use a library like exceljs or xlsx
      // Here's a simplified version that just returns JSON
      content = JSON.stringify(rows);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=feedback_${formId}.json`);
    }
    
    res.send(content);
  } catch (error) {
    console.error('Error exporting form data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting form data',
      error: error.message
    });
  }
};

// Helper functions

/**
 * Generate time series data for response trend
 */
function generateResponseTrend(responses) {
  if (responses.length === 0) return [];
  
  // Group responses by date
  const responsesByDate = responses.reduce((groups, response) => {
    const date = new Date(response.submittedAt);
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups[dateString]) {
      groups[dateString] = 0;
    }
    
    groups[dateString]++;
    return groups;
  }, {});
  
  // Convert to array for chart
  return Object.entries(responsesByDate).map(([date, count]) => ({
    date,
    count
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Generate analytics for all questions
 */
async function generateQuestionAnalytics(questions, answers) {
  // Group answers by question
  const answersByQuestion = answers.reduce((groups, answer) => {
    const questionId = answer.questionId.toString();
    if (!groups[questionId]) {
      groups[questionId] = [];
    }
    groups[questionId].push(answer);
    return groups;
  }, {});
  
  // Process each question
  return questions.map(question => {
    const questionId = question._id.toString();
    const questionAnswers = answersByQuestion[questionId] || [];
    
    // Basic analytics for all question types
    const analytics = {
      questionId,
      text: question.text,
      type: question.type,
      responseCount: questionAnswers.length,
      hasBeenModified: question.questionHistory && question.questionHistory.length > 0
    };
    
    // Process analytics based on question type
    switch (question.type) {
      case 'rating':
        // Calculate rating analytics
        const values = questionAnswers.map(a => Number(a.value)).filter(v => !isNaN(v));
        const sum = values.reduce((total, val) => total + val, 0);
        const average = values.length > 0 ? sum / values.length : 0;
        
        // Create distribution count
        const distribution = {};
        values.forEach(val => {
          distribution[val] = (distribution[val] || 0) + 1;
        });
        
        analytics.data = {
          average,
          distribution
        };
        break;
      
      case 'multiplechoice':
      case 'checkbox':
      case 'dropdown':
        // Process choice questions
        const choiceCounts = {};
        
        questionAnswers.forEach(answer => {
          const value = answer.value;
          
          if (Array.isArray(value)) {
            // For multi-select questions
            value.forEach(option => {
              choiceCounts[option] = (choiceCounts[option] || 0) + 1;
            });
          } else if (value) {
            // For single-select questions
            choiceCounts[value] = (choiceCounts[value] || 0) + 1;
          }
        });
        
        analytics.data = {
          distribution: choiceCounts,
          total: questionAnswers.length
        };
        break;
      
      case 'text':
        // For text questions, store recent responses
        const textResponses = questionAnswers
          .filter(a => a.value && typeof a.value === 'string')
          .map(a => ({
            text: a.value,
            date: a.createdAt
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculate average text length
        const textLengths = textResponses.map(r => r.text.length);
        const avgLength = textLengths.length > 0 
          ? textLengths.reduce((sum, length) => sum + length, 0) / textLengths.length 
          : 0;
        
        analytics.data = {
          responses: textResponses,
          total: textResponses.length,
          averageLength: Math.round(avgLength)
        };
        
        // You could add more text analytics here (word frequency, sentiment, etc)
        break;
    }
    
    return analytics;
  });
}

/**
 * Generate timeline data for responses
 */
function generateTimelineData(responses, answers, questions) {
  if (responses.length === 0) return { week: {}, month: {}, quarter: {}, year: {} };
  
  // Prepare data containers
  const result = {
    week: { responses: {}, ratings: {}, completion: {} },
    month: { responses: {}, ratings: {}, completion: {} },
    quarter: { responses: {}, ratings: {}, completion: {} },
    year: { responses: {}, ratings: {}, completion: {} }
  };
  
  // Group responses by time periods
  responses.forEach(response => {
    const date = new Date(response.submittedAt);
    
    // Weekly data - group by day of week
    const weekDay = date.toLocaleDateString('en-US', { weekday: 'short' });
    if (!result.week.responses[0]) result.week.responses[0] = [];
    if (!result.week.responses[0].find(d => d.name === weekDay)) {
      result.week.responses[0].push({ name: weekDay, value: 0 });
    }
    result.week.responses[0].find(d => d.name === weekDay).value++;
    
    // Monthly data - group by day of month
    const monthDay = date.getDate();
    if (!result.month.responses[0]) result.month.responses[0] = [];
    if (!result.month.responses[0].find(d => d.name === monthDay)) {
      result.month.responses[0].push({ name: monthDay, value: 0 });
    }
    result.month.responses[0].find(d => d.name === monthDay).value++;
    
    // Quarterly data - group by month
    const quarterMonth = date.toLocaleDateString('en-US', { month: 'short' });
    if (!result.quarter.responses[0]) result.quarter.responses[0] = [];
    if (!result.quarter.responses[0].find(d => d.name === quarterMonth)) {
      result.quarter.responses[0].push({ name: quarterMonth, value: 0 });
    }
    result.quarter.responses[0].find(d => d.name === quarterMonth).value++;
    
    // Yearly data - group by month
    const yearMonth = date.toLocaleDateString('en-US', { month: 'short' });
    if (!result.year.responses[0]) result.year.responses[0] = [];
    if (!result.year.responses[0].find(d => d.name === yearMonth)) {
      result.year.responses[0].push({ name: yearMonth, value: 0 });
    }
    result.year.responses[0].find(d => d.name === yearMonth).value++;
  });
  
  // Sort the data
  Object.keys(result).forEach(period => {
    if (result[period].responses[0]) {
      result[period].responses[0].sort((a, b) => {
        if (period === 'week') {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return days.indexOf(a.name) - days.indexOf(b.name);
        }
        if (period === 'quarter' || period === 'year') {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months.indexOf(a.name) - months.indexOf(b.name);
        }
        return a.name - b.name;
      });
    }
  });
  
  // Calculate average ratings by period
  result.averageRatings = {
    week: { 0: calculateAverageRatingsByPeriod(responses, 'week') },
    month: { 0: calculateAverageRatingsByPeriod(responses, 'month') },
    quarter: { 0: calculateAverageRatingsByPeriod(responses, 'quarter') },
    year: { 0: calculateAverageRatingsByPeriod(responses, 'year') }
  };
  
  // Calculate completion rates by period
  result.completionRates = {
    week: { 0: 92.5 }, // Example value - you would calculate this
    month: { 0: 88.1 },
    quarter: { 0: 90.3 },
    year: { 0: 89.7 }
  };
  
  return result;
}

/**
 * Calculate average ratings by period
 */
function calculateAverageRatingsByPeriod(responses, period) {
  // This is a simplified example - in a real app you'd calculate this based on the period
  const ratingsSum = responses.reduce((sum, response) => {
    return response.overallRating ? sum + response.overallRating : sum;
  }, 0);
  
  return responses.length > 0 ? ratingsSum / responses.length : 0;
}

/**
 * Process rating question analytics
 */
function processRatingQuestionAnalytics(answers) {
  // Extract numeric values
  const values = answers.map(a => Number(a.value)).filter(v => !isNaN(v));
  
  if (values.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: {}
    };
  }
  
  // Calculate statistics
  const sum = values.reduce((total, val) => total + val, 0);
  const average = sum / values.length;
  
  // Find mode (most common value)
  const valueCounts = values.reduce((counts, val) => {
    counts[val] = (counts[val] || 0) + 1;
    return counts;
  }, {});
  
  let mode = values[0];
  let maxCount = 0;
  
  Object.entries(valueCounts).forEach(([value, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mode = Number(value);
    }
  });
  
  // Create distribution for chart
  const distribution = {};
  values.forEach(val => {
    distribution[val] = (distribution[val] || 0) + 1;
  });
  
  return {
    total: values.length,
    average,
    mode,
    distribution,
    // Get most recent ratings for display
    recentRatings: answers.slice(-5).map(a => ({
      value: a.value,
      date: a.submittedAt,
      // You could add customer info here if available
    })).reverse()
  };
}

/**
 * Process choice question analytics
 */
function processChoiceQuestionAnalytics(answers, question) {
  const distribution = {};
  let total = 0;
  
  // Initialize with all options if provided
  if (question.options && Array.isArray(question.options)) {
    question.options.forEach(option => {
      if (typeof option === 'string') {
        distribution[option] = 0;
      } else if (option.value) {
        distribution[option.value] = 0;
      }
    });
  }
  
  // Count occurrences of each option
  answers.forEach(answer => {
    const value = answer.value;
    
    if (Array.isArray(value)) {
      // For multi-select questions (checkbox)
      total++;
      value.forEach(option => {
        distribution[option] = (distribution[option] || 0) + 1;
      });
    } else if (value) {
      // For single-select questions
      total++;
      distribution[value] = (distribution[value] || 0) + 1;
    }
  });
  
  // Collect "other" responses if applicable
  const otherResponses = [];
  if (question.settings && question.settings.allowOther) {
    answers.forEach(answer => {
      if (answer.value && answer.value.other) {
        otherResponses.push(answer.value.other);
      }
    });
  }
  
  return {
    total,
    distribution,
    otherResponses
  };
}

/**
 * Process text question analytics
 */
function processTextQuestionAnalytics(answers) {
  // Filter valid text responses
  const textResponses = answers
    .filter(a => a.value && typeof a.value === 'string' && a.value.trim().length > 0)
    .map(a => ({
      text: a.value,
      date: a.submittedAt
    }));
  
  if (textResponses.length === 0) {
    return {
      total: 0,
      responses: [],
      averageLength: 0,
      responseRate: 0
    };
  }
  
  // Calculate average text length
  const textLengths = textResponses.map(r => r.text.length);
  const avgLength = textLengths.reduce((sum, length) => sum + length, 0) / textLengths.length;
  
  // Calculate response rate (simplified)
  const responseRate = (textResponses.length / answers.length) * 100;
  
  // Get word frequency (simple implementation)
  const wordFrequency = {};
  textResponses.forEach(response => {
    const words = response.text
      .toLowerCase()
      .replace(/[.,?!;:()"'\-_]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Skip short words
    
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });
  
  // Get most common words
  const commonWords = Object.entries(wordFrequency)
    .filter(([_, count]) => count > 1) // Only words that appear more than once
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  return {
    total: textResponses.length,
    responses: textResponses,
    averageLength: Math.round(avgLength),
    responseRate,
    commonWords
  };
}

/**
 * Generate rating trend data over time
 */
function generateRatingTrendData(answers) {
  if (answers.length === 0) return [];
  
  // Group by date (day)
  const answersByDate = groupAnswersByDate(answers);
  
  // Calculate average rating for each date
  return Object.entries(answersByDate).map(([date, dateAnswers]) => {
    const values = dateAnswers.map(a => Number(a.value)).filter(v => !isNaN(v));
    const sum = values.reduce((total, val) => total + val, 0);
    const average = values.length > 0 ? sum / values.length : 0;
    
    return {
      date,
      count: dateAnswers.length,
      average
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Generate choice question trend data over time
 */
function generateChoiceTrendData(answers, question) {
  if (answers.length === 0) return [];
  
  // Group by date (day)
  const answersByDate = groupAnswersByDate(answers);
  
  // Calculate choice counts for each date
  return Object.entries(answersByDate).map(([date, dateAnswers]) => {
    // Count occurrences of each option for this date
    const counts = {};
    
    dateAnswers.forEach(answer => {
      const value = answer.value;
      
      if (Array.isArray(value)) {
        // For multi-select questions
        value.forEach(option => {
          counts[option] = (counts[option] || 0) + 1;
        });
      } else if (value) {
        // For single-select questions
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return {
      date,
      count: dateAnswers.length,
      ...counts // Add each option as a separate property
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Generate text question trend data over time
 */
function generateTextTrendData(answers) {
  if (answers.length === 0) return [];
  
  // Group by date (day)
  const answersByDate = groupAnswersByDate(answers);
  
  // Calculate metrics for each date
  return Object.entries(answersByDate).map(([date, dateAnswers]) => {
    // Filter valid text responses
    const textResponses = dateAnswers.filter(a => 
      a.value && typeof a.value === 'string' && a.value.trim().length > 0
    );
    
    // Calculate average length for the day
    const avgLength = textResponses.length > 0
      ? textResponses.reduce((sum, a) => sum + a.value.length, 0) / textResponses.length
      : 0;
    
    return {
      date,
      count: textResponses.length,
      averageLength: Math.round(avgLength)
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Helper function to group answers by date
 */
function groupAnswersByDate(answers) {
  return answers.reduce((groups, answer) => {
    const date = new Date(answer.submittedAt);
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups[dateString]) {
      groups[dateString] = [];
    }
    
    groups[dateString].push(answer);
    return groups;
  }, {});
}

/**
 * Get a specific feedback response with all answers
 * @route GET /api/responses/:responseId
 */
exports.getFeedbackResponse = async (req, res) => {
  try {
    const { responseId } = req.params;
    
    // Get the response
    const response = await FeedbackResponse.findById(responseId);
    
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Feedback response not found'
      });
    }
    
    // Get all answers for this response
    const answers = await FeedbackAnswer.find({ responseId });
    
    // Get all question IDs from answers
    const questionIds = [...new Set(answers.map(answer => answer.questionId))];
    
    // Get all questions
    const questions = await FeedbackQuestion.find({
      _id: { $in: questionIds }
    });
    
    // Create a map of questions for quick lookup
    const questionsMap = questions.reduce((map, question) => {
      map[question._id.toString()] = question;
      return map;
    }, {});
    
    // Format answers with question information
    const formattedAnswers = answers.map(answer => {
      const questionId = answer.questionId.toString();
      const question = questionsMap[questionId];
      
      return {
        ...answer.toObject(),
        question: question ? {
          _id: question._id,
          text: question.text,
          type: question.type,
          options: question.options,
          hasBeenModified: question.questionHistory && question.questionHistory.length > 0
        } : null
      };
    });
    
    // Get form data
    const form = await FeedbackForm.findById(response.formId);
    
    res.status(200).json({
      success: true,
      data: {
        _id: response._id,
        formId: response.formId,
        restaurantId: response.restaurantId,
        customerVisitId: response.customerVisitId,
        overallRating: response.overallRating,
        submittedAt: response.submittedAt,
        submittedToGoogle: response.submittedToGoogle,
        googleReviewText: response.googleReviewText,
        form: form ? {
          name: form.name,
          description: form.description,
          thankYouMessage: form.thankYouMessage
        } : null,
        answers: formattedAnswers
      }
    });
  } catch (error) {
    console.error('Error getting feedback response:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting feedback response',
      error: error.message
    });
  }
};

// Additional routes setup
/**
 * Set up all analytics routes
 */
exports.setupAnalyticsRoutes = (router) => {
  // Form analytics
  router.get('/forms/:formId/analytics', exports.getFormAnalytics);
  
  // Form responses
  router.get('/forms/:formId/responses', exports.getFormResponses);
  
  // Question analytics
  router.get('/questions/:questionId/analytics', exports.getQuestionAnalytics);
  
  // Question responses
  router.get('/questions/:questionId/responses', exports.getQuestionResponses);
  
  // Single feedback response details
  router.get('/responses/:responseId', exports.getFeedbackResponse);
  
  // Export form data
  router.get('/forms/:formId/export', exports.exportFormData);
  
  // Export question data
  router.get('/questions/:questionId/export', exports.exportQuestionData);
};

/**
 * Export question data to CSV
 * @route GET /api/questions/:questionId/export
 */
exports.exportQuestionData = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { format = 'csv' } = req.query;
    
    // Get the question
    const question = await FeedbackQuestion.findById(questionId);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Get all answers for this question
    const answers = await FeedbackAnswer.find({ questionId });
    
    // Get all response IDs
    const responseIds = answers.map(answer => answer.responseId);
    
    // Get response data
    const responses = await FeedbackResponse.find({
      _id: { $in: responseIds }
    });
    
    // Create a map of responses for quick lookup
    const responsesMap = responses.reduce((map, response) => {
      map[response._id.toString()] = response;
      return map;
    }, {});
    
    // Prepare data rows
    const rows = [];
    
    // Add header row
    const headerRow = ['Response ID', 'Submission Date', 'Response Value'];
    
    // Add question type specific headers
    if (question.type === 'rating') {
      headerRow.push('Overall Form Rating'); // For comparison
    } else if (question.type === 'multiplechoice' || question.type === 'checkbox') {
      headerRow.push('Selected Options');
    }
    
    rows.push(headerRow);
    
    // Add data rows
    answers.forEach(answer => {
      const responseId = answer.responseId.toString();
      const response = responsesMap[responseId];
      
      const row = [
        responseId,
        response ? new Date(response.submittedAt).toISOString() : 'Unknown',
      ];
      
      // Format value based on question type
      if (answer.value === undefined || answer.value === null) {
        row.push('');
      } else if (Array.isArray(answer.value)) {
        row.push(answer.value.join(', '));
      } else if (typeof answer.value === 'object') {
        row.push(JSON.stringify(answer.value));
      } else {
        row.push(answer.value.toString());
      }
      
      // Add overall rating if applicable
      if (question.type === 'rating' && response) {
        row.push(response.overallRating || '');
      } else if ((question.type === 'multiplechoice' || question.type === 'checkbox') && Array.isArray(answer.value)) {
        row.push(answer.value.length.toString());
      }
      
      rows.push(row);
    });
    
    // Generate CSV content
    let content = '';
    if (format === 'csv') {
      content = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=question_${questionId}.csv`);
    } else {
      // For Excel, you would use a library like exceljs or xlsx
      content = JSON.stringify(rows);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=question_${questionId}.json`);
    }
    
    res.send(content);
  } catch (error) {
    console.error('Error exporting question data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting question data',
      error: error.message
    });
  }
};