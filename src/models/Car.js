const mongoose = require('mongoose');

const carSchema = new mongoose.Schema(
  {
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Car must belong to a renter']
    },
    brand: {
      type: String,
      required: [true, 'Please provide car brand'],
      trim: true,
      maxlength: [50, 'Brand name cannot exceed 50 characters']
    },
    model: {
      type: String,
      required: [true, 'Please provide car model'],
      trim: true,
      maxlength: [50, 'Model name cannot exceed 50 characters']
    },
    year: {
      type: Number,
      required: [true, 'Please provide manufacturing year'],
      min: [1900, 'Year must be greater than 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    fuelType: {
      type: String,
      required: [true, 'Please provide fuel type'],
      enum: {
        values: ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG'],
        message: 'Fuel type must be PETROL, DIESEL, ELECTRIC, HYBRID, or CNG'
      }
    },
    transmission: {
      type: String,
      required: [true, 'Please provide transmission type'],
      enum: {
        values: ['MANUAL', 'AUTOMATIC'],
        message: 'Transmission must be MANUAL or AUTOMATIC'
      }
    },
    seats: {
      type: Number,
      required: [true, 'Please provide number of seats'],
      min: [2, 'Seats must be at least 2'],
      max: [12, 'Seats cannot exceed 12']
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Please provide price per day'],
      min: [0, 'Price cannot be negative']
    },
    city: {
      type: String,
      required: [true, 'Please provide city'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    features: {
      type: [String],
      default: []
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    images: [
      {
        url: {
          type: String,
          required: true
        },
        publicId: {
          type: String,
          required: true
        }
      }
    ],
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    mileage: {
      type: Number,
      min: [0, 'Mileage cannot be negative']
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
carSchema.index({ renterId: 1 });
carSchema.index({ city: 1, isApproved: 1, isAvailable: 1 });
carSchema.index({ brand: 1, model: 1 });
carSchema.index({ pricePerDay: 1 });
carSchema.index({ fuelType: 1 });

// Relations
carSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'carId'
});

// Validation
carSchema.pre('save', function (next) {
  if (this.isNew && (!this.images || this.images.length === 0)) {
    return next(new Error('Car must have at least one image'));
  }
  next();
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
