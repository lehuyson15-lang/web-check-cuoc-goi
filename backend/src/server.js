require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { helmetOptions, globalLimiter, errorHandler } = require('./services/securityMiddleware');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');

app.use(helmetOptions); // Apply security headers using Helmet
app.use(globalLimiter); // Apply global rate limiter

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  maxAge: 86400
};
app.use(cors(corsOptions));

// Request Size Limiter
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Import routes
const authRoutes = require('./routes/auth');
const callRoutes = require('./routes/calls');
const reportRoutes = require('./routes/reports');
const webhookRoutes = require('./routes/webhooks');
const leadRoutes = require('./routes/leads');
const notificationRoutes = require('./routes/notifications');
const dispatchRoutes = require('./routes/dispatch');
const { startSlaChecker } = require('./cron/slaChecker');
const { startLarkReporter } = require('./cron/larkReporter');

app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dispatch', dispatchRoutes);

// Start background job
startSlaChecker();
startLarkReporter();

// Ensure Global Error Handler is the last middleware before 404/SPA handling
app.use(errorHandler);

// Handle SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
