const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong to a user']
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: [true, 'Booking must be for a car']
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide start date'],
      validate: {
        validator: function (value) {
          // Start date must be today or in the future
          return value >= new Date().setHours(0, 0, 0, 0);
        },
        message: 'Start date cannot be in the past'
      }
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide end date'],
      validate: {
        validator: function (value) {
          // End date must be after start date
          return value > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative']
    },
    numberOfDays: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
        message: 'Status must be PENDING, CONFIRMED, CANCELLED, or COMPLETED'
      },
      default: 'PENDING'
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'PAID', 'REFUNDED'],
        message: 'Payment status must be PENDING, PAID, or REFUNDED'
      },
      default: 'PENDING'
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ carId: 1, status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });

// Days calculation middleware
bookingSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

// Availability check
bookingSchema.statics.checkAvailability = async function (carId, startDate, endDate, excludeBookingId = null) {
  const query = {
    carId,
    status: { $in: ['PENDING', 'CONFIRMED'] },
    $or: [
      { startDate: { $lte: startDate }, endDate: { $gt: startDate } },
      { startDate: { $lt: endDate }, endDate: { $gte: endDate } },
      { startDate: { $gte: startDate }, endDate: { $lte: endDate } }
    ]
  };

  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const conflictingBookings = await this.find(query);
  return conflictingBookings.length === 0;
};

// Pricing calculation
bookingSchema.methods.calculateTotalPrice = function (pricePerDay) {
  return this.numberOfDays * pricePerDay;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
