const Home = require("../models/home");
const fs = require('fs');

exports.getAddHome = (req, res) => {
  res.render("host/editHome", {
    pageTitle: "Add Home",
    currentPage: "addHome",
    editing: false,
    user: req.session.user,
  });
};

exports.getEditHome = (req, res) => {
    const homeId = req.params.homeId;
    Home.findById(homeId).then(home =>{
        if (!home) {
            console.log("Home not found for editing");
            return res.redirect("/host/hostHome");
        }
        res.render("host/editHome", {
            pageTitle: "Edit Home",
            currentPage: "editHome",
            editing: true,
            home: home,
            user: req.session.user,
        });
    });
};

exports.postAddHome = (req, res) => {
  const { houseName, price, location, description } = req.body;

  if(!req.file){
    return res.status(422).send("No image provided");
  }

  const photo = req.file.path.replace(/\\/g, '/');  // ← FIX: Convert backslashes to forward slashes

  const hostId = req.session.user.id;
  const home = new Home({
    hostId,
    houseName, 
    price, 
    rating, 
    photo,  // Now uses forward slashes
    description
  });
  home.save().then(()=>{
    console.log('Home saved successfully');
  });
  res.redirect("/host/hostHome");
};

exports.getHostHome = (req, res) => {
  const hostId = req.session.user.id;  // ← ADD THIS LINE
  
  Home.find({ hostId }).then(registeredHomes=>{
    res.render("host/hostHome", {
      registeredHomes,
      pageTitle: "My Homes",
      currentPage: "myHomes",
      user: req.session.user,
    });
  });
};

exports.postEditHome = (req, res) => {
  const { id,houseName, price, rating, description } = req.body;
  Home.findById(id).then((home)=>{
    home.houseName = houseName;
    home.price = price;
    home.rating = rating;
    home.description = description;

    if(req.file){
      fs.unlink(home.photo,(err)=>{
        if(err){
          console.log("Error while deleting file",err);
        }
      });
      home.photo = req.file.path.replace(/\\/g, '/');
    }

    home.save().then(result => {
      console.log('Home  udated',result);
    }).catch(err =>{
      console.log("Error while updating",err);
    })
    res.redirect("/host/hostHome");
  }).catch(err =>{
    console.log("Error while finding home",err);
  });
}; 

exports.postDeleteHome = (req, res) => {
 const homeId  = req.params.homeId;
 console.log("came to post delete",homeId);
 Home.findByIdAndDelete(homeId).then(() =>{
  res.redirect("/host/hostHome");
 }).catch(error=>{
  console.log('Error while deleting',error);
 })
};