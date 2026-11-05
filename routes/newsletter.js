import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

import NewsletterSubscriber from "../models/NewsletterSubscriber.js";

import {
    generateToken,
    hashToken,
    startSubscription,
} from "../utils/newsletter.js";

import { sendMail } from "../utils/mailer.js";

const router = express.Router();

const TOKEN_RE = /^[a-f0-9]{64}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_URL = process.env.API_URL?.replace(/\/+$/, "");

const unsubscribeUrl = (token) => {
    return `${API_URL}/api/newsletter/unsubscribe?token=${token}`;
};

const subscriptionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
});

const campaignLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
});

// Reusable HTML page with a confirmation button.
const renderActionPage = ({
    title,
    message,
    action,
    token,
    buttonText,
}) => `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${title}</title>
        </head>

        <body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:40px;text-align:center;">

            <div style="background:white;padding:30px;border-radius:10px;max-width:450px;margin:auto;">

                <h2>${title}</h2>

                <p>${message}</p>

                <form method="POST" action="${action}">

                    <input type="hidden" name="token" value="${token}">

                    <button type="submit">
                        ${buttonText}
                    </button>

                </form>

            </div>

        </body>
    </html>
`;

// Simple HTML page without a button.
const simplePage = (title, message) => `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
        </head>

        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;">

            <h2>${title}</h2>

            <p>${message}</p>

        </body>
    </html>
`;


const authenticateAdmin = (req, res, next) => {

    const key = process.env.NEWSLETTER_ADMIN_KEY;

    const supplied = Buffer.from(
        req.headers.authorization || ""
    );

    const expected = Buffer.from(
        `Bearer ${key || ""}`
    );

    if (
        !key ||
        supplied.length !== expected.length ||
        !crypto.timingSafeEqual(supplied, expected)
    ) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized.",
        });
    }

    next();
};


router.post(
    "/subscribe",
    subscriptionLimiter,
    async (req, res) => {

        try {
            const email = String(req.body.email || "")
                .trim()
                .toLowerCase();

            // Validate email.
            if (!EMAIL_RE.test(email) || email.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address.",
                });
            }

            // No checkbox: pressing "Subscribe" is the request, and the confirmation
            // email (double opt-in) is the proof that the owner of the address agreed.
            const result = await startSubscription(email, "website");

            if (result === "already-subscribed") {
                return res.status(200).json({
                    success: true,
                    status: "already-subscribed",
                    message: "You are already subscribed to our newsletter.",
                });
            }

            return res.status(201).json({
                success: true,
                status: "confirmation-sent",
                message: "Please check your inbox and confirm your subscription.",
            });

        } catch (error) {

            // Two requests at the same moment for the same new email
            if (error.code === 11000) {
                return res.status(200).json({
                    success: true,
                    status: "confirmation-sent",
                    message: "Please check your inbox and confirm your subscription.",
                });
            }

            console.error("Subscribe error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to process your subscription right now.",
            });
        }
    }
);



router.get("/confirm", (req, res) => {

    const token = String(req.query.token || "");

    if (!TOKEN_RE.test(token)) {
        return res.status(400).send(
            simplePage("Invalid link", "This confirmation link is invalid.")
        );
    }

    res.send(
        renderActionPage({
            title: "Confirm your subscription",

            message: "Click below to confirm your newsletter subscription.",

            action: "/api/newsletter/confirm",

            token,

            buttonText: "Confirm Subscription",
        })
    );
});



