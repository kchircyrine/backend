const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require("dotenv").config();
const Pusher = require("pusher");



//const acl = require('express-acl');


const productRoutes = require('./api/routes/products');
const orderRoutes = require('./api/routes/orders');
const categoryRoutes = require('./api/routes/categories');
const companyRoutes = require('./api/routes/companies');
const userRoutes = require('./api/routes/users');
const orderLineRoutes = require('./api/routes/orderlines');
const wishlistRoutes = require('./api/routes/wishlists');
const orderPdfRoutes = require('./api/routes/order_pdf');
const staticsRoutes = require('./api/routes/statistics');
const messagesRoutes = require('./api/routes/messages');
const importRoutes =  require('./api/routes/excel_import_products');
const commentRoutes = require('./api/routes/comments');
const realisationRoutes = require('./api/routes/realisations');
const typeRoutes = require('./api/routes/types');
const tourRoutes = require('./api/routes/tours');


const authentifcation = require('./api/middleware/authentification');

/*acl.config({
    filename: 'nacl.json',
    defaultRole: 'anonymous'

});

//app.use(acl.authorize);*/




//Set up default mongoose connection
var mongoDB = 'mongodb://localhost:27017/protecfer_db';
mongoose.connect(mongoDB);

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

// authenticate each request
// will set `request.user`
app.use(authentifcation);




app.use(morgan('dev'));
app.use(bodyParser.json({limit: '1000mb'}));
app.use(bodyParser.urlencoded({extended: true},{limit: '1000mb'}));


//***************** routes for api ********************//
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orderlines', orderLineRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/pdf', orderPdfRoutes);
app.use('/api/statics', staticsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/import', importRoutes);
app.use('/api/comments',commentRoutes);
app.use('/api/realisations', realisationRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/tours', tourRoutes);

app.use(express.static(__dirname + '/public'));

app.use(function (req, res, next) {
    const Error = new Error('Not found');
    error.status(404);
    next(error);
});

app.use(function (error, req, res, next) {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});


module.exports = app;