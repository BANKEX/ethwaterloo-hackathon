var express = require('express');
var apiV1 = require('./api.v1');
var ejsLocals = require('ejs-locals');
var pages = require('./controllers/pages');

var app = express();

app.engine('ejs', ejsLocals)
app.set('views', './views')
app.set('view engine', 'ejs')

app.use(express.static(__dirname + '/public'));

app.use('/api/v1', apiV1);

app.get('/', function (req, res) {
	res.redirect('/home');
});

app.get('/home', pages.home);

app.listen(3000, function () {
	console.log('Master node listening on port 3000...');
});