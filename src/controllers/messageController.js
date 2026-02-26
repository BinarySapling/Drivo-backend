const messageService = require('../services/messageService');
const asyncHandler = require('../utils/asyncHandler');
const { getIO } = require('../config/socket');

const sendMessage = asyncHandler(async (req, res) => {
    const { bookingId, message } = req.body;
    const senderId = req.user._id;

    const savedMessage = await messageService.saveMessage(bookingId, senderId, message);

    // Populate sender details for consistent UI structure
    await savedMessage.populate('senderId', 'name avatar');

    // Get booking to identify recipient
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId).populate('carId');
    const recipientId = booking.userId.toString() === senderId.toString()
        ? booking.carId.renterId.toString()
        : booking.userId.toString();

    // Emit to the chat room
    const io = getIO();
    io.to(`chat_${bookingId}`).emit('new-message', {
        bookingId,
        message: savedMessage
    });

    // Also emit a notification to the recipient specifically
    const { emitNotification } = require('../config/socket');
    emitNotification(recipientId, 'new-message', {
        message: `New message from ${req.user.name}`,
        bookingId
    });

    res.status(201).json({
        success: true,
        data: savedMessage
    });
});

const getHistory = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const history = await messageService.getChatHistory(bookingId, req.user._id);

    res.status(200).json({
        success: true,
        data: history
    });
});

const getUserConversations = asyncHandler(async (req, res) => {
    const conversations = await messageService.getConversations(req.user._id);

    res.status(200).json({
        success: true,
        data: conversations
    });
});

module.exports = {
    sendMessage,
    getHistory,
    getUserConversations
};
