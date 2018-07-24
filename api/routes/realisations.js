const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Realisation = require('../models/realisation');
const multer = require('multer');
const mime = require('mime');
const permit = require('../middleware/permissions');
const Pusher = require("pusher");
var path = require('path');
const fs = require('fs');

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
        cb(null, './projects/');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString() + '.' + mime.extension(file.mimetype));
    }
});
var upload = multer({storage: storage});


router.post('/', permit("admin"), function (req, res, next) {
    const realisation = new Realisation({
        _id: new mongoose.Types.ObjectId(),
        title: req.body.title,
        description: req.body.description,
        active: true
    });
    realisation.save().then(
        result => {
            res.status(200).json(result);
        }
    ).catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});



router.post("/upload/:id", upload.single("img"), permit("admin"), function (req, res) {
    const id = req.params.id;
    Realisation.update({_id: id}, {$set: {picture: req.file.path }})
        .exec()
        .then(result => {
            Realisation.find().exec().then(doc => {
                pusher.trigger("events-channel", "realisations", doc);
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




router.get('/', permit("admin"), function (req, res) {
    Realisation.find().exec()
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



router.get('/active', permit("anonymous","Client","Admin"), function (req, res) {
    Realisation.find({'active':true}).exec()
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





//********************* archive realisation ******************
router.patch("/archive/:id", permit("anonymous","Client","admin"), (req, res, next) => {
    const id = req.params.id;
    let active;
    Realisation.findById(id).exec().then(result => {
        if (result.active){
            active= false;
        }else{
            active = true;
        }
        Realisation.update({_id: id}, {active: active})
            .exec()
            .then(result => {
                Realisation.find().exec().then(doc => {
                    pusher.trigger("events-channel", "realisations", doc);
                });
                res.status(200).json({
                    message: "product updated",
                });
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


//********************* get image ******************
router.get('/img/:id', permit("anonymous","Client","admin"), function (req, res) {
    Realisation.findById(req.params.id)
        .exec()
        .then(result => {
            res.sendFile(path.join(__dirname, '../..', result.picture));
        }).catch( err => res.status(400).json(err));
});



router.patch("/", permit("anonymous","Client","admin"), (req, res, next) => {
    const id = req.body._id;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    Realisation.update({_id: id}, {$set: updateOps})
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


router.patch("/upload/:id", upload.single("img"), permit("anonymous"), function (req, res) {
    const id = req.params.id;
    Realisation.findById(id).exec().then(result => {
        var tmp = result.picture;
        Realisation.update({_id: id}, {$set: {picture: req.file.path}})
            .exec()
            .then(result => {
                Realisation.find().exec().then(doc => {
                    fs.unlink('./'+tmp, (err) => {
                        if (err) throw err;
                        console.log('successfully deleted /tmp/hello');
                    });
                    pusher.trigger("events-channel", "realisations", doc);

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
});

















module.exports = router;