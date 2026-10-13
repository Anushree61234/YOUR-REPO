const Home = require('../models/home');
const { cloudinary } = require('../config/cloudinary');

exports.getAddHome = (req, res) => {
  res.render('host/editHome', {
    pageTitle: 'Add Home',
    currentPage: 'addHome',
    editing: false,
    user: req.session.user,
  });
};

exports.getEditHome = async (req, res) => {
  try {
    const home = await Home.findOne({ _id: req.params.homeId, hostId: req.session.user.id });
    if (!home) return res.redirect('/host/hostHome');
    res.render('host/editHome', {
      pageTitle: 'Edit Home',
      currentPage: 'editHome',
      editing: true,
      home,
      user: req.session.user,
    });
  } catch (err) {
    console.log('Error while loading home', err);
    res.redirect('/host/hostHome');
  }
};

exports.postAddHome = async (req, res) => {
  try {
    const { houseName, price, location,description } = req.body;

    if (!req.file) {
      return res.status(422).send('No valid image provided (png/jpg/webp, max 5MB)');
    }

    const home = new Home({
      hostId: req.session.user.id,
      houseName,
      price,
      location,
      description,
      photo: req.file.path,       // full https URL
      photoId: req.file.filename, // Cloudinary public_id
    });

    await home.save();
    res.redirect('/host/hostHome');
  } catch (err) {
    console.log('Error while adding home', err);
  }
};

exports.getHostHome = async (req, res) => {
  try {
    const registeredHomes = await Home.find({ hostId: req.session.user.id });
    res.render('host/hostHome', {
      registeredHomes,
      pageTitle: 'My Homes',
      currentPage: 'myHomes',
      user: req.session.user,
    });
  } catch (err) {
    console.log('Error while fetching homes', err);
    res.redirect('/');
  }
};

exports.postEditHome = async (req, res) => {
  try {
    const { houseName, price, location, description } = req.body;
    const id = req.body.id || req.params.homeId;

    const home = await Home.findOne({ _id: id, hostId: req.session.user.id });
    if (!home) return res.redirect('/host/hostHome');

    home.houseName = houseName;
    home.price = price;
    home.location = location;
    home.description = description;

    if (req.file) {
      if (home.photoId) {
        await cloudinary.uploader.destroy(home.photoId).catch(e =>
          console.log('Cloudinary delete failed', e)
        );
      }
      home.photo = req.file.path;
      home.photoId = req.file.filename;
    }

    await home.save();
    res.redirect('/host/hostHome');
  } catch (err) {
    console.log('Error while updating home', err);
  }
};

exports.postDeleteHome = async (req, res) => {
  try {
    const home = await Home.findOneAndDelete({
      _id: req.params.homeId,
      hostId: req.session.user.id,
    });
    if (home && home.photoId) {
      await cloudinary.uploader.destroy(home.photoId).catch(e =>
        console.log('Cloudinary delete failed', e)
      );
    }
    res.redirect('/host/hostHome');
  } catch (err) {
    console.log('Error while deleting home', err);
    res.redirect('/host/hostHome');
  }
};