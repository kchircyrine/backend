const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/message');
const Pusher = require("pusher");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const mailer = require('../mailer/mailer');
const permit = require('../middleware/permissions');


const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});


router.post('/', permit("admin","Client"), function (req, res) {
    var decoded = jwt.decode(req.body.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                } else {
                    User.findOne({'role':'admin'}).then(admin => {
                        const message = new Message({
                            _id: new mongoose.Types.ObjectId(),
                            object: req.body.object,
                            text: req.body.text,
                            state: '0',
                            creationDate: new Date(),
                            sender: user._id,
                            receiver: admin._id
                        });
                        message.save().then(
                            result => {
                                Message.find({'receiver': admin._id, 'state': '0', 'messageParent': null}).populate('sender').exec().then(doc => {
                                    pusher.trigger("events-channel", "unreadMessages", doc);
                                });
                                Message.find({'receiver': admin._id}).populate('sender').exec().then(doc => {
                                    pusher.trigger("events-channel", "messages", doc);
                                });
                                res.status(201).json(result);
                            }
                        )
                            .catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error: err
                                });
                            });

                    }).catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        });
                    });
                }
            }
        );
});


router.get('/', permit("admin","Client"), function (req, res) {
    User.findOne({'role':'admin'}).then(admin => {
        Message.find({'receiver': admin._id, 'messageParent': null}).populate('sender').populate('receiver')
            .exec()
            .then(result => {
                if (result) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({message: "No valid entry found for provided ID"});
                }
            })
            .catch(err => {
                res.status(500).json({error: err});
            });
    });
});


router.get('/:id', permit("admin","Client"), function (req, res) {
    Message.findOne({'_id': req.params.id}).populate('sender').populate('receiver')
        .exec()
        .then(result => {
            if (result) {
                res.status(200).json(result);
            } else {
                res.status(404).json({message: "No valid entry found for provided ID"});
            }
        })
        .catch(err => {
            res.status(500).json({error: err});
        });
});


router.get('/messages/unread', permit("admin"), function (req, res) {
    User.findOne({'role':'admin'}).then(admin => {
        Message.find({'receiver': admin._id, 'state': '0','messageParent': null}).populate('sender')
            .exec()
            .then(result => {
                if (result) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({message: "No valid entry found for provided ID"});
                }
            })
            .catch(err => {
                res.status(500).json({error: err});
            });
    }).catch(err => {
        res.status(500).json({error: err});
    });
});

//********************* change message state ******************
router.patch("/:id", permit("admin","Client"),(req, res, next) => {
    const id = req.params.id;
    User.findOne({'role':'admin'}).then(admin => {
        Message.findById(id).exec().then(result => {
            Message.update({_id: id}, {state: '1'})
                .exec()
                .then(result => {
                    Message.find({'receiver': admin._id, 'state': '0', 'messageParent': null}).populate('sender').then(doc => {
                        pusher.trigger("events-channel", "unreadMessages", doc);
                    });
                    res.status(200).json({
                        message: "message updated",
                    });
                })
                .catch(err => {
                    res.status(500).json({
                        error: err
                    });
                });
        })
            .catch(err => {
                res.status(404).json({
                    message: "No valid entry found for provided ID",
                });
            });


    }).catch(err => {
            res.status(500).json({error: err});
        });
});


//********************* change message state ******************
router.delete("/:listId", permit("admin"), (req, res, next) => {
    ids = JSON.parse(req.params.listId);
    Message.remove({_id: {$in: ids}}).exec().then(result => {
        if (result) {
            res.status(200).json({
                message: "messages deleted",
            }).catch(err => {
                res.status(404).json({
                    message: "No valid entry found for provided ID",
                });
            });
        }
    });
});


router.post('/answer',permit("admin"), function (req, res) {
    Message.findById(req.body.id).populate('sender').exec().then(result => {
        if (result) {
            User.findOne({'role':'admin'}).then(admin => {
                const message = new Message({
                    _id: new mongoose.Types.ObjectId(),
                    text: req.body.text,
                    state: '0',
                    creationDate: new Date(),
                    messageParent: result._id,
                    receiver: result.sender,
                    sender: admin._id
                });
                message.save().then(data => {
                    mailer.sendEmail('cyrine.kchir@esprit.tn', result.sender.email, 'réponse '+ result.object , req.body.text);
                    //req.flash('success', 'Please check your email.');
                    res.status(200).json({
                        message: "msg sent",
                    });

                }).catch(err => {
                    res.status(404).json({
                        message: "erreur",
                    });
                });

            });
        }
    }).catch(err => {
        res.status(404).json({
            message: "erreur2"
        });
    });
});

module.exports = router;