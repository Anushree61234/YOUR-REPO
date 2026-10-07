const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Guest ID is required']
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host ID is required']
  },
  homeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Home',
    required: [true, 'Home ID is required']
  },
  checkInDate: {
    type: Date,
    required: [true, 'Check-in date is required'],
    validate: {
      validator: function(value) {
        // Check-in date must be today or in the future
        return value >= new Date().setHours(0, 0, 0, 0);
      },
      message: 'Check-in date must be today or in the future'
    }
  },
  checkOutDate: {
    type: Date,
    required: [true, 'Check-out date is required'],
    validate: {
      validator: function(value) {
        // Check-out must be after check-in
        if (this.checkInDate) {
          return value > this.checkInDate;
        }
        return true;
      },
      message: 'Check-out date must be after check-in date'
    }
  },
  numberOfNights: {
    type: Number,
    required: true
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'cancelled'],
      message: 'Status must be one of: pending, approved, rejected, cancelled'
    },
    default: 'pending'
  },
  guestMessage: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  hostRejectReason: {
    type: String,
    maxlength: [300, 'Rejection reason cannot exceed 300 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the updatedAt timestamp
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Booking', bookingSchema);