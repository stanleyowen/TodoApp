const jwt = require('jsonwebtoken');
const passport = require('passport');
const router = require('express').Router();

const { encrypt } = require('../lib/crypto');
const MSG_DESC = require('../lib/callback');
let RevokedToken = require('../models/revoke-token.model');
let User = require('../models/users.model');

const jwtSecret = process.env.JWT_SECRET;
const status = process.env.NODE_ENV === 'production';

router.post('/register', (req, res, next) => {
    passport.authenticate('register', (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user) {
            req.logIn(user, err => {
                if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                else return res.cookie('jwt-token', jwt.sign({
                        id: user._id,
                        email: user.email,
                        auth: {
                            '2FA': user.security['2FA'],
                            status: false
                        }
                    }, jwtSecret, { expiresIn: '1d' }), {
                        path: '/',
                        expires: new Date(Date.now() + 86400000),
                        httpOnly: true,
                        secure: status,
                        sameSite: status ? 'none' : 'strict'
                    }).status(200).send(JSON.stringify({
                        statusCode: user.security['2FA'] ? 302 : 200,
                        message: info.message
                    }, null, 2));
            })
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.post('/login', (req, res, next) => {
    passport.authenticate('login', (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user){
            req.logIn(user, err => {
                if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                else{
                    const verify = user.security['2FA'];
                    return res.cookie('jwt-token', jwt.sign({
                        id: user._id,
                        email: user.email,
                        auth: {
                            '2FA': verify,
                            status: false
                        }
                    }, jwtSecret, { expiresIn: '1d' }), {
                        path: '/',
                        expires: JSON.parse(req.body.rememberMe) ? new Date(Date.now() + 86400000) : false,
                        httpOnly: true,
                        secure: status,
                        sameSite: status ? 'none' : 'strict'
                    }).status(verify ? 302 : 200).send(JSON.stringify({
                        statusCode: verify ? 302 : 200,
                        message: info.message
                    }, null, 2));
                }
            });
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.get('/user', (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0], 'XSRF-TOKEN': req.csrfToken()}, null, 2));
        else if(info && info.status === 302) return res.status(info.status).send(JSON.stringify({statusCode: info.status, message: info.message, email: info.email, 'XSRF-TOKEN': req.csrfToken()}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message, 'XSRF-TOKEN': req.csrfToken()}, null, 2));
        else if(user) return res.send(JSON.stringify({
                statusCode: 200,
                message: MSG_DESC[5],
                credentials: {
                    id: user._id,
                    email: user.email,
                    authenticated: true,
                    thirdParty: user.thirdParty,
                    verified: user.verified,
                    security: user.security
                },
                'XSRF-TOKEN': req.csrfToken()
            }, null, 2));
        else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34], 'XSRF-TOKEN': req.csrfToken() }, null, 2));
    })(req, res, next)
})

