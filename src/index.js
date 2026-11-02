import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import contactRoutes from './routes/contact.js';
import newsletterRoutes from "./routes/newsletter.js";

const app = express();
app.set('trust proxy', 1); // correct visitor IP behind a host / proxy (needed for the rate limit)

app.use(helmet());
app.use(cors({ origin: [process.env.CLIENT_URL, process.env.LIVE_URL], methods: ['POST'] }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/contact', contactRoutes);
// New newsletter route.
app.use("/api/newsletter", newsletterRoutes);

// anything else
app.use((_req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

const port = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
