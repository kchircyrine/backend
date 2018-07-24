const mongoose = require('mongoose');
const Picture= require('./picture_product.js');

const orderSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    dateCreation: {type: Date, required: true},
    state: Number,
    reference: {type: String},
    active: Boolean,
    notify: Boolean,
    orderFile: Picture,
    tour: { type: mongoose.Schema.Types.ObjectId ,ref: 'Tour'},
    numberTour: Number
});

orderSchema.virtual('orderLines', {
    ref: 'OrderLine',
    localField: '_id',
    foreignField: 'order'
});

orderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);