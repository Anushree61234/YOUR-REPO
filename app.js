const path = require('path');
const dotenv = require('dotenv');
dotenv.config();  // ← ADD THIS

const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const {default: mongoose} = require('mongoose');
const DB_PATH = process.env.MONGODB_URI;

const hostRouter = require('./routes/hostRouter');
const storeRouter = require('./routes/storeRouter');
const authRouter = require('./routes/authRouter');
const bookingRouter = require('./routes/bookingRouter');
const rootDir = require("./utils/pathUtil");
const errorsController = require("./controllers/errors");

const app = express();

app.set('view engine','ejs');
app.set('views','views') // if views folder is named differently

const store = new MongoDBStore({
  uri: DB_PATH,
  collection: 'sessions'
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(rootDir,'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store
}));

app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn || false;
  res.locals.user = req.session.user || {};
  next();
});

app.use(storeRouter);

app.use("/host", (req, res, next) => {
  if (req.session.isLoggedIn && req.session.user?.userType === "host") {
    next();
  } else {
    res.redirect("/login");
  }
});

app.use("/host", hostRouter);
app.use(authRouter);

// Booking routes (for guests - bookings for each home)
app.use(bookingRouter);

// Host booking routes (protected)
app.use("/host", (req, res, next) => {
  if (req.session.isLoggedIn && req.session.user?.userType === "host") {
    next();
  } else {
    res.redirect("/login");
  }
}, bookingRouter);

app.use(errorsController.pageNotFound);
app.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    return res.status(422).send('Upload error: ' + err.message + ' (max 5MB)');
  }
  console.log(err);
  res.status(500).send('Something went wrong');
});

const PORT = process.env.PORT || 3000;

mongoose.connect(DB_PATH).then(() => {
  console.log('Connected to Mongo');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

}).catch(err => {
  console.log("Error while connecting to Mongo", err);
});
