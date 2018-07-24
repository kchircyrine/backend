const mongoose = require('mongoose');
var address = new mongoose.Schema({
    street: String,
    zip: String,
    city: String,
    longitude: Number,
    latitude: Number
});
mongoose.model('Address', address);