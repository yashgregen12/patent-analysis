import express from 'express';
import userRoutes from './routes/user.route.js';
import adminRoutes from './routes/admin.route.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { adminMiddleware } from './middlewares/admin.middleware.js';
import authRoutes from './routes/auth.route.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import config from './utils/config.js';
import session from 'express-session';
import passport from './utils/authPassport.js'
import connectDB from './utils/db.js';
import { initializeQdrant } from './utils/qdrantClient.js';
import ipAttorneyRoutes from './routes/ip-attorney.route.js';
import publicRoutes from './routes/public.route.js';
import analysisRoutes from './routes/analysis.route.js';
import { startWorker } from './workers/worker.js';

const app = express();

// Connect to Database
connectDB();
initializeQdrant();

startWorker().catch(err => {
    console.error('Worker crashed:', err);
    process.exit(1);
});


// Security Middlewares
app.use(helmet());
// app.use(limiter);
app.use(cors({
    origin: config.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
}));

// Basic Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    if (err.message?.includes("Only image and PDF")) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});


// Authentication Middlewares
app.use(passport.initialize());
app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
    },
}));
app.use(passport.session());


// Routes
app.use('/api/public', publicRoutes); // Public routes (no auth required)
app.use('/api/auth', authRoutes);

app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/ip-attorney', authMiddleware, ipAttorneyRoutes);

app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes); // Admin middleware applied in route file


app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT} `);
});