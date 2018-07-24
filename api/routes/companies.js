const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Company = require('../models/company');
const permit = require('../middleware/permissions');

router.get('/', permit("admin","anonymous","Client"), function (req, res) {
    Company.findOne().exec()
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

router.get('/:id', permit("admin","Client","Driver"), function (req, res) {
    Company.findById(req.params.id)
        .exec()
        .then(doc => {
            if (doc) {
                res.status(200).json(doc);
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




router.post('/', permit("admin"), function (req, res, next) {
    const company = new Company({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        address: {
            'city': req.body.address.city,
            'zip': req.body.address.zip,
            'street': req.body.address.street,
            'longitude': req.body.address.longitude,
            'latitude': req.body.address.latitude
        },
        telephoneNumber: req.body.telephoneNumber,
        email: req.body.email,
        beginOpenDay: req.body.beginOpenDay,
        endOpenDay: req.body.endOpenDay,
        closeTime: req.body.closeTime,
        openTime: req.body.openTime,
    });
    company.save().then(result => {
        res.status(201).json(result);
    })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});


router.patch("/:id", permit("admin"), (req, res, next) => {
    const id = req.params.id;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    Company.update({_id: id}, {$set: updateOps})
        .exec()
        .then(result => {
            console.log(result);
            res.status(200).json(result);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });

});


module.exports = router;