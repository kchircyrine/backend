const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/comment');
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Product = require("../models/product");
const permit = require('../middleware/permissions');
const Pusher = require("pusher");


const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});

router.post('/', permit("Client"), function (req, res, next) {
    var decoded = jwt.decode(req.body.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            } else {
                Product.findOne({'reference':req.body.product}).then(product => {
                    if (product) {
                        const comment = new Comment({
                            _id: new mongoose.Types.ObjectId(),
                            text: req.body.text,
                            state: '0',
                            creationDate: new Date(),
                            user: user._id,
                            product: product._id
                        });
                        comment.save().then(result => {
                            Comment.find({'product':product._id}).populate('user', 'firstName lastName').then(results => {
                                pusher.trigger("events-channel", product._id, results);
                            });

                            res.status(201).json(result);
                        })
                            .catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error: err
                                });
                            });
                    }
                }).catch(err => res.status(400).json(err))


            }
        }).catch(err => {
        res.status(500).json({
            error: err
        });
    });
});



module.exports = router;