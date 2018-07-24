const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const Product = require('../models/product');
const Wishlist = require('../models/wishlist');
const jwt = require("jsonwebtoken");
const Pusher = require("pusher");
const permit = require('../middleware/permissions');

const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});

router.post("/", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.body.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
            Product.findOne({reference: req.body.productReference})
                .then(product => {
                    if (!product) {
                        return res.status(404).json({
                            message: "Product not found"
                        });
                    }
                    Wishlist.findOne({product: product, user: user._id})
                        .then(wishlist => {
                            if (wishlist) {
                                return res.status(404).json({
                                    message: "wishlist exists"
                                });
                            }
                            const newWishlist = new Wishlist({
                                _id: mongoose.Types.ObjectId(),
                                product: product._id,
                                user: user._id
                            });

                            newWishlist.save().then(result => {
                                if (result) {
                                    Wishlist.find({user: user._id}).populate({
                                        path: 'product',
                                        select: 'name reference id price',
                                        populate: {path: 'category', select: 'name'}
                                    })
                                        .then(wishlists => {
                                            pusher.trigger("events-channel", "wishlists", wishlists);
                                            return res.status(200).json(wishlist);
                                        })
                                        .catch(err => {
                                            console.log(err);
                                            return res.status(500).json({
                                                error: err
                                            });
                                        })

                                }
                            })
                                .catch(err => {
                                    console.log(err);
                                    res.status(500).json({
                                        error: err
                                    });
                                });

                        });
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    });
                });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});


//********************* delete wishlist ******************
router.delete('/:id/:token', permit("Client"), function (req, res) {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            } else {
                Wishlist.remove({_id: req.params.id})
                    .exec().then(result => {
                    if (result) {
                        Wishlist.find({user: user._id}).populate({
                            path: 'product',
                            select: 'name reference id price',
                            populate: {path: 'category', select: 'name'}
                        })
                            .then(wishlists => {
                                pusher.trigger("events-channel", "wishlists", wishlists);
                                return res.status(200).json(wishlists);
                            })
                            .catch(err => {
                                console.log(err);
                                return res.status(500).json({
                                    error: err
                                });
                            })
                    }
                })
                    .catch(err => {
                        res.status(500).json({
                            error: false
                        });
                    });
            }
        }).catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });


});


router.get('/:token', permit("Client"),function (req, res) {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
            Wishlist.find({user: user._id}).populate({
                path: 'product',
                select: 'name reference id price',
                populate: {path: 'category', select: 'name'}
            })
                .then(wishlist => {
                    if (!wishlist) {
                        return res.status(404).json({
                            message: "Wishlist not found"
                        });
                    }
                    return res.status(200).json(wishlist);
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    });
                });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});


// ******************************* get the number of wishlists ****************************************
router.get("/numberWishlist/:token/", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
            Wishlist.find({user: user._id}).populate({
                path: 'product',
                select: 'name'
            })
                .then(wishlist => {
                    return res.status(200).json(wishlist.length);
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    });
                });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});



router.get('/ids/wishlists/:token', permit("Client"),function (req, res) {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    var results = [];
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
            Wishlist.find({user: user._id}).populate ({
                path: 'product',
                select: 'id'
            })
                .then(wishlist => {
                    for (var i = 0; i < wishlist.length; i++) {
                        results.push(wishlist[i].product._id);
                    }
                    return res.status(200).json(results);
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    });
                });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});

module.exports = router;