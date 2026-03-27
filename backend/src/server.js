require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');

app.use(cors());
app.use(express.json());
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
const { startSlaChecker } = require('./cron/slaChecker');
const { startLarkReporter } = require('./cron/larkReporter');

app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/notifications', notificationRoutes);

// Start background job
startSlaChecker();
startLarkReporter();

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
