const mongoose = require('mongoose');
var pictureProduct = new mongoose.Schema({
    type: String
});
mongoose.model('PictureProduct', pictureProduct);