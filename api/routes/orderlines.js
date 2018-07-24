const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Order = require("../models/order");
const OrderLine = require("../models/order_line");
const Product = require("../models/product");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const randonstring = require('randomstring');
const permit = require('../middleware/permissions');

const Pusher = require("pusher");

const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});

router.patch("/:id", permit("Client"), (req, res, next) => {
    const id = req.params.id;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    OrderLine.update({_id: id}, {$set: updateOps})
        .exec()
        .then(result => {
            res.status(200).json(result);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});

router.post("/", permit("Client"),(req, res, next) => {
    let order;
    let productId;
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
                    productId = product._id;
                    Order.findOne({'state': 0, 'user': user._id}).then(orderResult => {
                        if (!orderResult) {
                            const reference = randonstring.generate();
                            order = new Order({
                                _id: mongoose.Types.ObjectId(),
                                reference: reference,
                                dateCreation: new Date(),
                                state: 0,
                                user: user._id,
                                active: true
                            });
                            order.save();
                            const orderLine = new OrderLine({
                                _id: mongoose.Types.ObjectId(),
                                quantity: req.body.quantity,
                                product: productId,
                                price: req.body.price,
                                height: req.body.height,
                                width: req.body.width,
                                thickness: req.body.thickness,
                                order: order._id
                            });
                            return orderLine.save().then(result => {
                                //res.status(201).json(orderLine);
                                Order.findOne({'state': 0, 'user': user._id}).populate('user').populate({
                                    path: 'orderLines',
                                    populate: {path: 'product', select: 'reference name price'}
                                }).exec().then(doc => {
                                    pusher.trigger("events-channel", "orders", doc);
                                    pusher.trigger("events-channel", "orderscount", doc.length);
                                });
                            })
                                .catch(err => {
                                    res.status(500).json({
                                        error: err
                                    });
                                });
                        } else {
                            order = orderResult;
                            OrderLine.findOne({
                                'order': order._id,
                                'width': req.body.width,
                                'height': req.body.height,
                                'thickness': req.body.thickness,
                                'product': productId
                            })
                                .then(orderLine => {
                                    if (orderLine) {
                                        OrderLine.update({_id: orderLine._id}, {'quantity': orderLine.quantity + req.body.quantity})
                                            .exec()
                                            .then(RES => {
                                                Order.findOne({'state': 0, 'user': user._id}).populate({
                                                    path: 'orderLines',
                                                    populate: {path: 'product', select: 'reference name'}
                                                }).exec().then(doc => {
                                                    pusher.trigger("events-channel", "orders", doc);
                                                    pusher.trigger("events-channel", "orderscount", doc.length);
                                                });
                                            })
                                            .catch(err => {
                                                return res.status(500).json({
                                                    error: err
                                                });
                                            });
                                        return res.status(201).json({
                                            message: "orderline update"
                                        });
                                    }

                                    else {
                                        const orderLine = new OrderLine({
                                            _id: mongoose.Types.ObjectId(),
                                            quantity: req.body.quantity,
                                            product: productId,
                                            price: req.body.price,
                                            height: req.body.height,
                                            width: req.body.width,
                                            thickness: req.body.thickness,
                                            order: order._id
                                        });
                                         orderLine.save().then(result => {
                                            Order.findOne({'state': 0, 'user': user._id}).populate({
                                                path: 'orderLines',
                                                populate: {path: 'product', select: 'reference name price'}
                                            }).exec().then(doc => {
                                                pusher.trigger("events-channel", "orders", doc);
                                                pusher.trigger("events-channel", "orderscount", doc.length);
                                            });
                                            res.status(201).json(orderLine);
                                        })
                                            .catch(err => {
                                                res.status(500).json({
                                                    error: err
                                                });
                                            });
                                    }


                                });
                        }
                    }).catch(err => {
                        res.status(500).json({
                            error: err
                        });
                    });
                })
                .catch(err => {
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


router.get("/:token", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId).then(user => {
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        Order.findOne({'state': 0, 'user': user._id}).populate({
            path: 'orderLines',
            populate: {path: 'product', select: 'reference name price'}
        }).then(orders => {
                return res.status(200).json(orders);
        }).catch(err => res.status(400).json(err));

        /*OrderLine.find().populate("order").exec(function (err, orderLines) {
            orderLines = orderLines.filter(function (orderLine) {
                return (new String(orderLine.order.user).trim() === new String(user._id).trim()) && (orderLine.order.state === 'not confirmed');
            });
            return res.status(200).json(orderLines);
        });*/
    })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});


//********************* delete orderline ******************
router.delete('/:id/:token', permit("admin","Client"),function (req, res) {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }else {
                OrderLine.remove({_id: req.params.id})
                    .exec().then(result => {
                    Order.findOne({'state': 0, 'user': user._id}).populate('user').populate({
                        path: 'orderLines',
                        populate: {path: 'product', select: 'reference name price'}
                    }).exec().then(doc => {
                        pusher.trigger("events-channel", "orders", doc);
                        pusher.trigger("events-channel", "orderscount", doc.length);
                    });
                    res.status(200).json({
                        message: 'orderline deleted'
                    });
                })
                    .catch(err => {
                        res.status(500).json({
                            error: err
                        });
                    });
            }

            }).catch(err => {
                res.status(500).json({
                     error: err
                 });
            });
});


router.get("/get/all", permit("admin"), (req, res, next) => {
    Order.find({'state': { $gt: 0 }}).populate('user').populate({
        path: 'orderLines',
        populate: {path: 'product', select: 'reference name'}
    })
        .exec()
        .then(docs => {
            res.status(200).json(docs);
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});


// ******************************* get the number of orderlines ****************************************
router.get("/numberOrders/:token", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId).then(user => {
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        Order.findOne({'state': 0, 'user': user._id}).populate({
            path: 'orderLines',
            populate: {path: 'product', select: 'name'}
        }).then(order => {
            if(order){
                return res.status(200).json(order.orderLines.length);
            }else {
                return res.status(200).json(0);
            }

        })
    }).catch(err => {
        res.status(500).json({error: err});
        });
});


module.exports = router;