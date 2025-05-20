// server.js
// Description: This file is the entry point of the application. It creates a server and listens to the port 4000.
// The server is created using the http module, and the app is imported from api.js.
// The connect function is called from db.js to connect to the database.
// The port is set to the value of the PORT environment variable, or 4000 if the environment variable is not set.
// The server listens to the specified port, and a message is logged to the console when the server is running.
// The connect function is called to establish a connection to the database.


// Import required modules
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config(); 
import http from 'http';
import app from './api.js';
import { connect } from './db.js';


// Create HTTP server
const server = http.createServer(app); 

// Set port from environment variable or default to 4000
const port = process.env.PORT || 4000; 

// Start server
server.listen(port, () => {
  console.log(`Server running in port: ${port}`);
});

// Connect to database
connect();