router.post("/confirm", async (req, res) => {

    try {
        const token = String(req.body.token || "");

        if (!TOKEN_RE.test(token)) {
            return res.status(400).send(
                simplePage("Invalid link", "Invalid confirmation token.")
            );
        }

        // Find subscriber using hashed token.
        const subscriber = await NewsletterSubscriber.findOne({
            confirmationTokenHash: hashToken(token),

            confirmationExpiresAt: {
                $gt: new Date(),
            },

            status: "pending",
        });

        if (!subscriber) {
            return res.status(400).send(
                simplePage(
                    "Link expired",
                    "This confirmation link is invalid or has expired. Please subscribe again."
                )
            );
        }

        // Activate subscriber.
        subscriber.status = "active";

        subscriber.confirmedAt = new Date();

        // Remove confirmation token after successful confirmation.
        subscriber.confirmationTokenHash = null;

        subscriber.confirmationExpiresAt = null;

        // Generate permanent unsubscribe token.
        subscriber.unsubscribeToken =
            subscriber.unsubscribeToken || generateToken();

        await subscriber.save();

        // Create unsubscribe link.
        const link = unsubscribeUrl(subscriber.unsubscribeToken);

        // Send welcome email.
        sendMail({
            to: subscriber.email,

            subject: "You're subscribed!",

            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">

                    <h2>You're officially subscribed!</h2>

                    <p>
                        You'll receive a new Russian word, grammar tip
                        and practice quiz every week.
                    </p>

                    <p>
                        <a href="${link}">Unsubscribe</a>
                    </p>

                </div>
            `,

            text: `
                You're subscribed!

                Unsubscribe any time:
                ${link}
            `,
        }).catch((error) => {
            console.error("Welcome email failed:", error.message);
        });

        return res.send(
            simplePage(
                "Subscription confirmed!",
                "Thank you. You're now subscribed to our newsletter."
            )
        );

    } catch (error) {

        console.error("Confirm error:", error);

        return res.status(500).send(
            simplePage("Error", "Unable to confirm your subscription.")
        );
    }
});



router.get("/unsubscribe", (req, res) => {

    const token = String(req.query.token || "");

    if (!TOKEN_RE.test(token)) {
        return res.status(400).send(
            simplePage("Invalid link", "This unsubscribe link is invalid.")
        );
    }

    res.send(
        renderActionPage({
            title: "Unsubscribe",

            message: "Are you sure you want to stop receiving our newsletter?",

            action: "/api/newsletter/unsubscribe",

            token,

            buttonText: "Unsubscribe",
        })
    );
});



router.post("/unsubscribe", async (req, res) => {

    try {
        const token = String(
            req.body.token || req.query.token || ""
        );

        if (!TOKEN_RE.test(token)) {
            return res.status(400).send(
                simplePage("Invalid link", "Invalid unsubscribe token.")
            );
        }

        // Find subscriber using unsubscribe token.
        const subscriber = await NewsletterSubscriber.findOne({
            unsubscribeToken: token,
        });

        if (!subscriber) {
            return res.status(400).send(
                simplePage("Invalid link", "This unsubscribe link is not valid.")
            );
        }

        // Change status.
        if (subscriber.status === "active") {

            subscriber.status = "unsubscribed";

            subscriber.unsubscribedAt = new Date();

            await subscriber.save();
        }

        return res.send(
            simplePage(
                "You have been unsubscribed",
                "You will no longer receive our newsletter emails."
            )
        );

    } catch (error) {

        console.error("Unsubscribe error:", error);

        return res.status(500).send(
            simplePage("Error", "Unable to unsubscribe right now.")
        );
    }
});



router.post(
    "/campaign",
    authenticateAdmin,
    campaignLimiter,
    async (req, res) => {

        try {
            const subject = String(req.body.subject || "").trim();

            const html = String(req.body.html || "").trim();

            const text = String(req.body.text || "").trim();

            if (!subject || !html) {
                return res.status(400).json({
                    success: false,
                    message: "Subject and HTML content are required.",
                });
            }

            if (subject.length > 200 || html.length > 100000) {
                return res.status(400).json({
                    success: false,
                    message: "Campaign content is too large.",
                });
            }

            // Get only active subscribers.
            const subscribers = await NewsletterSubscriber.find({
                status: "active",
            });

            // Respond before starting the campaign.
            res.status(202).json({
                success: true,
                message: "Campaign started.",
                total: subscribers.length,
            });

            // Send emails sequentially.
            let sent = 0;
            let failed = 0;

            const sleep = (ms) =>
                new Promise((resolve) => setTimeout(resolve, ms));

            for (const subscriber of subscribers) {

                try {

                    if (!subscriber.unsubscribeToken) {
                        subscriber.unsubscribeToken = generateToken();
                        await subscriber.save();
                    }

                    const link = unsubscribeUrl(
                        subscriber.unsubscribeToken
                    );

                    await sendMail({
                        to: subscriber.email,

                        subject,

                        html: `
                            ${html}

                            <hr>

                            <p style="font-size:12px;color:#777;">
                                You are receiving this email because
                                you subscribed to our newsletter.
                            </p>

                            <p>
                                <a href="${link}">Unsubscribe</a>
                            </p>
                        `,

                        text: `
                            ${text}

                            Unsubscribe:
                            ${link}
                        `,

                        headers: {
                            "List-Unsubscribe": `<${link}>`,

                            "List-Unsubscribe-Post":
                                "List-Unsubscribe=One-Click",
                        },
                    });

                    sent++;

                } catch (error) {

                    failed++;

                    console.error(
                        `Delivery failed for ${subscriber.email}:`,
                        error.message
                    );
                }

                // Wait one second between emails.
                await sleep(1000);
            }

            console.log(
                `Campaign completed. Sent: ${sent}, Failed: ${failed}`
            );

        } catch (error) {

            console.error("Campaign error:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: "Unable to send newsletter campaign.",
                });
            }
        }
    }
);


export default router;