import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Contact from '../models/Contact.js';
import { sendAutoReply, sendOwnerNotification } from '../utils/mailer.js';
import { startSubscription } from "../utils/newsletter.js";

const router = Router();

// max 5 messages per IP every 15 minutes (stops spam and accidental double sends)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many messages. Please try again in a few minutes.' },
});

const INTERESTS = ['alphabet', 'pronunciation', 'vocabulary', 'grammar', 'conversation', 'exam', 'free-material', 'other'];
const LEVELS = ['beginner', 'knows-alphabet', 'elementary', 'intermediate', 'advanced'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// returns { data } or { errors }
function validate(body) {
  const data = {
    name: text(body.name),
    email: text(body.email).toLowerCase(),
    phone: text(body.phone),
    interest: text(body.interest),
    level: text(body.level),
    // subject: text(body.subject),
    message: text(body.message),
    consent: body.consent === true,
    newsletter: body.newsletter === true,
  };

  const errors = {};
  if (data.name.length < 2 || data.name.length > 100) errors.name = 'Please enter your name.';
  if (!EMAIL.test(data.email) || data.email.length > 200) errors.email = 'Please enter a valid email.';
  if (data.phone && !/^[0-9+\-()\s]{7,20}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
  if (data.interest && !INTERESTS.includes(data.interest)) errors.interest = 'Please choose from the list.';
  if (data.level && !LEVELS.includes(data.level)) errors.level = 'Please choose from the list.';
  // if (data.subject.length > 150) errors.subject = 'Subject is too long.';
  if (data.message.length < 10) errors.message = 'Please write at least 10 characters.';
  if (data.message.length > 3000) errors.message = 'Message is too long (3000 characters max).';
  if (!data.consent) errors.consent = 'Please accept the privacy policy.';

  return Object.keys(errors).length ? { errors } : { data };
}

router.post('/', limiter, async (req, res) => {
  // honeypot: real people never see this hidden field, bots fill it in. Pretend it worked.
  if (text(req.body.website)) return res.status(201).json({ ok: true });

  const { data, errors } = validate(req.body);
  if (errors) return res.status(400).json({ ok: false, message: 'Please check the form.', errors });

  try {
    // 1) save it first, so nothing is lost even if the email fails
    const contact = await Contact.create({
      ...data,
      ip: req.ip,
      userAgent: String(req.get('user-agent') || '').slice(0, 300),
    });
    if (data.newsletter) {
  startSubscription(data.email, "contact-form")
    .catch((err) => console.error("Newsletter opt-in failed:", err.message));
}

    // 2) email you, and send the student a confirmation
    try {
      await sendOwnerNotification(contact);
      contact.emailSent = true;
      await contact.save();
      sendAutoReply(contact).catch((err) => console.error('Auto-reply failed:', err.message));
    } catch (err) {
      console.error('Notification email failed:', err.message); // the message is still saved in MongoDB
    }

    return res.status(201).json({ ok: true, message: 'Thank you, Your message has been sent.' });
  } catch (err) {
    console.error('Contact save failed:', err);
    return res.status(500).json({ ok: false, message: 'Something went wrong. Please try again later.' });
  }
});

export default router;
