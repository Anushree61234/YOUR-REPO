const express = require('express');
const bookingRouter = express.Router();

const bookingController = require('../controllers/bookingController');

// ============ GUEST ROUTES ============

// Show booking form for a specific home
bookingRouter.get('/bookings/create/:homeId', (req, res, next) => {
  if (!req.session.isLoggedIn || req.session.user?.userType !== 'guest') {
    return res.redirect('/login');
  }
  next();
}, bookingController.getCreateBooking);

// Create a booking
bookingRouter.post('/bookings/create/:homeId', (req, res, next) => {
  if (!req.session.isLoggedIn || req.session.user?.userType !== 'guest') {
    return res.redirect('/login');
  }
  next();
}, bookingController.postCreateBooking);

// Guest views their bookings
bookingRouter.get('/my-bookings', (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  next();
}, bookingController.getMyBookings);

// Guest cancels a booking
bookingRouter.post('/bookings/:bookingId/cancel', (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  next();
}, bookingController.postCancelBooking);

// ============ HOST ROUTES ============

// Host views pending bookings
bookingRouter.get('/pending-bookings', (req, res, next) => {
  if (!req.session.isLoggedIn || req.session.user?.userType !== 'host') {
    return res.redirect('/login');
  }
  next();
}, bookingController.getHostPendingBookings);

// Host approves a booking
bookingRouter.post('/bookings/:bookingId/approve', (req, res, next) => {
  if (!req.session.isLoggedIn || req.session.user?.userType !== 'host') {
    return res.redirect('/login');
  }
  next();
}, bookingController.postApproveBooking);

// Host rejects a booking
bookingRouter.post('/bookings/:bookingId/reject', (req, res, next) => {
  if (!req.session.isLoggedIn || req.session.user?.userType !== 'host') {
    return res.redirect('/login');
  }
  next();
}, bookingController.postRejectBooking);

// Host views booking history
bookingRouter.get('/booking-history', (req, res, next) => {
  if (!req.session.isLoggedIn || req.session.user?.userType !== 'host') {
    return res.redirect('/login');
  }
  next();
}, bookingController.getHostBookingHistory);

module.exports = bookingRouter;
