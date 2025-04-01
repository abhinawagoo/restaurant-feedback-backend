// models/subscriptionPlan.js
import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, "Plan code is required"],
      enum: ["free", "basic", "premium", "enterprise"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Plan description is required"],
    },
    features: [String],
    pricing: {
      monthly: {
        amount: Number,
        currency: {
          type: String,
          default: "INR",
        },
      },
      semiAnnual: {
        amount: Number,
        currency: {
          type: String,
          default: "INR",
        },
        savePercentage: {
          type: Number,
          default: 0,
        },
      },
      annual: {
        amount: Number,
        currency: {
          type: String,
          default: "INR",
        },
        savePercentage: {
          type: Number,
          default: 0,
        },
      },
    },
    limits: {
      menuItems: Number,
      forms: Number,
      analytics: Boolean,
      customDomain: Boolean,
      whiteLabel: Boolean,
      staff: Number,
    },
    stripePriceId: {
      monthly: String,
      semiAnnual: String,
      annual: String,
    },
    razorpayPlanId: {
      monthly: String,
      semiAnnual: String,
      annual: String,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Only create the model if it doesn't already exist
export const SubscriptionPlan =
  mongoose.models.SubscriptionPlan ||
  mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
