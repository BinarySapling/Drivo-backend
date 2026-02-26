const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user']
        },
        carId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Car',
            required: [true, 'Review must be for a car']
        },
        // One review per booking (enforced via unique index)
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: [true, 'Review must reference a booking'],
            unique: true
        },
        rating: {
            type: Number,
            required: [true, 'Please provide a rating'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
            validate: {
                validator: Number.isInteger,
                message: 'Rating must be a whole number'
            }
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        }
    },
    {
        timestamps: true
    }
);

// Indexes
reviewSchema.index({ carId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });
// Note: bookingId unique index is already set via `unique: true` in the field definition above


/**
 * Recalculate car's averageRating and totalReviews after any change.
 */
const recalculateCar = async (Review, carId) => {
    const stats = await Review.aggregate([
        { $match: { carId: new mongoose.Types.ObjectId(carId) } },
        {
            $group: {
                _id: '$carId',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    const Car = require('./Car');
    if (stats.length > 0) {
        await Car.findByIdAndUpdate(carId, {
            averageRating: Math.round(stats[0].averageRating * 10) / 10,
            totalReviews: stats[0].totalReviews
        });
    } else {
        await Car.findByIdAndUpdate(carId, { averageRating: 0, totalReviews: 0 });
    }
};

reviewSchema.post('save', async function () {
    await recalculateCar(this.constructor, this.carId);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
    if (doc) await recalculateCar(doc.constructor, doc.carId);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
