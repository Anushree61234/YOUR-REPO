const { validationResult } = require('express-validator');
const Booking = require('../models/booking');
const Home = require('../models/home');
const User = require('../models/user');

// ============ GUEST ROUTES ============

/**
 * GET /bookings/create/:homeId
 * Show booking form with date picker
 */
exports.getCreateBooking = async (req, res) => {
  try {
    const { homeId } = req.params;
    
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).render('404', {
        pageTitle: 'Home Not Found',
        currentPage: '404',
        isLoggedIn: req.session.isLoggedIn,
        user: req.session.user
      });
    }

    // Get existing bookings for this home to show unavailable dates
    const existingBookings = await Booking.find({
      homeId: homeId,
      status: { $in: ['approved', 'pending'] }
    });

    const unavailableDates = existingBookings.flatMap(booking => ({
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate
    }));

    res.render('store/booking', {
      home,
      homeId,
      unavailableDates,
      pageTitle: 'Book a Home',
      currentPage: 'booking',
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user,
      errors: [],
      oldInput: {}
    });
  } catch (err) {
    console.error('Error fetching booking form:', err);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      currentPage: 'error',
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user
    });
  }
};

/**
 * POST /bookings/create/:homeId
 * Create a new booking
 */
exports.postCreateBooking = async (req, res) => {
  try {
    const { homeId } = req.params;
    const { checkInDate, checkOutDate, guestMessage } = req.body;
    const guestId = req.session.user.id;

    // Validation
    const errors = [];

    if (!checkInDate || !checkOutDate) {
      errors.push('Both check-in and check-out dates are required');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkIn >= checkOut) {
      errors.push('Check-out date must be after check-in date');
    }

    if (checkIn < new Date()) {
      errors.push('Check-in date cannot be in the past');
    }

    if (errors.length > 0) {
      const home = await Home.findById(homeId);
      return res.status(422).render('store/booking', {
        home,
        homeId,
        pageTitle: 'Book a Home',
        currentPage: 'booking',
        isLoggedIn: req.session.isLoggedIn,
        user: req.session.user,
        errors,
        oldInput: { checkInDate, checkOutDate, guestMessage }
      });
    }

    // Check for date conflicts
    const conflictingBooking = await Booking.findOne({
      homeId,
      status: { $in: ['approved', 'pending'] },
      $or: [
        { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } }
      ]
    });

    if (conflictingBooking) {
      const home = await Home.findById(homeId);
      errors.push('These dates are already booked. Please choose different dates.');
      return res.status(422).render('store/booking', {
        home,
        homeId,
        pageTitle: 'Book a Home',
        currentPage: 'booking',
        isLoggedIn: req.session.isLoggedIn,
        user: req.session.user,
        errors,
        oldInput: { checkInDate, checkOutDate, guestMessage }
      });
    }

    // Get home and host details
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).send('Home not found');
    }

    // Calculate total price
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalPrice = numberOfNights * home.price;

    // Find host (assume home has a hostId field, or get all hosts and match)
    // For now, we'll need to add hostId to Home model
    // Temporary: we'll set it later
    
    // Create booking
    const booking = new Booking({
      guestId,
      hostId: home.hostId, // Make sure Home model has this!
      homeId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfNights,
      pricePerNight: home.price,
      totalPrice,
      guestMessage,
      status: 'pending'
    });

    await booking.save();
    req.session.messages = req.session.messages || [];
    req.session.messages.push({
      type: 'success',
      text: 'Booking request submitted! Waiting for host approval.'
    });

    res.redirect('/my-bookings');
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).send('Error creating booking');
  }
};

/**
 * GET /my-bookings
 * Guest views their bookings
 */
exports.getMyBookings = async (req, res) => {
  try {
    const guestId = req.session.user.id;

    const bookings = await Booking.find({ guestId })
      .populate('homeId')
      .populate('hostId')
      .sort({ createdAt: -1 });

    res.render('store/myBookings', {
      bookings,
      pageTitle: 'My Bookings',
      currentPage: 'myBookings',
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user,
      messages: req.session.messages || []
    });

    // Clear messages after rendering
    req.session.messages = [];
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).send('Error fetching bookings');
  }
};

/**
 * POST /bookings/:bookingId/cancel
 * Guest cancels a booking
 */
exports.postCancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const guestId = req.session.user.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    // Only guest can cancel their own booking
    if (booking.guestId.toString() !== guestId) {
      return res.status(403).send('You do not have permission to cancel this booking');
    }

    // Can't cancel rejected or already cancelled bookings
    if (['rejected', 'cancelled'].includes(booking.status)) {
      req.session.messages = [{
        type: 'error',
        text: `Cannot cancel a ${booking.status} booking`
      }];
      return res.redirect('/my-bookings');
    }

    booking.status = 'cancelled';
    await booking.save();

    req.session.messages = [{
      type: 'success',
      text: 'Booking cancelled successfully'
    }];

    res.redirect('/my-bookings');
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).send('Error cancelling booking');
  }
};

// ============ HOST ROUTES ============

/**
 * GET /host/pending-bookings
 * Host views pending bookings for their homes
 */
exports.getHostPendingBookings = async (req, res) => {
  try {
    const hostId = req.session.user.id;

    const pendingBookings = await Booking.find({
      hostId,
      status: 'pending'
    })
      .populate('homeId')
      .populate('guestId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.render('host/pendingBookings', {
      pendingBookings,
      pageTitle: 'Pending Bookings',
      currentPage: 'pendingBookings',
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user,
      messages: req.session.messages || []
    });

    req.session.messages = [];
  } catch (err) {
    console.error('Error fetching pending bookings:', err);
    res.status(500).send('Error fetching bookings');
  }
};

/**
 * POST /host/bookings/:bookingId/approve
 * Host approves a booking
 */
exports.postApproveBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const hostId = req.session.user.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    // Verify host owns this booking
    if (booking.hostId.toString() !== hostId) {
      return res.status(403).send('You do not have permission to approve this booking');
    }

    booking.status = 'approved';
    await booking.save();

    req.session.messages = [{
      type: 'success',
      text: 'Booking approved!'
    }];

    res.redirect('/host/pending-bookings');
  } catch (err) {
    console.error('Error approving booking:', err);
    res.status(500).send('Error approving booking');
  }
};

/**
 * POST /host/bookings/:bookingId/reject
 * Host rejects a booking
 */
exports.postRejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rejectionReason } = req.body;
    const hostId = req.session.user.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    // Verify host owns this booking
    if (booking.hostId.toString() !== hostId) {
      return res.status(403).send('You do not have permission to reject this booking');
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      req.session.messages = [{
        type: 'error',
        text: 'Please provide a rejection reason'
      }];
      return res.redirect('/host/pending-bookings');
    }

    booking.status = 'rejected';
    booking.hostRejectReason = rejectionReason;
    await booking.save();

    req.session.messages = [{
      type: 'success',
      text: 'Booking rejected'
    }];

    res.redirect('/host/pending-bookings');
  } catch (err) {
    console.error('Error rejecting booking:', err);
    res.status(500).send('Error rejecting booking');
  }
};

/**
 * GET /host/booking-history
 * Host views all bookings (past & current)
 */
exports.getHostBookingHistory = async (req, res) => {
  try {
    const hostId = req.session.user.id;

    const bookings = await Booking.find({ hostId })
      .populate('homeId')
      .populate('guestId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.render('host/bookingHistory', {
      bookings,
      pageTitle: 'Booking History',
      currentPage: 'bookingHistory',
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error fetching booking history:', err);
    res.status(500).send('Error fetching booking history');
  }
};
