const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Auth middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

            // If no token, check for it in cookies (useful for proxied browser requests)
            if (!token && socket.handshake.headers.cookie) {
                const cookies = socket.handshake.headers.cookie.split('; ').reduce((acc, curr) => {
                    const [name, value] = curr.split('=');
                    acc[name.trim()] = value;
                    return acc;
                }, {});
                token = cookies.accessToken;
            }

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await User.findById(decoded.id).select('-passwordHash');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`📡 Socket connected: ${socket.id} (User: ${socket.user.email})`);

        // Join a private room for personal notifications
        socket.join(socket.user._id.toString());

        socket.on('join-chat', (bookingId) => {
            socket.join(`chat_${bookingId}`);
            console.log(`💬 User ${socket.user.email} joined chat: ${bookingId}`);
        });

        socket.on('leave-chat', (bookingId) => {
            socket.leave(`chat_${bookingId}`);
            console.log(`💬 User ${socket.user.email} left chat: ${bookingId}`);
        });

        socket.on('disconnect', () => {
            console.log(`📡 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Helper: Emit notification to specific user
const emitNotification = (userId, type, data) => {
    if (io) {
        io.to(userId.toString()).emit('notification', { type, ...data });
    }
};

module.exports = { initSocket, getIO, emitNotification };
