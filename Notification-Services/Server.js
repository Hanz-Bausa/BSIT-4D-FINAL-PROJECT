require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./src/config/database');
const app = require('./src/app');

const PORT = process.env.PORT || 5004;

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO for real-time notifications
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? ['https://yourdomain.com'] 
            : ['http://localhost:3000'],
        credentials: true
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    // Join user to their room
    socket.on('joinUserRoom', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io accessible to other modules
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});