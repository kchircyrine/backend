const mongoose = require('mongoose');
Schema = mongoose.Schema;

var CategorySchema = new Schema();

CategorySchema.add({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    parent: Boolean,
    active: Boolean,
    categoryParent: { type: mongoose.Schema.Types.ObjectId ,ref: 'Category'},
    products: [{type: mongoose.Schema.Types.ObjectId, ref: 'Product'}],
    //subCategories: [{ type: mongoose.Schema.Types.ObjectId ,ref: 'Category'}]
});

/*CategorySchema.add({
    parent: {
        type: Schema.ObjectId,
    },
    name: String,
    subs: [CategorySchema]
});*/



/*const categorySchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    parent: Boolean,
    categoryParent: { type: mongoose.Schema.Types.ObjectId ,ref: 'Category'},
    products: [{type: mongoose.Schema.Types.ObjectId, ref: 'Product'}],
    subCatgories: [categorySchema]
});*/
//mongoose.model('Category', CategorySchema);
var Category = mongoose.model('Category', CategorySchema);
module.exports = Category;