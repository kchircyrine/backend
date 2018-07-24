const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Tour = require('../models/tour');
const Order = require('../models/order');
const permit = require('../middleware/permissions');
const http = require('http');
const jwt = require("jsonwebtoken");
const User = require('../models/user');

router.post('/', permit("admin"), function (req, res, next) {
    const tour = new Tour({
        _id: new mongoose.Types.ObjectId(),
        name : req.body.name,
        state: 0,
        deliveryDate: req.body.deliveryDate,
        duration : req.body.duration,
        user: null
    });
    tour.save()
        .then(tourResult => {
            for (var i = 0; i < req.body.ordersIds.length; i++) {
                Order.update({_id: req.body.ordersIds[i] }, {state: 4, numberTour: i, tour: tourResult._id}).then(doc => {})
                    .catch(err=>res.status(500).json({ error: err }));
            }
                res.status(200).send(tourResult);
        }
        ).catch(err => {
        console.log(err);
        res.status(500).json({ error: err });
    });
});


router.get('/polyline/:geocode',(req, res1, next) =>{
    var url = 'http://192.168.64.2:5000/route/v1/driving/'+ req.params.geocode +'?overview=simplified&geometries=polyline&steps=true';

    http.get(url, function(res){
        var body = '';

        res.on('data', function(chunk){
            body += chunk;
        });

        res.on('end', function(){
            var fbResponse = JSON.parse(body);
            return res1.status(200).json(fbResponse);
        });
    }).on('error', function(e){
        console.log("Got an error: ", e);
    });
});



router.get('/plannings',(req, res, next) =>{
    var results = [];
    const millisecondsPerMinute = 60000;
    Tour.find().populate('user').exec().then(tours => {
        for (var i = 0; i < tours.length; i++) {
            var editable = true;
            var color = '#FF0000';
             if(tours[i].user != null){
                 editable = false;
                 color =  '#32CD32';
             }
            const minutesToAdjust = tours[i].duration * 0.1;
                results.push(
                    {   title: tours[i].name,
                        start: tours[i].deliveryDate,
                        id: tours[i]._id,
                        end: new Date(tours[i].deliveryDate.getTime() + (minutesToAdjust * millisecondsPerMinute)),
                        driver: tours[i].user,
                        editable: editable,
                        color: color
                    });
        }
        res.contentType('application/json');
        res.status(200).send(results);
    });
});



//********************* archive product ******************
router.patch("/:id", permit("admin"), (req, res, next) => {
    const id = req.params.id;
    const updateOps = {};
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            updateOps[key] = req.body[key];
        }
    }
    if (updateOps['user'] =='none') {
        updateOps['user']= null;
    }
    updateOps['state'] = 1;
    Tour.update({_id: id}, {$set: updateOps})
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


router.get('/plannings/:token',(req, res, next) =>{
    var id = '';
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            id = user._id;
            Tour.find({'user': id}).exec()
                .then(result => {
                    if (result) {
                        res.status(200).json(result);
                    } else {
                        res.status(404).json({message: "No valid entry found for provided ID"});
                    }
                })
                .catch(err => {
                    res.status(500).json({error: err});
                });
        });
});


router.get('/plannings/:token/:date',(req, res) =>{
    var id = '';
    var newDate = new Date(req.params.date);
    var decoded = jwt.decode(req.params.token, process.env.JWT_KEY);
    User.findById(decoded.userId)
        .then(user => {
            id = user._id;
            var nextDay = new Date(newDate);
            nextDay.setDate(newDate.getDate()+1);
            Tour.find({'user': id,'deliveryDate':{$gt: newDate, $lt: nextDay}})
                .populate('orders','_id')
                .exec()
                .then(result => {
                    if (result) {
                        console.log(result);
                        res.status(200).json(result);
                    } else {
                        res.status(404).json({message: "No valid entry found for provided ID"});
                    }
                })
                .catch(err => {
                    res.status(500).json({error: err});
                });
        });

});

//********************* change message state ******************
router.delete("/:id", permit("admin"), (req, res, next) => {
    const id = req.params.id;
    console.log(id);
    Order.find({'tour':id}).exec().then(orders => {
        for (var i = 0; i < orders.length; i++) {
            Order.update({_id: orders[i]._id }, {$set: {'tour':null, 'state':3}})
                .then(doc => {
                    console.log(doc);
                }).catch(err => res.status(500).json({ error: err }));
        }
        Tour.remove({_id: id}).exec().then(result => {
            if (result) {
                res.status(200).json({
                    message: "messages deleted",
                }).catch(err => {
                });
            }
        }).catch(err3 => {

        });
    }).catch(err1 => {

    });
    /*Tour.remove({id: id}).exec().then(result => {
        if (result) {
            res.status(200).json({
                message: "messages deleted",
            }).catch(err => {
                res.status(404).json({
                    message: "No valid entry found for provided ID",
                });
            });
        }
    }).catch(err => {
        res.status(404).json({
            message: "No valid entry found for provided ID",
        });
    });*/
});





module.exports = router;