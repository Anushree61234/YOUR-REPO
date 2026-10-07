const { check, validationResult } = require('express-validator');
const User = require("../models/user");
const bcrypt =require("bcryptjs")

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    pageTitle: "Login",
    currentPage: "login",
    errors: [],
    oldInput: {email:""},
    user: {}
  });
};

exports.postLogin = async (req, res, next) => {
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      currentPage: "login",
      isLoggedIn: false,
      errors: ["User does not exist"],
      oldInput: { email },
      user: {},
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      currentPage: "login",
      isLoggedIn: false,
      errors: ["Invalid password"],
      oldInput: { email },
      user: {},
    });
  }

  req.session.isLoggedIn = true;

  req.session.user = {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType
  };

  req.session.save((err) => {
    if (err) {
        console.log("SESSION SAVE ERROR:", err);
        return next(err);
    }

    res.redirect("/");
});

};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    pageTitle: "Signup",
    currentPage: "signup",
    errors: [],        // ← Add this
    oldInput: {},       // ← Add this
    user: {},
  });
};

exports.postSignup = [
  // First Name validation
  check('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters'),

  // Last Name validation — OPTIONAL
  check('lastName')
  .optional()
  .trim()
  .isLength({ min: 2 })
  .withMessage('Last name must be at least 2 characters long')
  .matches(/^[a-zA-Z\s]+$/)
  .withMessage('Last name can only contain letters'),

  // Email validation
  check('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  // Password validation
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character')
    .trim(),

  // Confirm password validation
  check('confirm_password')
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  // User Type validation
  check('userType')
    .notEmpty()
    .withMessage('User type is required')
    .isIn(['guest', 'host'])
    .withMessage('Invalid user type'),

  // Terms Accepted validation
  check('termsAccepted')
    .notEmpty()
    .withMessage('You must accept the terms and conditions')
    .custom((value) => {
      if (value !== 'on') {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
    (req,res,next) =>{
      const {firstName,lastName,email,password,userType} = req.body;
      const errors = validationResult(req);
      if(!errors.isEmpty()){
        return res.status(422).render("auth/signup",{
          pageTitle: "Signup",
          currentPage: "signup",
          isLoggedIn: false,

          errors: errors.array().map(err => err.msg),
          oldInput: {firstName, lastName, email, userType},
          user: {},
        });
      }

      bcrypt.hash(password,12)
      .then(hashedPassword => {
        const user = new User({firstName, lastName, email, password: hashedPassword, userType });
        return user.save();
      })
      .then(() => {
        res.redirect("/login");
      })
      .catch(err => {
        console.log("Error while saving user",err);
        return res.status(422).render("auth/signup",{
          pageTitle: "Signup",
          currentPage: "signup",
          isLoggedIn: false,
          errors: [err.message],
          oldInput: {firstName, lastName, email, userType},
          user: {},
        });
      })
    }
];

exports.postLogout = (req, res, next) => {
  req.session.destroy(() =>{
    res.redirect("/login");
  })
};