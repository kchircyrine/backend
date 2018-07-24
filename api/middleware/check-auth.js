const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    /*try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userData = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Auth failed'
        });
    }*/

    var token = req.headers.authorization.split(" ")[1];
       return res.status(200).json({
        message: token
       });

    if (token) {
        jwt.verify(token, key, function (err, decoded) {
            if (err) {
                return res.send(err);
            } else {
                req.decoded = decoded;
                next();
            }

        });
    }
}