const mongoose = require('mongoose');
const Picture= require('./picture_product.js');

const productSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    description: String,
    reference:String,
    colors: String,
    active: Boolean,
    dateCreation: Date,
    pictures: [Picture],
    defaultPicture: Picture,
    category: { type: mongoose.Schema.Types.ObjectId ,ref: 'Category'},
    type: { type: mongoose.Schema.Types.ObjectId ,ref: 'Type' }
});

productSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'product'
});

productSchema.set('toJSON', { virtuals: true });


module.exports = mongoose.model('Product', productSchema);