router.put('/user', (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user && (req.body = {...req.body, email: user.email, id: user.id})){
            passport.authenticate('changePassword', { session: false }, (err, account, info) => {
                if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
                else if(account) return res.cookie('jwt-token', jwt.sign({
                        id: user._id,
                        email: user.email,
                        auth: {
                            '2FA': user.security['2FA'],
                            status: false 
                        }
                    }, jwtSecret, { expiresIn: '1d' }), {
                        path: '/',
                        expires: new Date(Date.now() + 86400000),
                        httpOnly: true,
                        secure: status,
                        sameSite: status ? 'none' : 'strict'
                    }).status(200).send(JSON.stringify({
                        statusCode: user.security['2FA'] ? 302 : 200,
                        message: info.message
                    }, null, 2));
                else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
            })(req, res, next)
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.get('/forgot-password', (req, res, next) => {
    req.params = req.query;
    passport.authenticate('tokenData', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user) return res.send(JSON.stringify({
            statusCode: info.status,
            message: info.message,
            credentials: {
                id: user.id,
                email: user.email
            }
        }, null, 2))
        else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.post('/forgot-password', (req, res, next) => {
    passport.authenticate('forgotPassword', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user) return res.send(JSON.stringify({ statusCode: info.status, message: info.message }, null, 2))
        else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.post('/reset-password', (req, res, next) => {
    passport.authenticate('resetPassword', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user) return res.cookie('jwt-token', jwt.sign({
                id: user._id,
                email: user.email,
                auth: {
                    '2FA': user.security['2FA'],
                    status: false 
                }
            }, jwtSecret, { expiresIn: '1d' }), {
                path: '/',
                expires: new Date(Date.now() + 86400000),
                httpOnly: true,
                secure: status,
                sameSite: status ? 'none' : 'strict'
            }).status(200).send(JSON.stringify({
                statusCode: user.security['2FA'] ? 302 : 200,
                message: info.message
            }, null, 2));
        else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.get('/verify', (req, res, next) => {
    req.params = req.query;
    passport.authenticate('verifyUser', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user) return res.send(JSON.stringify({
            statusCode: info.status,
            message: info.message
        }, null, 2))
        else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.post('/verify', (req, res, next) => {
    passport.authenticate('verifyAccount', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user) return res.send(JSON.stringify({ statusCode: info.status, message: info.message }, null, 2))
        else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.get('/otp', (req, res, next) => {
    passport.authenticate('jwtOTP', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user && (req.body = user)) {
            passport.authenticate('sendOTP', { session: false }, (err, user, info) => {
                if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
                else if(user) return res.status(200).send(JSON.stringify({
                        statusCode: 200,
                        message: MSG_DESC[36],
                        credentials: {
                            userId: user.id,
                            tokenId: user.tokenId,
                            email: user.email
                        }
                    }, null, 2));
                else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
            })(req, res, next)
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.post('/otp', (req, res, next) => {
    passport.authenticate('jwtOTP', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user && (req.body = {...req.body, ...user._doc})) {
            passport.authenticate('verifyOTP', { session: false }, (err, user, info) => {
                if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
                else if(user) return res.cookie('jwt-token', jwt.sign({
                        id: user._id,
                        email: user.email,
                        auth: {
                            '2FA': user.security['2FA'],
                            status: true
                        }
                    }, jwtSecret, { expiresIn: '1d' }), {
                        path: '/',
                        expires: new Date(Date.now() + 86400000),
                        httpOnly: true,
                        secure: status,
                        sameSite: status ? 'none' : 'strict'
                    }).send(JSON.stringify({ statusCode: info.status, message: info.message }, null, 2));
                else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
            })(req, res, next)
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.put('/otp', (req, res, next) => {
    passport.authenticate('jwtOTP', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user && (req.body = {...req.body, ...user._doc})) {
            passport.authenticate('verifyOTP', { session: false }, (err, user, info) => {
                if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
                else if(user){
                    User.findById(user._id, (err, data) => {
                        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
                        else if(data){
                            data.security['2FA'] = !data.security['2FA'];
                            data.save();
                            return res.cookie('jwt-token', jwt.sign({
                                id: user._id,
                                email: user.email,
                                auth: {
                                    '2FA': !user.security['2FA'],
                                    status: !user.security['2FA']
                                }
                            }, jwtSecret, { expiresIn: '1d' }), {
                                path: '/',
                                expires: new Date(Date.now() + 86400000),
                                httpOnly: true,
                                secure: status,
                                sameSite: status ? 'none' : 'strict'
                            }).send(JSON.stringify({ statusCode: info.status, message: info.message }, null, 2));
                        } else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
                    })
                } else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
            })(req, res, next)
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

router.post('/logout', (req, res, next) => {
    passport.authenticate('jwtOTP', { session: false }, (err, user, info) => {
        if(err) return res.status(500).send(JSON.stringify({statusCode: 500, message: MSG_DESC[0]}, null, 2));
        else if(info && (info.status ? info.status >= 300 ? true : false : true)) return res.status(info.status ? info.status : info.status = 400).send(JSON.stringify({statusCode: info.status, message: info.message}, null, 2));
        else if(user){
            new RevokedToken ({ userId: user.id, token: encrypt(req.cookies['jwt-token'], 1) }).save();
            return res.cookie('jwt-token', '', {
                path: '/',
                maxAge: 0,
                httpOnly: true,
                secure: status,
                sameSite: status ? 'none' : 'strict'
            }).send(JSON.stringify({ statusCode: 200, message: MSG_DESC[3] }, null, 2));
        }else return res.status(504).send(JSON.stringify({ statusCode: 504, message: MSG_DESC[34] }, null, 2));
    })(req, res, next)
})

module.exports = router;