const mongoose = require('mongoose');

const wishlistSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'}
});



module.exports = mongoose.model('Wishlist', wishlistSchema);