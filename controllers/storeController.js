const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getHomes = async (req, res, next) => {
  try {
    const { location, minPrice, maxPrice, checkIn, checkOut } = req.query;

    const filter = {};

    // Location (case-insensitive partial match)
    if (location && location.trim()) {
      filter.location = { $regex: escapeRegex(location.trim()), $options: "i" };
    }

    // Price range
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min) || !isNaN(max)) {
      filter.price = {};
      if (!isNaN(min)) filter.price.$gte = min;
      if (!isNaN(max)) filter.price.$lte = max;
    }

    // Date availability: exclude homes with approved bookings that overlap
    let dateError = null;
    const checkInDate = checkIn ? new Date(checkIn) : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;
    const hasDates = checkInDate && checkOutDate && !isNaN(checkInDate) && !isNaN(checkOutDate);

    if (hasDates && checkOutDate <= checkInDate) {
      dateError = "Check-out must be after check-in";
    } else if (hasDates) {
      const blockedBookings = await Booking.find({
        status: "approved",
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate }
      }).select("homeId");

      filter._id = { $nin: blockedBookings.map(b => b.homeId) };
    }

    const registeredHomes = await Home.find(filter);

    let favouriteIds = [];
    if (req.session.isLoggedIn && req.session.user?.id) {
      const user = await User.findById(req.session.user.id).select("favourites");
      if (user) {
        favouriteIds = user.favourites.map(id => id.toString());
      }
    }

    res.render("store/home", {
        registeredHomes,
        favouriteIds,
        filters: {
            location: location || "",
            minPrice: minPrice || "",
            maxPrice: maxPrice || "",
            checkIn: checkIn || "",
            checkOut: checkOut || ""
        },
        today: new Date().toISOString().split("T")[0],
        dateError,
        pageTitle: "Stayora",
        currentPage: "home",
        user: req.session.user,
        isLoggedIn: req.session.isLoggedIn,
        });

  } catch (err) {
    next(err);
  }
};

exports.getBookings = (req, res, next) => {
    res.render("store/booking", {
        pageTitle: "Bookings",
        currentPage: "bookings",
        user: req.session.user,
    });
};

exports.getFavouriteList = async (req, res, next) => {
    const userId = req.session.user.id;

    const user = await User.findById(userId).populate("favourites");

    res.render("store/favouriteList", {
        favouriteHomes: user.favourites,
        pageTitle: "My Favourites",
        currentPage: "favourites",
        user: req.session.user
    });
};


exports.postAddToFavourite = async (req, res, next) => {

    // If user is not logged in, send them to login
    if (!req.session.isLoggedIn) {
        return res.redirect("/login");
    }

    const homeId = req.body.id;
    const userId = req.session.user.id;

    const user = await User.findById(userId);

    if (!user.favourites.some(id => id.toString() === homeId)) {
        user.favourites.push(homeId);
        await user.save();
    }

    res.redirect(req.body.redirectTo === "/" ? "/" : "/favourites");
};

exports.getHomeList = (req, res, next) => {
    Home.find().then(registeredHomes => {
        res.render("store/homeList", {
            registeredHomes,
            pageTitle: "Explore Homes",
            currentPage: "explore",
            user: req.session.user,
        });
    });
};

exports.getHomeDetails = (req, res, next) => {
    const homeId = req.params.homeId;

    console.log("at home details page", homeId);

    Home.findById(homeId).then(home => {
        if (!home) {
            console.log("Home not found");
            res.redirect("/homes");
        } else {
            res.render("store/homedetail", {
                home: home,
                pageTitle: "Home detail",
                currentPage: "Home",
                user: req.session.user,
            });
        }
    });
};

exports.postRemoveFromFavourite = async (req, res, next) => {
    const homeId = req.params.homeId;
    const userId = req.session.user.id;

    const user = await User.findById(userId);

    if (user.favourites.some(id => id.toString() === homeId)) {
        user.favourites = user.favourites.filter(
            fav => fav.toString() !== homeId
        );

        await user.save();
    }

    res.redirect(req.body.redirectTo === "/" ? "/" : "/favourites");
};