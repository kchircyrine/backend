const mongoose = require('mongoose');
Schema = mongoose.Schema;

var MessageSchema = new Schema();

MessageSchema.add({
    _id: mongoose.Schema.Types.ObjectId,
    object: String,
    text: String,
    state: Boolean,
    creationDate: Date,
    messageParent: { type: mongoose.Schema.Types.ObjectId ,ref: 'Message'},
    sender: { type: mongoose.Schema.Types.ObjectId ,ref: 'User'},
    receiver: { type: mongoose.Schema.Types.ObjectId ,ref: 'User'}
});
var Message = mongoose.model('Message', MessageSchema);

module.exports = Message;