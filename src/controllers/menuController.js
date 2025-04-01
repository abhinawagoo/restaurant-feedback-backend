
// Update our backend API to handle menu items and categories
// src/controllers/menuController.js
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Restaurant = require('../models/Restaurant');

// Get all menu items for a restaurant
exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { active } = req.query;
    
    // Build query
    const query = { restaurantId };
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    const menuItems = await MenuItem.find(query);
    
    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all categories for a restaurant
exports.getCategories = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { active } = req.query;
    
    // Build query
    const query = { restaurantId };
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    const categories = await Category.find(query);
    
    // For each category, count the items
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const itemCount = await MenuItem.countDocuments({ 
          categoryId: category._id,
          restaurantId
        });
        
        return {
          ...category.toObject(),
          itemCount
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categoriesWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add a new menu item
exports.addMenuItem = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, price, categoryId, popular, dietary } = req.body;
    
    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Verify category exists
    const category = await Category.findOne({ 
      _id: categoryId,
      restaurantId 
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Create the menu item
    const menuItem = await MenuItem.create({
      restaurantId,
      name,
      description,
      price,
      categoryId,
      popular: popular || false,
      dietary: dietary || [],
      active: true
    });
    
    res.status(201).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryId, popular, dietary } = req.body;
    
    // Find the menu item
    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this menu item'
      });
    }
    
    // Verify category exists if changed
    if (categoryId && categoryId !== menuItem.categoryId.toString()) {
      const category = await Category.findOne({ 
        _id: categoryId,
        restaurantId: menuItem.restaurantId 
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
    }
    
    // Update the menu item
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        categoryId: categoryId || menuItem.categoryId,
        popular: popular !== undefined ? popular : menuItem.popular,
        dietary: dietary || menuItem.dietary
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedMenuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle menu item availability
exports.toggleItemAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    // Find the menu item
    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this menu item'
      });
    }
    
    // Update availability
    menuItem.active = active;
    await menuItem.save();
    
    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the menu item
    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this menu item'
      });
    }
    
    // Delete the menu item
    await menuItem.remove();
    
    res.status(200).json({
      success: true,
      message: 'Menu item deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add a new category
exports.addCategory = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name } = req.body;
    
    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Create the category
    const category = await Category.create({
      restaurantId,
      name,
      active: true
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Find the category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== category.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this category'
      });
    }
    
    // Update the category
    category.name = name;
    await category.save();
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle category visibility
exports.toggleCategoryVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Find the category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== category.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this category",
      });
    }

    // Update visibility
    category.active = active;
    await category.save();

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Verify user has access to this restaurant
    if (req.user.restaurantId.toString() !== category.restaurantId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this category",
      });
    }

    // Check if there are menu items in this category
    const itemCount = await MenuItem.countDocuments({ categoryId: id });

    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with menu items. Please move or delete the items first.",
      });
    }

    // Delete the category
    await category.remove();

    res.status(200).json({
      success: true,
      message: "Category deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};