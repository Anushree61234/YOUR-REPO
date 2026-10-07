const Home = require("../models/home");
const User = require("../models/user");
exports.getHomes = (req, res, next) => {
    console.log("HOME PAGE SESSION:", req.session.isLoggedIn);
    console.log("HOME PAGE USER:", req.session.user);

    Home.find().then(registeredHomes => {
        res.render("store/home", {
            registeredHomes,
            pageTitle: "Airbnb",
            currentPage: "home",
            user: req.session.user,
            isLoggedIn: req.session.isLoggedIn,
        });
    });
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

    res.redirect("/homes");
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

    res.redirect("/favourites");
};