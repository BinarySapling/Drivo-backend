const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/conversations', messageController.getUserConversations);
router.get('/history/:bookingId', messageController.getHistory);
router.post('/send', messageController.sendMessage);

module.exports = router;
