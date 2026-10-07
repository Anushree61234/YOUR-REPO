//Core modules
const path = require('path');
const express = require('express');
const storeRouter = express.Router();
   
//const { registeredHomes } = require('../controllers/home');
const storeController = require("../controllers/storeController");
storeRouter.get("/",storeController.getHomes);
storeRouter.get("/bookings",storeController.getBookings);
storeRouter.get("/favourites", storeController.getFavouriteList);
storeRouter.get("/homes",storeController.getHomeList);
storeRouter.get("/homes/:homeId",storeController.getHomeDetails);
storeRouter.post("/favourites",storeController.postAddToFavourite);
storeRouter.post("/favourites/delete/:homeId",storeController.postRemoveFromFavourite);
module.exports = storeRouter;