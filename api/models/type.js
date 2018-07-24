const mongoose = require('mongoose');
Schema = mongoose.Schema;
const Picture= require('./picture_product.js');

var TypeSchema = new Schema();

TypeSchema.add({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    active: Boolean,
    picture: Picture
});

var Type = mongoose.model('Type', TypeSchema);
module.exports = Type;