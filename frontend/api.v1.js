var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var plasma = require('./plasma');

var jsonBodyParser = bodyParser.json();

router.get('/transactions', function (req, res) {
    res.json(plasma.getTransactions());
});

module.exports = router;