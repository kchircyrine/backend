const mongoose = require('mongoose');
Schema = mongoose.Schema;

var CommentSchema = new Schema();

CommentSchema.add({
    _id: mongoose.Schema.Types.ObjectId,
    text: String,
    state: Boolean,
    creationDate: Date,
    product: { type: mongoose.Schema.Types.ObjectId ,ref: 'Product'},
    user: { type: mongoose.Schema.Types.ObjectId ,ref: 'User'},
});

var Comment = mongoose.model('Comment', CommentSchema);
module.exports = Comment;