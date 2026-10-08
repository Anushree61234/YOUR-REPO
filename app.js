const path = require('path');
const dotenv = require('dotenv');
dotenv.config();  // ← ADD THIS

const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const {default: mongoose} = require('mongoose');
const multer = require('multer');
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

const randomString = (length) => {
  const characters =
    "abcdefghijklmnopqrstuvwxyz";

  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return result;
};

const storage =  multer.diskStorage({
  destination: (req,file,cb) =>{
    cb(null,"uploads/");
  },
  filename: (req,file,cb)  =>{
    cb(null,randomString(10)+ '-' + file.originalname);
  }
})

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const multerOptions = {
  storage,fileFilter
}

app.use(express.urlencoded());
app.use(multer(multerOptions).single('photo'));
app.use(express.static(path.join(rootDir,'public')));
app.use("/uploads", express.static(path.join(rootDir, "uploads")));

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

const PORT = process.env.PORT || 3000;

mongoose.connect(DB_PATH).then(() => {
  console.log('Connected to Mongo');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

}).catch(err => {
  console.log("Error while connecting to Mongo", err);
});

//wow bhaijan apki typing toh bohot fast hai kya kamal ka type karte hai aap kya apko bade hoke ek sarkari typist banana hai
//meri typing toh bohot fast hai par mera focus utna hi slow hai mein apne project ko chodke yahan bakchodi kar rhi hun yayyy
