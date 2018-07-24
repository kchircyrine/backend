const mongoose = require('mongoose');
const Picture= require('./picture_product.js');

const realisationSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    description: String,
    active: Boolean,
    picture: Picture
});



module.exports = mongoose.model('Realisation', realisationSchema);