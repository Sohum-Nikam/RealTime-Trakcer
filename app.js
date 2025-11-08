const express = require('express');
const app = express();
const path = require('path');
const http = require('http');

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Send existing users to the newly connected user
  socket.emit('existing-users', Array.from(activeUsers.values()));
  
  // Broadcast new user to existing users
  socket.broadcast.emit('user-connected', { id: socket.id });
  
  socket.on('send-location', (data) => {
    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
      return;
    }
    
    const userData = {
      id: socket.id,
      lat: data.lat,
      lon: data.lon,
      ts: data.ts || Date.now()
    };
    
    activeUsers.set(socket.id, userData);
    
    // Broadcast location to all clients except sender
    socket.broadcast.emit('receive-location', userData);
  });
  
  socket.on('clear-markers', () => {
    activeUsers.clear();
    io.emit('clear-markers');
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    activeUsers.delete(socket.id);
    io.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3009;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});