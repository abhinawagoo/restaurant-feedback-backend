// src/controllers/restaurantController.js
const Restaurant = require("../models/Restaurant");

// Get restaurant by ID
exports.getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this restaurant",
      });
    }

    const {
      name,
      logo,
      primaryColor,
      secondaryColor,
      contactEmail,
      contactPhone,
      address,
      googlePlaceId,
    } = req.body;

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      {
        name,
        logo,
        primaryColor,
        secondaryColor,
        contactEmail,
        contactPhone,
        address,
        googlePlaceId,
      },
      { new: true, runValidators: true }
    );

    if (!updatedRestaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedRestaurant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Upload restaurant logo
exports.uploadLogo = async (req, res) => {
  try {
    // In a real app, you would handle file upload to cloud storage
    // For MVP, we'll just update the logo URL

    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this restaurant",
      });
    }

    const logoUrl = req.body.logoUrl; // In real app, this would come from file upload

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { logo: logoUrl },
      { new: true }
    );

    if (!updatedRestaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedRestaurant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get restaurant for customer by ID (public route)
exports.getRestaurantPublic = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Only return necessary public information
    const publicInfo = {
      id: restaurant._id,
      name: restaurant.name,
      logo: restaurant.logo,
      primaryColor: restaurant.primaryColor,
      secondaryColor: restaurant.secondaryColor,
      googlePlaceId: restaurant.googlePlaceId,
    };

    res.status(200).json({
      success: true,
      data: publicInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get the current user's restaurant
 * @route GET /api/restaurants/current
 * @access Private
 */
exports.getCurrentRestaurant = async (req, res) => {
  try {
    // Find restaurant associated with the current user
    const restaurant = await Restaurant.findOne({
      "staff.userId": req.user.id,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "No restaurant found for this user",
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error("Error getting current restaurant:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Update restaurant general information
 * @route PUT /api/restaurants/:id/general
 * @access Private - Admin only
 */
exports.updateGeneralInfo = async (req, res) => {
  try {
    const { name, description, address, contact, socialMedia, googlePlaceId } =
      req.body;

    // Find restaurant
    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Update fields
    if (name) restaurant.name = name;
    if (description !== undefined) restaurant.description = description;
    if (googlePlaceId !== undefined) restaurant.googlePlaceId = googlePlaceId;

    // Update address if provided
    if (address) {
      restaurant.address = {
        ...(restaurant.address || {}),
        ...address,
      };
    }

    // Update contact if provided
    if (contact) {
      restaurant.contact = {
        ...(restaurant.contact || {}),
        ...contact,
      };
    }

    // Update social media if provided
    if (socialMedia) {
      restaurant.socialMedia = {
        ...(restaurant.socialMedia || {}),
        ...socialMedia,
      };
    }

    // Save restaurant
    await restaurant.save();

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error("Error updating restaurant general info:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Update restaurant appearance settings
 * @route PUT /api/restaurants/:id/appearance
 * @access Private - Admin only
 */
exports.updateAppearance = async (req, res) => {
  try {
    const {
      primaryColor,
      secondaryColor,
      fontFamily,
      logoPosition,
      menuLayout,
    } = req.body;

    // Find restaurant
    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Update fields
    if (primaryColor) restaurant.primaryColor = primaryColor;
    if (secondaryColor) restaurant.secondaryColor = secondaryColor;
    if (fontFamily) restaurant.fontFamily = fontFamily;
    if (logoPosition) restaurant.logoPosition = logoPosition;
    if (menuLayout) restaurant.menuLayout = menuLayout;

    // Save restaurant
    await restaurant.save();

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error("Error updating restaurant appearance:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
