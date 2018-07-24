const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Category = require('../models/category');
const Pusher = require("pusher");
const permit = require('../middleware/permissions');




const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});

router.get('/', permit("admin","Client","anonymous"), function (req, res) {
    Category.find().select('name parent categoryParent _id subCategories').populate('categoryParent', 'name').exec()
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



router.get('/only/categories', permit("anonymous","Client"), function (req, res) {
    Category.find({'parent': true}).select('name parent _id').exec()
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



router.post('/', function (req, res, next) {
    let category;
    let name = (req.body.name).replace(/ +(?= )/g,'').trim().toLowerCase();
    Category.find({name: name})
        .exec()
        .then(category => {
            if (category.length >= 1) {
                return res.status(409).json({
                    message: "Category name exists"
                });
            } else {
                if (req.body.parent) {
                    category = new Category({
                        _id: mongoose.Types.ObjectId(),
                        name: name,
                        parent: req.body.parent,
                        active: req.body.active
                    });
                } else {
                    category = new Category({
                        _id: mongoose.Types.ObjectId(),
                        name: req.body.name,
                        parent: req.body.parent,
                        categoryParent: req.body.categoryParent,
                        active: req.body.active
                    });
                }
                category.save().then(result => {
                    Category.find().populate('categoryParent').exec().then(doc => {
                        pusher.trigger("events-channel", "categories", doc);
                    });
                    res.status(201).json(category);
                })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        });
                    });
            }
        })

        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});

router.get('/:categoryId',permit("anonymous","Client"), function (req, res) {
    Category.findById(req.params.categoryId)
        .select('name parent categoryParent _id')
        .populate('categoryParent', 'name')
        .exec()
        .then(doc => {
            if (doc) {
                res.status(200).json({
                    category: doc,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3000/categories'
                    }
                });
            } else {
                res
                    .status(404)
                    .json({message: "No valid entry found for provided ID"});
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error: err});
        });
});

router.patch("/:categoryId", permit("admin"), (req, res, next) => {
    const id = req.params.categoryId;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    Category.update({_id: id}, {$set: updateOps})
        .exec()
        .then(result => {
            Category.find().populate('categoryParent').exec().then(doc => {
                pusher.trigger("events-channel", "categories", doc);
            });
            res.status(200).json(result);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});


router.delete('/:categoryId', permit("admin"), function (req, res) {
    Category.remove({_id: req.params.categoryId})
        .exec().then(result => {
        res.status(200).json({
            message: 'Category deleted',
            request: {
                type: 'POST',
                url: 'http://localhost:3000/categories',
                body: {name: 'String', parent: 'Boolean', categoryParent: "ID"}
            }
        });
    })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });


});



//********************* archive category ******************
router.patch("/archive/:id", permit("admin"), (req, res, next) => {
    const id = req.params.id;
    let active;
    Category.findById(id).exec().then(result => {
        if (result){
            if (result.active){
                active= false;
            }else{
                active = true;
            }
            Category.update({_id: id}, {active: active})
                .exec()
                .then(result => {
                    Category.find().populate('categoryParent').exec().then(doc => {
                        pusher.trigger("events-channel", "categories", doc);
                    });
                    res.status(200).json({
                        message: "category updated",
                    });
                    //res.status(200).json(result);
                })
                .catch(err => {
                    res.status(500).json({
                        error: err
                    });
                });
        }

    })
        .catch(err => {
            res.status(404).json({
                message: "No valid entry found for provided ID",
            });
        });

});


module.exports = router;