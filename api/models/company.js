const mongoose = require('mongoose');
const Address= require('./address.js');

const companySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: Address,
    telephoneNumber: String,
    email: String,
    beginOpenDay: String,
    endOpenDay: String,
    closeTime: String,
    openTime: String,
});

module.exports = mongoose.model('Company', companySchema);