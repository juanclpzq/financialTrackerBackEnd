// api.js
// Main application setup and middleware configuration
// Configures Express application, middleware, and route handlers

// Import required modules
import morgan from 'morgan';
import express from 'express';
import cors from 'cors';

// Import models
import './models/Bank.js';
import './models/Transaction.js';
import './models/User.js';
import './models/Site.js';


// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import bankRoutes from './routes/bankRoutes.js';  // Corregido

import migrationRoutes from './routes/migrationRoutes.js';


// Initialize Express application instance
const app = express();


// Middleware Configuration

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev')); // HTTP request logger for development debugging
app.use(cors()); // Enable Cross-Origin Resource Sharing (CORS) for all requests

// API Routes Configuration
 
app.use('/api/auth', authRoutes); // Authentication and authorization endpoints
app.use('/api/users', userRoutes); // User management endpoints
app.use('/api/transactions', transactionRoutes); // Transaction processing endpoints
app.use('/api/dashboard', dashboardRoutes); // Dashboard data endpoints
app.use('/api/sites', siteRoutes); // Site management endpoints
app.use('/api/banks', bankRoutes);  // Cambiado para usar el prefijo correcto
app.use('/api/admin', migrationRoutes); // Migration endpoints


// Export configured Express application
export default app;