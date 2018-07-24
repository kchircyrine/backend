const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/product');
const multer = require('multer');
const mime = require('mime');
var lodash = require('lodash');
var path = require('path');
const Pusher = require("pusher");
const fs = require('fs');
const permit = require('../middleware/permissions');

const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});
//********************* upload image ******************
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString() + Math.random() + '.' + mime.extension(file.mimetype));
    }
});
var upload = multer({storage: storage});


router.patch("/upload/:productId", upload.array("uploads[]", 12), permit("admin"), function (req, res) {
    var pictures = [];
    let tmpDefault = '';
    const id = req.params.productId;
    var  indexes= [];
    Product.findById(id).exec().then(result => {
        var tmpImages = [];
        pictures = result.pictures.slice();
        var defaultPicture = result.defaultPicture;
        if(req.body.indexes!= ''){
            indexes = req.body.indexes.split(',');
        }
        if (indexes.length>0) {
            for (var i = 0; i < indexes.length; i++)  {
                let j= indexes[i];
                tmpImages.push(result.pictures[j].path);
                pictures.splice(pictures.indexOf(result.pictures[j]),1);
            }
        }
        var defaultImg = lodash.filter(req.files, x => x.originalname === 'default');
            if (defaultImg != '') {
                req.files.splice(req.files.indexOf(defaultImg[0]), 1);
                defaultPicture = defaultImg[0];
                if (result.defaultPicture){
                    tmpDefault = result.defaultPicture.path;
                }
            }
            if (req.files.length>0) {
                    pictures.push.apply(pictures, req.files);
            }
                    Product.update({_id: id}, {$set: {pictures: pictures,defaultPicture: defaultPicture}})
                        .exec()
                        .then(result => {
                            if (tmpDefault != ''){
                                fs.unlink('./'+ tmpDefault , (err) => {
                                    if (err) throw err;
                                });
                            }
                            if (indexes.length>0) {
                                for (var i = 0; i < tmpImages.length; i++)  {
                                    fs.unlink('./'+ tmpImages[i] , (err) => {
                                        if (err) throw err;
                                    });
                                }
                            }
                            res.status(200).json({
                                message: "upload file created",
                            });
                        })
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
});






//********************* get product ******************
router.get('/', permit("admin","anonymous","Client"), function (req, res) {
    Product.find({'active': true})
    //.select()
        .populate('category')
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


//********************* get product ******************
router.get('/prod/all', permit("admin"), function (req, res) {
    Product.find()
    //.select()
        .populate('category')
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

//********************* get image ******************
router.get('/img/:productId/:index', permit("admin","anonymous","Client"), function (req, res) {
    Product.findById(req.params.productId)
    //.select('name price _id defaultPicture')
        .exec()
        .then(result => {
            if (req.params.index == -1) {
                res.sendFile(path.join(__dirname, '../..', result.defaultPicture.path));
            } else {
                res.sendFile(path.join(__dirname, '../..', result.pictures[req.params.index].path));
            }
        }).catch( err =>  {
            res.sendFile(path.join(__dirname, '../..', '/uploads/notfound.jpeg'));
        }
        );
});

//********************* post product ******************
router.post('/', permit("admin"), function (req, res, next) {

    Product.find({reference: req.body.reference})
        .exec()
        .then(result => {
            if (result.length >= 1) {
                return res.status(400).json({
                    message: "Reference exists"
                });
            }else {
                const product = new Product({
                    _id: new mongoose.Types.ObjectId(),
                    name: req.body.name,
                    price: req.body.price,
                    description: req.body.description,
                    reference: req.body.reference,
                    colors: req.body.colors,
                    active: req.body.active,
                    //specifications: req.body.specifications,
                    category: req.body.category._id,
                    type: req.body.type._id
                });
                product.save().then(
                    result => {
                        //console.log(result);
                        res.status(201).json(result);
                    }
                ).catch(err => {
                    console.log(err);
                    res.status(500).json({
                        error: err
                    });
                });
            }
        });
});


router.patch("/toupload/:productId", upload.array("uploads[]", 12), permit("admin"), function (req, res) {
    const id = req.params.productId;
    var defaultImg = lodash.filter(req.files, x => x.originalname === 'default');
    req.files.splice(req.files.indexOf(defaultImg[0]), 1);
    Product.update({_id: id}, {$set: {defaultPicture: defaultImg[0], pictures: req.files}})
        .exec()
        .then(result => {
            Product.find().populate('category').exec().then(doc => {
                pusher.trigger("events-channel", "allproducts", doc);
            });
            Product.find({active: true}).populate('category').exec().then(doc => {
                pusher.trigger("events-channel", "products", doc);
            });
            res.status(200).json({
                message: "upload file created",

            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});


router.get('/:id', permit("admin","anonymous","Client"), function (req, res) {
    Product.findById(req.params.id)
        .populate('category')
        .populate({
            path: 'comments',
            populate: {path: 'user', select: 'firstName lastName'}
        })
        //.select('name price _id defaultPicture')
        .exec()
        .then(doc => {
            console.log("From database", doc);
            if (doc) {
                var pathImg = path.join(__dirname, '../..');
                res.status(200).json({
                    name: doc.name,
                    _id: doc.id,
                    price: doc.price,
                    description: doc.description,
                    reference: doc.reference,
                    colors: doc.colors,
                    specifications: doc.specifications,
                    category: doc.category,
                    path: pathImg,
                    comments: doc.comments
                    //defaultPicture: doc.defaultPicture.path,
                    //pictures: doc.pictures
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

router.patch("/:productId", permit("admin"), (req, res, next) => {
    const id = req.params.productId;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    Product.update({_id: id}, {$set: updateOps})
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


router.patch("/upload/:productId", permit("admin"), upload.array("uploads[]", 12), function (req, res) {
    const id = req.params.productId;
    var defaultImg = lodash.filter(req.files, x => x.originalname === 'default');
    req.files.splice(req.files.indexOf(defaultImg[0]), 1);
    Product.update({_id: id}, {$set: {defaultPicture: defaultImg[0], pictures: req.files}})
        .exec()
        .then(result => {
            res.status(200).json({
                message: "upload file created",
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});

//********************* delete product ******************
router.delete('/:productId', permit("admin"), function (req, res) {
    Product.remove({_id: req.params.productId})
        .exec().then(result => {
        res.status(200).json({
            message: 'Product deleted',
            request: {
                type: 'POST',
                url: 'http://localhost:3000/products',
                body: {name: 'String', price: 'Number'}
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



//********************* archive product ******************
router.patch("/archive/:id", permit("admin"), (req, res, next) => {
    const id = req.params.id;
    let active;
    Product.findById(id).exec().then(result => {
        if (result.active){
            active= false;
        }else{
            active = true;
        }
        Product.update({_id: id}, {active: active})
            .exec()
            .then(result => {
                Product.find({active:true}).populate('category').exec().then(doc => {
                    console.log("doc");
                    console.log(doc);
                    pusher.trigger("events-channel", "products", doc);
                });
                res.status(200).json({
                    message: "product updated",
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

});



//********************* get products ******************
router.get('/lastproducts/bydate', permit("admin","Client","anonymous"), function (req, res) {
    Product.find({'active':true})
        .populate('category')
        .limit(12)
        .sort({ dateCreation: -1 })
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




//********************* get products ******************
router.get('/sameCategory/:id', permit("admin","anonymous","Client"), function (req, res) {
            Product.find({'category':req.params.id, 'active': true /*, '_id':  { $ne: result._id }*/})
                .populate('category')
                .limit(12)
                .exec()

                .then(results => {
                    res.status(200).json(results);
                })
                .catch(err => {
                    res.status(404).json({
                        message: "No valid entry found for provided ID",
                    });
                });
});





//********************* get products ******************
router.get('/type/:id', permit("admin"), function (req, res) {
    Product.find({'type':req.params.id, 'active': true})
        .populate('category')
        .limit(12)
        .exec()
        .then(results => {
            res.status(200).json(results);
        })
        .catch(err => {
            res.status(404).json({
                message: "No valid entry found for provided ID",
            });
        });
});





module.exports = router;