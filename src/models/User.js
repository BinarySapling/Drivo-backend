const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['USER', 'RENTER', 'ADMIN', 'SUPERADMIN'],
        message: 'Role must be either USER, RENTER, ADMIN, or SUPERADMIN'
      },
      default: 'USER'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED'],
        message: 'Status must be either ACTIVE or SUSPENDED'
      },
      default: 'ACTIVE'
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    avatar: {
      url: String,
      publicId: String
    },
    // Login and auditing
    lastLoginAt: Date,
    lastLoginIp: String,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ role: 1, isVerified: 1 });
userSchema.index({ role: 1, isEmailVerified: 1 });

// Password hashing middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Auto-verify admin roles
userSchema.pre('save', function (next) {
  if (this.isNew && (this.role === 'ADMIN' || this.role === 'SUPERADMIN')) {
    this.isVerified = true;
    this.isEmailVerified = true;
  }
  next();
});

// Password verification
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Token generation methods
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// Legacy support
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Relations
userSchema.virtual('cars', {
  ref: 'Car',
  localField: '_id',
  foreignField: 'renterId'
});

userSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'userId'
});

const User = mongoose.model('User', userSchema);

module.exports = User;
