import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";

import contactRoutes from './routes/contact.js';
import newsletterRoutes from "./routes/newsletter.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // correct visitor IP behind a host / proxy (needed for the rate limit)

app.use(helmet());

// The browser only talks to this API from these sites: your local site and your live site.
app.use(cors({ origin: process.env.LIVE_URL, methods: ["GET", "POST"]}));
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/", (_req, res) => res.send("Russian In Hindi API is running."));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/contact', contactRoutes);
app.use("/api/newsletter", newsletterRoutes);

// anything else
app.use((_req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully.");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup error:", error);
        process.exit(1);
    }
};

startServer();
