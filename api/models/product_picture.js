const mongoose = require('mongoose');

const productPictureSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    default: Boolean,
    product : { type: mongoose.Schema.Types.ObjectId ,ref: 'Product'}
});

module.exports = mongoose.model('ProductPicture', productPictureSchema);