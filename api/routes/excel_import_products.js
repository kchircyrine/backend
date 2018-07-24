const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const Type = require('../models/type');
const multer = require('multer');
const mime = require('mime');
var bodyParser = require('body-parser');
var xlsxtojson = require("xlsx-to-json-lc");
const permit = require('../middleware/permissions');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './excel/');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString() + '.' + mime.extension(file.mimetype));
    }
});
var upload = multer({storage: storage});


router.post("/upload", upload.single('img'), permit("admin"), function (req, res) {
    var exceltojson = xlsxtojson;
    var idCategory;
    try {
        exceltojson({
            input: req.file.path,
            output: null,
            lowerCaseHeaders: true
        }, function (err, result) {
            exceltojson({
                input: req.file.path,
                output: null,
                lowerCaseHeaders: true
            }, function (err, result) {
                result.forEach(function (value) {
                    if (value['name'] !== '' &&  value['price'] !== ''
                        &&  value['description'] !== '' &&  value['reference'] !== ''
                        &&  value['colors'] !== '' &&  value['category'] !== '' &&  value['type'] !== '' && !isNaN(parseFloat(value['price']))) {
                        var nameCategory = value['category'];
                        Category.findOne({'name': nameCategory}).exec()
                            .then(result => {
                                if (!!result){
                                    idCategory = result._id;
                                Type.findOne({'name': value['type']}).exec()
                                    .then(type => {
                                        if (type) {
                                            Product.find({'reference': value['reference']}).exec()
                                                .then(products => {
                                                    if (products.length == 0){
                                                        const product = new Product({
                                                            _id: new mongoose.Types.ObjectId(),
                                                            name: value['name'],
                                                            price: value['price'],
                                                            description: value['description'],
                                                            reference: value['reference'],
                                                            colors: value['colors'],
                                                            active: false,
                                                            category: idCategory,
                                                            type: type._id
                                                        });
                                                        product.save().then(
                                                            results => {
                                                                console.log("saved");
                                                                //res.status(201).json(result);
                                                            }
                                                        );
                                                    }

                                                });

                                                    }
                                                });

                              }
                            }).catch(err =>{
                                console.log(err);
                            });
                    }else {
                        res.status(200).json('fichier a été ajouté');
                    }

                });
            });
        });
    } catch (e) {
        res.json({error_code: 1, err_desc: "Corupted excel file"});
    }

    /** Multer gives us file info in req.file object */
    if (!req.file) {
        res.json({error_code: 1, err_desc: "No file passed"});
        return;
    }


});

module.exports = router;