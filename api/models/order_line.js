const mongoose = require('mongoose');

const orderLineSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
    order: {type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
    quantity: {type: Number},
    price: {type: Number},
    height: {type: Number},
    width: {type: Number},
    thickness: {type: Number}
});

module.exports = mongoose.model('OrderLine', orderLineSchema);