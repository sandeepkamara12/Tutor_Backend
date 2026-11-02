import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import { sendOwnerNotification } from "../utils/mailer.js";

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL;
const API_URL = process.env.API_URL;

const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
});

// Generate a secure random token.
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Store only a hash of the token in MongoDB.
const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// Simple email validation.
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// HTML response for confirmation and unsubscribe actions.
const renderActionPage = ({
  title,
  message,
  action,
  token,
  buttonText,
}) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f7fb;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
          }

          .container {
            background: white;
            padding: 35px;
            border-radius: 12px;
            max-width: 450px;
            width: calc(100% - 40px);
            text-align: center;
            box-sizing: border-box;
          }

          button {
            background: #2f64d1;
            color: white;
            padding: 12px 25px;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          }
        </style>
      </head>

      <body>
        <div class="container">
          <h2>${title}</h2>
          <p>${message}</p>

          <form method="POST" action="${action}">
            <input type="hidden" name="token" value="${token}">
            <button type="submit">${buttonText}</button>
          </form>
        </div>
      </body>
    </html>
  `;
};

// --------------------------------------------------
// 1. SUBSCRIBE
// POST /api/newsletter/subscribe
// --------------------------------------------------

router.post(
  "/subscribe",
  subscriptionLimiter,
  async (req, res) => {
    try {
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const consent = req.body.consent === true;

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      if (!consent) {
        return res.status(400).json({
          success: false,
          message: "Please agree to receive newsletter emails.",
        });
      }

      let subscriber = await NewsletterSubscriber.findOne({ email });

      // Already subscribed.
      if (subscriber?.status === "active") {
        return res.status(200).json({
          success: true,
          message: "You are already subscribed.",
        });
      }

      // Create a new subscriber or refresh a pending subscription.
      if (!subscriber) {
        subscriber = new NewsletterSubscriber({
          email,
          consentAt: new Date(),
          consentSource: "website",
        });
      }

      const token = generateToken();

      subscriber.status = "pending";
      subscriber.consentAt = new Date();
      subscriber.consentSource = "website";
      subscriber.confirmationTokenHash = hashToken(token);
      subscriber.confirmationExpiresAt =
        new Date(Date.now() + 24 * 60 * 60 * 1000);

      await subscriber.save();

      const confirmationLink =
        `${API_URL}/api/newsletter/confirm?token=${token}`;

      await sendOwnerNotification({
        to: email,
        subject: "Confirm your Russian learning newsletter subscription",

        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
            <h2>Welcome to our Russian learning newsletter!</h2>

            <p>
              Thanks for subscribing. Please confirm your email
              address to start receiving weekly Russian learning tips.
            </p>

            <p>
              <a
                href="${confirmationLink}"
                style="
                  display:inline-block;
                  background:#2f64d1;
                  color:#ffffff;
                  padding:12px 24px;
                  text-decoration:none;
                  border-radius:5px;
                "
              >
                Confirm Subscription
              </a>
            </p>

            <p>This confirmation link expires in 24 hours.</p>
          </div>
        `,

        text: `Confirm your subscription here: ${confirmationLink}`,
      });

      return res.status(201).json({
        success: true,
        message:
          "Please check your inbox and confirm your subscription.",
      });
    } catch (error) {
      console.error("Newsletter subscription error:", error);

      if (error.code === 11000) {
        return res.status(200).json({
          success: true,
          message: "Please check your inbox to confirm your subscription.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to process your subscription right now.",
      });
    }
  }
);

// --------------------------------------------------
// 2. SHOW CONFIRMATION PAGE
// GET /api/newsletter/confirm?token=...
// --------------------------------------------------

