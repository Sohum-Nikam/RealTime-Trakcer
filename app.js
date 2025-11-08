const express = require('express');
const app = express();
const path = require('path');
const http = require('http');

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Configure view engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
  res.render('index');
});

// Store active users and their locations
const activeUsers = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Send existing users to the newly connected user
  socket.emit('existing-users', Array.from(activeUsers.values()));
  
  // Handle location updates
  socket.on('send-location', (data) => {
    // Validate data
    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
      return;
    }
    
    // Store user data
    const userData = {
      id: socket.id,
      lat: data.lat,
      lon: data.lon,
      ts: data.ts
    };
    
    activeUsers.set(socket.id, userData);
    
    // Broadcast location to all clients except sender
    socket.broadcast.emit('receive-location', userData);
  });
  
  // Handle clear markers request
  socket.on('clear-markers', () => {
    activeUsers.clear();
    io.emit('clear-markers');
  });
  
  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    activeUsers.delete(socket.id);
    io.emit('user-disconnected', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3009;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});