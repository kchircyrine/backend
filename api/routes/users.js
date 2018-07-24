const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const randonstring = require('randomstring');
const mailer = require('../mailer/mailer');
const Pusher = require("pusher");
const permit = require('../middleware/permissions');
const moment = require('moment');
const range = require('moment-range');
var sortBy = require('sort-by');

const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});

router.post("/signup", permit("anonymous"), (req, res, next) => {
    User.find({email: req.body.email})
        .exec()
        .then(user => {
            const secretToken = randonstring.generate();
            if (user.length >= 1) {
                return res.status(400).json({
                    message: "Mail exists"
                });
            } else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).json({
                            error: "eeeeeeeee"
                        });
                    } else {
                        const user = new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: req.body.email,
                            password: hash,
                            status: 'inactif',
                            active: true,
                            firstName: req.body.firstName,
                            telephoneNumber: req.body.telephoneNumber,
                            lastName: req.body.lastName,
                            secretToken: secretToken,
                            address: {
                                'city': req.body.address.city,
                                'zip': req.body.address.zip,
                                'street': req.body.address.street,
                                'longitude': req.body.address.longitude,
                                'latitude': req.body.address.latitude
                            }
                        });
                        user
                            .save()
                            .then(result => {
                                // Compose email
                                const html = 'Bonjour Monsieur/Madame' + req.body.lastName +',<br/><br/>' +
                                    'Merci de confirmer votre email en cliquant ' +
                                    '<br/>sur le lien: <b>' + '</b><a href="http://localhost:4200/confirmation/' + secretToken + '">' +
                                    'ici </a> <br/><br/> Ayez une bonne journée.'

                                // Send email
                                mailer.sendEmail('cyrine.kchir@esprit.tn', result.email, 'Confirmation email!', html);
                                //req.flash('success', 'Please check your email.');


                                res.status(201).json({
                                    message: "User created"
                                });
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error: "ne marche pas"
                                });
                            });
                    }
                });
            }
        });
});


