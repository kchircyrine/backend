const mongoose = require('mongoose');
Schema = mongoose.Schema;
const User= require('./user');
var TourSchema = new Schema();

TourSchema.add({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    deliveryDate: Date,
    state: Number,
    duration: Number,
    user: { type: mongoose.Schema.Types.ObjectId ,ref: 'User'}
});

TourSchema.virtual('orders', {
    ref: 'Order',
    localField: '_id',
    foreignField: 'tour'
});

/*TourSchema.virtual('deliveryDateEnd').get(function () {
    return new Date(this.deliveryDate.getTime()  + (1000 * this.duration));
}).set(function(deliveryDate,duration) {
    this.deliveryDateEnd = new Date(deliveryDate.getTime()  + (1000 * duration))
});*/

TourSchema.set('toJSON', { virtuals: true });

var Tour = mongoose.model('Tour', TourSchema);
module.exports = Tour;