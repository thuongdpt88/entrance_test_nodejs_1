var express = require('express');
var bodyParser = require('body-parser');
var validator = require("email-validator");
var bcrypt = require('bcrypt');
const saltRounds = 10;
var moment = require('moment');

var db = require('./db/db.js');

var owasp = require('owasp-password-strength-test');
owasp.config({
    minLength              : 8,
    maxLength              : 20,
    allowPassphrases       : true,
    minPhraseLength        : 2,
    minOptionalTestsToPass : 1,
  });

var jwt = require('jsonwebtoken');
var { expressjwt } = require("express-jwt");
const secretKey = 'my-secret-key';
const algorithm = 'HS256';


var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Middleware check jwt all routes
app.use(
    // Auto check Authorization on Header
    expressjwt ({
        secret: secretKey,
        algorithms: [algorithm],
    }).unless({ path: ['/sign-up', '/sign-in'] }),
    function (err, req, res, next) {
        // Error Handle
        if (err.name === "UnauthorizedError") {
            res.status(401).send("Invalid token...");
        } else if (!req.auth.email) {
            res.status(401).send("Unauthorized...");
        } else {
            next(err);
        }
    }
);

app.post('/sign-up', async (req, res) => {
    var firstName = req.body.firstName
    var lastName = req.body.lastName
    var email = req.body.email
    var password = req.body.password

    // Validate email
    if (!email || !validator.validate(email)) {
        res.sendStatus(400);
    }

    // Validate password
    var result = owasp.test(password)
    if (result.errors !== undefined && result.errors.length > 0) {
        res.sendStatus(400);
    }

    // Check existed email
    var user = await db('Users').where({'email' : email});
    if (user.length > 0) {
        res.status(400).send('Existed Email!');
    }

    // Insert data
    const trx = await db.transaction();

    try {
        var data = await trx("Users").insert([
            {
                firstName: firstName,
                lastName: lastName,
                email: email,
                hash: bcrypt.hashSync(password, saltRounds),
                createdAt: moment().format('YYYY-MM-DD hh:mm:ss'),
                updatedAt: moment().format('YYYY-MM-DD hh:mm:ss')
            }
        ]);

        await trx.commit();

        var new_data = [];
        new_data.push({
            id: data[0],
            firstName: firstName,
            lastName: lastName,
            email: email,
            displayName: firstName +' '+lastName
         });
        res.status(201).json(new_data)

    } catch (err) {
        await trx.rollback();
        res.status(500).send(err);
    }
})

app.post('/sign-in', async (req, res) => {
    var email = req.body.email
    var password = req.body.password

    // Validate email
    if (!email || !validator.validate(email)) {
        res.sendStatus(400);
    }

    // Validate password
    if (!password) {
        res.sendStatus(400);
    } else {
        var result = owasp.test(password)
        if (result.errors !== undefined && result.errors.length > 0) {
            res.status(400).json(result.errors);
        }
    }

    // Transaction
    const trx = await db.transaction();

    try {
        // Get and Check user
        var users = await db('Users').where({'email' : email});

        // No data
        if (users === undefined || users.length == 0) {
            res.status(500).send('No data!');
        }

        // Has data
        users.forEach(async e => {
            if (bcrypt.compareSync(password, e.hash)) {
                var user = [];
                user.push({
                    firstName: e.firstName,
                    lastName: e.lastName,
                    email: e.email,
                    displayName: e.firstName +' '+ e.lastName
                });

                // Generate Token
                const {token, refreshToken} = generateToken(email, password)

                // Save refreshToken
                await trx("Tokens").insert([
                    {
                        userId: e.id,
                        refreshToken: refreshToken,
                        expiresIn: '30d',
                        createdAt: moment().format('YYYY-MM-DD hh:mm:ss'),
                        updatedAt: moment().format('YYYY-MM-DD hh:mm:ss')
                    }
                ]);
                await trx.commit();

                // Add Response
                var response = []
                response.push({
                    'user' : user,
                    'token' : token,
                    'refreshToken' : refreshToken,
                });

                // Send response
                res.status(200).json(response)
            }
        });

    } catch (err) {
        await trx.rollback();
        res.status(500).send(err);
    }
})

app.post('/sign-out', async (req, res) => {
    const trx = await db.transaction();
    try {
        if (req.auth.email !== undefined) {
            // Remove all tokens
            var user = await db('Users').where({'email' : req.auth.email}).first();
            if (user) {
                await trx('Tokens').where('userId', user.id).del();
                await trx.commit();
                res.sendStatus(204);
            }
        }

        res.status(204).send("Nothing to do");

    } catch (err) {
        await trx.rollback();
        res.status(500).send(err);
    }
})

app.post('/refresh-token', async (req, res) => {

    // Validate
    if (!req.body.refreshToken) {
        res.sendStatus(404)
    }

    var tokenInfo = await db('Tokens').where({'refreshToken' : req.body.refreshToken}).first();
    const trx = await db.transaction();
    try {
        if (tokenInfo) {

            // Generate Token
            const {token, refreshToken} = generateToken(req.auth.email, req.auth.password)

            // Update DB
            await trx("Tokens").update(
                {
                    refreshToken: refreshToken,
                    updatedAt: moment().format('YYYY-MM-DD hh:mm:ss')
                }
            ).where('id', tokenInfo.id);
            await trx.commit();

            // Add Response
            var response = []
            response.push({
                'token' : token,
                'refreshToken' : refreshToken,
            });

            // Send response
            res.status(200).json(response)

        } else {
            res.sendStatus(404)
        }

    } catch (err) {
        await trx.rollback();
        res.status(500).send(err);
    }
})

app.get('/users', async (req, res) => {
    try {
        var users = await db('Users');
    } catch (err) {
        console.log('Error: ', err)
    }

    res.status(200).json(users)

})

app.get('/user/:id', async (req, res) => {
    try {
        var user = await db('Users').where('id', req.params.id);
    } catch (err) {
        console.log('Error: ', err)
    }

    res.status(200).json(user)
})

app.listen(3000, () => console.log('Server is running'));

// Util function
function generateToken(email, password) {
    const payload = {
        email: email,
        password: password
    };
    const token = jwt.sign(payload, secretKey, {
        expiresIn: '1h',
        algorithm: algorithm
    });
    const refreshToken = jwt.sign(payload, secretKey, {
        expiresIn: '30d',
        algorithm: algorithm
    });

    return {
        token: token,
        refreshToken: refreshToken,
    }
}