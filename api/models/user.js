const mongoose = require('mongoose');
const Address= require('./address.js');
const Tour= require('./tour.js');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: {type: String, required: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    secretToken: String,
    status: String,
    active: Boolean,
    telephoneNumber: String,
    address: Address,
    token: String,
    role: {
        type: String,
        enum: ['Client', 'Admin','Driver'],
        default: 'Client'
    }
});

userSchema.virtual('orders', {
    ref: 'Order',
    localField: '_id',
    foreignField: 'user'
});

userSchema.virtual('tours', {
    ref: 'Tour',
    localField: '_id',
    foreignField: 'user'
});

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });




module.exports = mongoose.model('User', userSchema);