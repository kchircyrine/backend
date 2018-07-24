const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
var fs = require('fs');
var path = require('path');
var pdf = require('dynamic-html-pdf');
const Order = require("../models/order");
const Company = require("../models/company");
var jsonPath = path.join(__dirname, '..', 'views', 'order.html');
var html = fs.readFileSync(jsonPath, 'utf8');
var dateFormat = require('dateformat');
const mailer = require('../mailer/mailer');
const permit = require('../middleware/permissions');

router.patch('/:reference', permit("Client"), function (req, res, next) {
    Order.findOne({'reference': req.params.reference}).populate('user').populate({
        path: 'orderLines',
        populate: {path: 'product', select: 'reference name'}
    })
        .exec()
        .then(result => {
            if (result) {
                Company.findOne().exec()
                    .then(company => {
                        if (company) {
                            var options = {
                                format: "A3",
                                orientation: "portrait",
                                border: "10mm"
                            };
                            var subTotal = 0;


                            for (var i = 0, len = result.orderLines.length; i < len; i++) {
                               subTotal = subTotal + result.orderLines[i].price;
                            }
                            var taxPrice = subTotal * 0.19;
                            var deliveryPrice = subTotal * 0.1;
                            var totalPrice = taxPrice + deliveryPrice + subTotal;
                            var document = {
                                template: html,
                                context: {
                                    options: {
                                        firstName: result.user.firstName,
                                        lastName: result.user.lastName,
                                        email: result.user.email,
                                        telephoneNumber: result.user.telephoneNumber,
                                        address: result.user.address.address,
                                        city: result.user.address.city,
                                        zip: result.user.address.zip,
                                        dateCreation: dateFormat(result.dateCreation, "dd-mm-yyyy"),
                                        reference: result.reference,
                                        orderLines: result.orderLines,
                                        nameCompany: company.name,
                                        addressCompany: company.address.address,
                                        cityCompany: company.address.city,
                                        zipCompany: company.address.zip,
                                        emailCompany: company.email,
                                        telephoneNumberCompany: company.telephoneNumber,
                                        totalPrice: totalPrice,
                                        subTotal: subTotal,
                                        deliveryPrice: deliveryPrice,
                                        taxPrice: taxPrice
                                    },
                                },
                                path: "./orders/" + result.reference + ".pdf"
                            };
                            pdf.create(document, options)
                                .then(file => {
                                    Order.update({_id: result._id}, {'state': 1, 'orderFile': file})
                                        .exec()
                                        .then(doc => {
                                            if (doc) {
                                                test = path.join(__dirname, '../..', 'orders/' + result.reference + '.pdf');
                                                ;
                                                var attachments = [{path: test}];
                                                const html = 'Bonjour' + result.user.lastName +  ', <br/>Votre commande a été effectuée avec succés <br/><br/>' +
                                                    'Veuillez trouver ci joint le recu <br/><br/>Cordialement.'

                                                // Send email
                                                mailer.sendOrder('cyrine.kchir@gmail.com', result.user.email, 'Commande reçue!', html, attachments);
                                                res.status(200).json("finie");
                                            }
                                        })
                                        .catch(err => {
                                            console.log(err);
                                            res.status(500).json({
                                                error: err
                                            });
                                        });
                                })
                                .catch(error => {
                                    console.error(error)
                                });

                        }
                        //res.status(200).json(result);
                    });

            }
        })
        .catch(err => {
            console.log(err);
            res.status(404).json({
                message: "No valid entry found for provided ID",
            });
        });
})


router.get('/:reference', function (req, res, next) {
    Order.findOne({'reference': req.params.reference}).exec()
        .then(result => {
            var filePath = path.join(__dirname, '../..', 'orders/' + result.reference + '.pdf');
            fs.readFile(filePath, function (err, data) {
                res.contentType("application/pdf");
                res.send(data);
            });
        });
});


module.exports = router;