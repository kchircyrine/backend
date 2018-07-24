const express = require("express");
const router = express.Router();

const Order = require("../models/order");
const OrderLine = require("../models/order_line");
const permit = require('../middleware/permissions');
const Pusher = require("pusher");


const pusher = new Pusher({
    appId: "515410",
    key: "777f49ce7e2a6cb91b3a",
    secret: "07ae3e3dddd6aeac5cd5",
    cluster: "eu",
    encrypted: true
});


//********************************************************************************************************************************
//**************************************************  articles per month *********************************************************
//********************************************************************************************************************************
router.get("/month", permit("admin"), (req, res, next) => {
    OrderLine.aggregate([
        {
            "$unwind": {
                "path":
                    "$order"
            }
        },
        {
            "$lookup": {
                "from": "orders",
                "localField": "order",
                "foreignField": "_id",
                "as": "order_joined"
            }
        },

        {"$unwind": "$order_joined"},
        {
            "$group": {
                "_id": {month: {$month: "$order_joined.dateCreation"}, year: {$year: "$order_joined.dateCreation"}},
                "total": {"$sum": "$quantity"}
            }
        }, {
            $project: {
                "total": 1,
            }
        }
    ], function (err, results) {
        if (err) {
            console.log(err);
            throw err;
        }
        res.status(200).json(results);
    })

});


//********************************************************************************************************************************
//**************************************************  articles per users *********************************************************
//********************************************************************************************************************************
router.get("/users", permit("admin"), (req, res, next) => {
    OrderLine.aggregate([
        {
            "$unwind": {
                "path":
                    "$order"
            }
        },

        {
            "$lookup": {
                "from": "orders",
                "localField": "order",
                "foreignField": "_id",
                "as": "order_joined"
            }
        },

        {"$unwind": "$order_joined"},
        {
            $lookup: {
                from: "users",
                localField: "order_joined.user",
                foreignField: "_id",
                as: "order.client"
            }
        },
        {
            "$group": {
                "_id": "$order_joined.user",
                "total": {"$sum": "$quantity"},
                "user": {"$first": "$order.client"},
            }
        }, {
            $project: {
                "total": 1,
                "user.lastName": 1,
                "user.firstName": 1
            }
        }
    ], function (err, results) {
        if (err) {
            console.log(err);
            throw err;
        }
        res.status(200).json(results);
    })

});


//********************************************************************************************************************************
//*******************************************************   ordered articles *************************************************
//********************************************************************************************************************************
router.get("/", permit("admin"),(req, res, next) => {
    Order.find(/*{'state': {$ne: 0}}*/).then(orders => {
        let arrayIds = [];
        if (orders) {
            orders.forEach(function (item) {
                arrayIds.push(item._id);
            })
            OrderLine.aggregate(
                [
                    {"$match": {"order": {$in: arrayIds}}},
                    {
                        "$group": {
                            _id: {product: "$product"/*, order: "$order"*/},
                            "order": {"$first": "$order"},
                            //"origId": {"$first": "$_id"},
                            count: {$sum: '$quantity'},
                            "product": {"$first": "$product"},

                        }
                    },
                    {
                        "$lookup":
                            {
                                "from": "orders",
                                "localField": "order",
                                "foreignField": "_id",
                                "as": "order"
                            }
                    }
                    ,
                    {
                        $lookup: {
                            from: "products",
                            localField: "product",
                            foreignField: "_id",
                            as: "product"
                        }
                    },
                    {
                        "$unwind":
                            {
                                "path":
                                    "$order"
                            }
                    },
                    {
                        $project: {
                            "count": 1,
                            "product.name": 1,
                            "product.reference": 1
                        }
                    }

                ],

                function (err, results) {
                    if (err) {
                        console.log(err);
                        throw err;
                    }
                    res.status(200).json(results);

                }
            )
            ;


        } else {
            res.status(404).json({message: "No valid entry found for provided ID"});
        }
    });
});


module.exports = router;