router.get("/confirm", async (req, res) => {
  const token = String(req.query.token || "");

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send("Invalid confirmation link.");
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

// --------------------------------------------------
// 3. CONFIRM SUBSCRIPTION
// POST /api/newsletter/confirm
// --------------------------------------------------

router.post("/confirm", async (req, res) => {
  try {
    const token = String(req.body.token || "");

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send("Invalid confirmation token.");
    }

    const subscriber = await NewsletterSubscriber.findOne({
      confirmationTokenHash: hashToken(token),
      confirmationExpiresAt: { $gt: new Date() },
      status: "pending",
    });

    if (!subscriber) {
      return res.status(400).send(
        "This confirmation link is invalid or has expired."
      );
    }

    const unsubscribeToken = generateToken();

    subscriber.status = "active";
    subscriber.confirmedAt = new Date();
    subscriber.confirmationTokenHash = null;
    subscriber.confirmationExpiresAt = null;
    subscriber.unsubscribeTokenHash = hashToken(unsubscribeToken);

    await subscriber.save();

    const unsubscribeLink =
      `${API_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

    // Send welcome email.
    await sendOwnerNotification({
      to: subscriber.email,
      subject: "You're subscribed!",

      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2>You're officially subscribed!</h2>

          <p>
            Thank you for joining our Russian learning community.
          </p>

          <p>
            You'll receive a new Russian word, grammar tip
            and practice quiz every week.
          </p>

          <p>
            <a href="${unsubscribeLink}">
              Unsubscribe from this newsletter
            </a>
          </p>
        </div>
      `,

      text: `You're subscribed! Unsubscribe here: ${unsubscribeLink}`,
    });

    return res.send(`
      <h2>Subscription confirmed!</h2>
      <p>Thank you. You're now subscribed to our newsletter.</p>
    `);
  } catch (error) {
    console.error("Confirmation error:", error);

    return res.status(500).send(
      "Unable to confirm your subscription. Please try again."
    );
  }
});

// --------------------------------------------------
// 4. SHOW UNSUBSCRIBE PAGE
// GET /api/newsletter/unsubscribe?token=...
// --------------------------------------------------

router.get("/unsubscribe", async (req, res) => {
  const token = String(req.query.token || "");

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send("Invalid unsubscribe link.");
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

// --------------------------------------------------
// 5. PROCESS UNSUBSCRIBE
// POST /api/newsletter/unsubscribe
// --------------------------------------------------

router.post("/unsubscribe", async (req, res) => {
  try {
    const token = String(req.body.token || "");

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send("Invalid unsubscribe token.");
    }

    const subscriber = await NewsletterSubscriber.findOne({
      unsubscribeTokenHash: hashToken(token),
      status: "active",
    });

    if (!subscriber) {
      return res.status(400).send(
        "This unsubscribe link is invalid or has already been used."
      );
    }

    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = new Date();
    subscriber.unsubscribeTokenHash = null;

    await subscriber.save();

    return res.send(`
      <h2>You have been unsubscribed.</h2>
      <p>You will no longer receive our newsletter emails.</p>
    `);
  } catch (error) {
    console.error("Unsubscribe error:", error);

    return res.status(500).send(
      "Unable to unsubscribe right now. Please try again."
    );
  }
});

// --------------------------------------------------
// 6. ADMIN AUTHENTICATION
// --------------------------------------------------

const authenticateAdmin = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const expected = `Bearer ${process.env.NEWSLETTER_ADMIN_KEY}`;

  const suppliedBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);

  if (
    !process.env.NEWSLETTER_ADMIN_KEY ||
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  next();
};

// --------------------------------------------------
// 7. SEND NEWSLETTER CAMPAIGN
// POST /api/newsletter/campaign
// --------------------------------------------------

router.post(
  "/campaign",
  campaignLimiter,
  authenticateAdmin,
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

      const subscribers = await NewsletterSubscriber.find({
        status: "active",
      }).select("email unsubscribeTokenHash");

      let sent = 0;
      let failed = 0;

      // Send one at a time to avoid overwhelming your SMTP server.
      for (const subscriber of subscribers) {
        try {
          const unsubscribeToken = generateToken();

          subscriber.unsubscribeTokenHash = hashToken(unsubscribeToken);
          await subscriber.save();

          const unsubscribeLink =
            `${API_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

          const emailHtml = `
            ${html}

            <hr>

            <p style="font-size:12px;color:#777;">
              You are receiving this email because you subscribed
              to our newsletter.

              <br><br>

              <a href="${unsubscribeLink}">
                Unsubscribe
              </a>
            </p>
          `;

          await sendOwnerNotification({
            to: subscriber.email,
            subject,
            html: emailHtml,
            text: `${text}\n\nUnsubscribe: ${unsubscribeLink}`,
          });

          sent++;
        } catch (error) {
          failed++;
          console.error(
            `Newsletter delivery failed for ${subscriber.email}:`,
            error.message
          );
        }
      }

      return res.json({
        success: true,
        message: "Campaign processing completed.",
        total: subscribers.length,
        sent,
        failed,
      });
    } catch (error) {
      console.error("Campaign error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to send newsletter campaign.",
      });
    }
  }
);

export default router;