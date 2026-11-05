import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    level: { type: String, trim: true, maxlength: 60, default: '' },
    interest: { type: String, trim: true, maxlength: 60, default: '' },
    // subject: { type: String, trim: true, maxlength: 150, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    consent: { type: Boolean, required: true }, // agreed to the privacy policy
    newsletter: { type: Boolean, default: false }, // wants the newsletter (used later for Mailchimp)
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    emailSent: { type: Boolean, default: false }, // did the notification email go out?
    status: { type: String, enum: ['new', 'replied', 'archived'], default: 'new' },
  },
  { timestamps: true } // createdAt, updatedAt
);

contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });

export default mongoose.model('Contact', contactSchema);
