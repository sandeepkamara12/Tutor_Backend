import crypto from "crypto";

import NewsletterSubscriber from "../models/NewsletterSubscriber.js";

import { sendMail } from "./mailer.js";

// Generate a random 64-character hexadecimal token.
export const generateToken = () => crypto.randomBytes(32).toString("hex");

// Convert the original token into a SHA-256 hash.
export const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

// Returns:
//   "already-subscribed"  the email is already confirmed, nothing was sent
//   "confirmation-sent"   a confirmation email was sent (new or still unconfirmed subscriber)
export const startSubscription = async (email, source = "website") => {

    // 1. Check whether this email already exists (from the newsletter form OR the enquiry form).
    let subscriber = await NewsletterSubscriber.findOne({ email });

    // 2. Already confirmed: do nothing.
    if (subscriber?.status === "active") {
        return "already-subscribed";
    }

    // 3. Create a new subscriber if necessary.
    if (!subscriber) {
        subscriber = new NewsletterSubscriber({ email });
    }

    // 4. Generate a new confirmation token.
    const token = generateToken();

    // 5. Save the subscriber's pending information.
    subscriber.status = "pending";
    subscriber.consentAt = new Date();
    subscriber.consentSource = source;
    subscriber.confirmationTokenHash = hashToken(token);

    // Confirmation expires after 24 hours.
    subscriber.confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 6. Save to MongoDB.
    await subscriber.save();

    // 7. Generate confirmation link.
    const API_URL = process.env.API_URL?.replace(/\/+$/, "");
    if (!API_URL) throw new Error("API_URL is missing.");

    const confirmationLink = `${API_URL}/api/newsletter/confirm?token=${token}`;

    // 8. Send confirmation email.
    await sendMail({
        to: email,
        subject: "Confirm your Russian In Hindi newsletter subscription",
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2>Welcome to Russian In Hindi!</h2>

                <p>
                    Please confirm your email address to start receiving
                    weekly Russian learning tips.
                </p>

                <p>
                    <a
                        href="${confirmationLink}"
                        style="display:inline-block;background:#2f64d1;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:5px;"
                    >
                        Confirm Subscription
                    </a>
                </p>

                <p>This link expires in 24 hours.</p>

                <p>If you didn't subscribe, please ignore this email.</p>
            </div>
        `,
        text: `Welcome to Russian In Hindi!\n\nConfirm your subscription here:\n${confirmationLink}\n\nThis link expires in 24 hours.`,
    });

    return "confirmation-sent";
};