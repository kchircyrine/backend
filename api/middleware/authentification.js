const jwt = require('jsonwebtoken');
module.exports = function authorize(req, res, next) {
    if (req.headers['authorization'] != undefined) {
        var token = req.headers['authorization'].split(" ")[1];
        if (token != '-1') {
            jwt.verify(token, process.env.JWT_KEY, function (err, decoded) {
                if (err) {
                    req.user = {role: 'anonymous'};
                    next();
                } else {
                    req.user = decoded;
                    next();
                }
            });
        }else {
            req.user = {role: 'anonymous'};
            next();
        }
    }
    else {
        req.user = {role: 'anonymous'};
        next();
    }
}