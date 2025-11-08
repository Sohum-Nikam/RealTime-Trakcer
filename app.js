const express = require('express');
const app = express();
const path = require('path');
const http = require('http');

const socketio = require('socket.io'); // Corrected import
const server = http.createServer(app);
const io = socketio(server);

// Set view engine and public folder for static files
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public"))); // Fixed static files setup

io.on("connection", function (socket) {
    console.log(`New connection: ${socket.id}`);

    // Handle location data from client
    socket.on("send-location", function (data) {
        io.emit("receive-location", { id: socket.id, ...data }); // Fixed typo in event name
    });

    // Handle user disconnection
    socket.on("disconnect", function () {
        console.log(`User disconnected: ${socket.id}`);
        io.emit("user-disconnected", socket.id);
    });
});

// Route for the home page
app.get('/', (req, res) => {
    res.render("index");
});

// Start the server
const PORT = 3009;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
