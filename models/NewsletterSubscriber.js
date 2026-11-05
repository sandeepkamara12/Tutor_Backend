
import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 200,
        },

        status: {
            type: String,
            enum: ["pending", "active", "unsubscribed"],
            default: "pending",
        },

        consentAt: {
            type: Date,
            default: null,
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

        confirmedAt: {
            type: Date,
            default: null,
        },

        unsubscribeToken: {
            type: String,
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

// A token should belong to only one subscriber.
newsletterSubscriberSchema.index(
    { unsubscribeToken: 1 },
    {
        unique: true,
        partialFilterExpression: {
            unsubscribeToken: { $type: "string" },
        },
    }
);

const NewsletterSubscriber = mongoose.model(
    "NewsletterSubscriber",
    newsletterSubscriberSchema
);

export default NewsletterSubscriber;