router.patch("/", permit("admin","Client"), (req, res, next) => {
    const id = req.body._id;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    User.update({_id: id}, {$set: updateOps})
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



//********************* get users ******************
router.get('/by/drivers', function (req, res) {
    User.find({role:'Driver'})
        .exec()
        .then(result => {
            res.status(200).json(result);
        })
        .catch(err => {
            console.log(err);
            res.status(404).json({
                message: "No valid entry found for provided ID",
            });
        });
});

router.patch("/confirm-email/:token",  permit("anonymous","Client"), (req, res, next) => {
    User.findOne({secretToken: req.params.token})
        .exec()
        .then(user => {
            if (user.status == 'actif') {
                return res.status(401).json(false);
            } else if (!user) {
                return res.status(401).json(false);
            } else {
                User.update({_id: user._id}, {status: 'actif'})
                    .exec().then(user => {
                    return res.status(200).json(true);
                });
            }
        })
        .catch(err => {
            res.status(500).json({
                message: false
            });
        });

});


router.post("/login", permit("anonymous"), (req, res, next) => {
    User.findOne({email: req.body.email})
        .exec()
        .then(user => {
            //res.status(200).json(user);
            bcrypt.compare(req.body.password, user.password, (err, result) => {
                if (err) {
                    return res.status(401).json({
                        message: "Auth failed"
                    });
                }
                if (result) {
                    if (user.status ==='actif' && user.active) {
                        const token = jwt.sign(
                            {
                                email: user.email,
                                userId: user._id,
                                role: user.role
                            },
                            process.env.JWT_KEY,
                            {
                                expiresIn: "24h"
                            }
                        );
                        user.token = token;
                        return res.status(200).json(
                            {
                                'user': {
                                    'firstName': user.firstName,
                                    'lastName': user.lastName,
                                    'email': user.email
                                },
                                'token': token
                            });
                    }
                    return res.status(409).json({
                        message: "Veuillez confirmer votre email"
                    });
                }
                res.status(401).json({
                    message: "Auth failed"
                });
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});


router.get('/:userId', permit("anonymous"), function (req, res) {
    User.findById(req.params.userId)
        .exec()
        .then(doc => {
            if (doc) {
                res.status(200).json(doc);
            } else {
                res.status(404).json({message: "No valid entry found for provided ID"});
            }
        })
        .catch(err => {
            res.status(500).json({error: err});
        });
});


router.get('/byToken/:token', permit("Client"), function (req, res) {
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .exec()
        .then(doc => {
            if (doc) {
                res.status(200).json(doc);
            } else {
                res.status(404).json({message: "No valid entry found for provided ID"});
            }
        })
        .catch(err => {
             console.log(err);
            //res.status(500).json({error: err});
        });
});


//********************* get users ******************
router.get('/', permit("admin"), function (req, res) {
    User.find()
        .exec()
        .then(result => {
            res.status(200).json(result);
        })
        .catch(err => {
            console.log(err);
            res.status(404).json({
                message: "No valid entry found for provided ID",
            });
        });
});


router.patch("/", permit("admin","Client"), (req, res, next) => {
    const id = req.body._id;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    User.update({_id: id}, {$set: updateOps})
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


//********************* archive user ******************
router.patch("/archive", permit("admin"), (req, res, next) => {
    const id = req.body._id;
    let active;
    let role;
    User.findById(id).exec().then(result => {
             role = result.role;
             if (result.active) {
                 active= false;
             } else {
                 active = true;
             }
            User.update({_id: id}, {active: active})
                .exec()
                .then(result => {
                    if (role === 'Client'){
                        User.find({role:'Client'}).exec().then(doc => {
                            pusher.trigger("events-channel", "users", doc);
                        });
                        res.status(200).json({
                            message: "user updated",
                        });
                    }else if (role === 'Driver'){
                        User.find({role:'Driver'}).exec().then(doc => {
                            pusher.trigger("events-channel", "drivers", doc);
                        });
                        res.status(200).json({
                            message: "user updated",
                        });
                    }
                    //res.status(200).json(result);
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



router.post("/by/drivers", permit("admin"), (req, res, next) => {
    User.find({email: req.body.email})
        .exec()
        .then(user => {
            if (user.length >= 1) {
                return res.status(400).json({
                    message: "Mail exists"
                });
            }  else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).json({
                            error: err
                        });
                    }
                    const user = new User({
                        _id: new mongoose.Types.ObjectId(),
                        email: req.body.email,
                        password: hash,
                        active: true,
                        status: 'actif',
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        telephoneNumber: req.body.telephoneNumber,
                        role: 'Driver'
                    });
                    user.save().then(result => {
                        User.find({'role':'Driver'}).exec().then(doc => {
                            pusher.trigger("events-channel", "drivers", doc);
                        });
                        res.status(201).json({
                            message: "User created"
                        });
                    }).catch(err => {
                        res.status(500).json({
                            error: err
                        });
                    });
                });
            }
        });
});



router.patch("/by/drivers", permit("admin"), (req, res, next) => {
    const id = req.body._id;
    User.find({email: req.body.email, _id: { $ne: id }})
        .exec()
        .then(user => {
            if (user.length >= 1) {
                return res.status(400).json({
                    message: "Mail exists"
                });
            }
            else {
                const updateOps = {};
                for (var key in req.body) {
                    if (req.body.hasOwnProperty(key)) {
                        updateOps[key] = req.body[key];
                    }
                }
                User.update({_id: id}, {$set: updateOps})
                    .exec()
                    .then(result => {
                        User.find({'role':'Driver'}).exec().then(doc => {
                            pusher.trigger("events-channel", "drivers", doc);
                        });
                        res.status(200).json(result);
                    })
                    .catch(err => {
                        res.status(500).json({
                            error: err
                        });
                    });
            }
        });
});


//********************* get users ******************
router.get('/by/drivers/:datestart/:dateend', function (req, res) {
    var users = [];
    var startDateTour = new Date(req.params.datestart);
    var endDateTour = new Date(req.params.dateend);
    User.find({'role':'Driver','active':true}).populate('tours')
        //populate: {path: 'product', select: 'reference name'}
    .exec()
        .then(result => {
            result.forEach(function(user) {
                let tours = user.tours;
                // case: user doesn't have any tour
                if (tours.length === 0){
                  users.push(user);
                } else {
                    // case: user has tours
                    var found = false;
                    tours.sort(sortBy('deliveryDate'));
                    if (endDateTour < tours[0].deliveryDate) {
                        users.push(user);
                        found = true;
                    }
                    if (!found) {
                        var endDate   = new Date(tours[tours.length -1 ].deliveryDate.getTime()  + (1000 *tours[tours.length -1].duration));
                        if (startDateTour >= endDate) {
                            users.push(user);
                            found = true;
                        }
                    }
                    if (!found) {
                        for (let i = 0; i < tours.length - 1; i++) {
                            var startDate = tours[i+1].deliveryDate;
                            var endDate = new Date(tours[i].deliveryDate.getTime() + (1000 * tours[i].duration));
                            if ((startDateTour >= endDate) && (endDateTour <= startDate)) {
                                users.push(user);
                                found = true;
                                break;
                            }
                        }
                    }
                }
            });
            res.status(200).json(users);
        })
        .catch(err => {
            res.status(404).json({
                message: err
            });
        });
});


router.get('/mydriver/:id', permit("admin"), function (req, res) {
    User.findById(req.params.id)
        .exec()
        .then(user => {
            if (user) {
                console.log(user);
                res.status(200).json(user);
            } else {
                res
                    .status(404)
                    .json({ message: "No valid entry found for provided ID" });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err });
        });
});




module.exports = router;