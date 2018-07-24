const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/order");
const permit = require('../middleware/permissions');
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const Pusher = require("pusher");

const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});





router.get("/get/ready", permit("admin"), (req, res, next) => {
    Order.find({'state': { $eq: 3 }}).populate('user')
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


router.get("/", permit("admin"), (req, res, next) => {
    Order.find()
        .select("product quantity _id")
        .populate('product', 'name')
        .exec()
        .then(docs => {
            res.status(200).json({
                count: docs.length,
                orders: docs.map(doc => {
                    return {
                        _id: doc._id,
                        product: doc.product,
                        quantity: doc.quantity,
                        request: {
                            type: "GET",
                            url: "http://localhost:3000/orders/" + doc._id
                        }
                    };
                })
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});


router.get("/:orderId", permit("admin","Client"), (req, res, next) => {
    Order.findById(req.params.orderId)
        .populate('product')
        .exec()
        .then(order => {
            if (!order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }
            res.status(200).json({
                order: order,
                request: {
                    type: "GET",
                    url: "http://localhost:3000/orders"
                }
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});

router.delete("/:orderId", permit("admin"), (req, res, next) => {
    Order.remove({_id: req.params.orderId})
        .exec()
        .then(result => {
            res.status(200).json({
                message: "Order deleted"
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});



//********************* archive order ******************
router.patch("/archive", permit("admin"), (req, res, next) => {
    const id = req.body._id;
    let active;
    Order.findById(id).exec().then(result => {
        if (result.active){
            active= false;
        }else{
            active = true;
        }
        Order.update({_id: id}, {active: active})
            .exec()
            .then(result => {
                Order.find().populate('user').populate({
                    path: 'orderLines',
                    populate: {path: 'product', select: 'reference name'}
                }).exec().then(doc => {
                    pusher.trigger("events-channel", "orders", doc);
                });
                res.status(200).json({'active':active});
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

});




//********************* change state order ******************
router.patch("/state", permit("admin"), (req, res, next) => {
    const id = req.body._id;
    const state = req.body.state;
    Order.findById(id).exec().then(order => {
        Order.update({_id: id}, {state: state,notify: true})
            .exec()
            .then(result => {
                User.findById(order.user).exec().then(user =>{
                    Order.find({user:user._id, notify: true}).exec().then(results => {
                        pusher.trigger("events-channel", user.email , results);
                    });
                });
                Order.find().populate('user').populate({
                    path: 'orderLines',
                    populate: {path: 'product', select: 'reference name'}
                }).exec().then(doc => {
                    pusher.trigger("events-channel", "orders", doc);
                });
                res.status(200).json(result);
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

});

// get old orders by User
router.get("/notify/:token", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            Order.find({user:user._id, notify: true}).exec().then(orders => {
                res.status(200).json(orders);
            }).catch(err => {
                res.status(400).json({message:"error"});
            });
        }).catch(err => res.status(400).json({message:"error"}));
});


// get old orders by User
router.get("/by-user/:token", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            Order.find({'user':user._id, 'state': { $gt: 0 }}).populate('user').populate({
                path: 'orderLines',
                populate: {path: 'product', select: 'reference name'}
            }).exec().then(orders => {
                res.status(200).json(orders);
                //pusher.trigger("events-channel", "orders", doc);
            }).catch(err => {
                res.status(400).json({message:"error"});
            });
        }).catch(err => res.status(400).json({message:"error"}));
});



//********************* archive order ******************
router.patch("/notification/:token", permit("Client"), (req, res, next) => {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId).select('email')
        .then(user => {
            if(user){
                Order.find({user:user._id, notify: true}).select('_id').exec().then(result =>{
                    Order.update({'_id': { $in: result }}, {notify: false}).exec().then(orders => {
                        Order.find({user:user._id, notify: true}).exec().then(results => {
                            pusher.trigger("events-channel", user.email , results);
                            res.status(200).json(orders);
                        });
                    }).catch(err => {
                        res.status(400).json({message:"error"});
                    });
                    }).catch(err => console.log(err));

            }
        }).catch(err => res.status(400).json({message:"error"}));

});



router.get("/by-planning/:id", permit("Driver","admin"), (req, res, next) => {
            Order.find({'tour':req.params.id}).sort('numberTour').select('reference ').populate('user','firstName lastName address').populate({
                path: 'orderLines', select: 'quantity',
                populate: {path: 'product', select: 'reference name quantity'}
            }).exec().then(orders => {
                res.status(200).json(orders);
                //pusher.trigger("events-channel", "orders", doc);

        }).catch(err => res.status(400).json({message:"error"}));
});










module.exports = router;