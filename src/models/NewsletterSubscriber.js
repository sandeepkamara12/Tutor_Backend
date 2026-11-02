import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },

    status: {
      type: String,
      enum: ["pending", "active", "unsubscribed"],
      default: "pending",
    },

    consentAt: {
      type: Date,
      required: true,
    },

    consentSource: {
      type: String,
      default: "website",
    },

    confirmationTokenHash: {
      type: String,
      default: null,
    },

    confirmationExpiresAt: {
      type: Date,
      default: null,
    },

    unsubscribeTokenHash: {
      type: String,
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    unsubscribedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate email subscriptions.
newsletterSchema.index({ email: 1 }, { unique: true });

export default mongoose.model(
  "NewsletterSubscriber",
  newsletterSchema
);