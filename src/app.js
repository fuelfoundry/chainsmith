const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const path = require('path');
const {init} = require('./db/db'); init();
const app = express();

const router = require('./routes/index');

nunjucks.configure(path.join(__dirname, 'views'), { autoescape: true, express : app });

app.use(session({ secret: '9e4n45968gy5o9__CHANGE_ME__9e4n45968gy5o9', resave: true, saveUninitialized: true }));
//app.use(bodyParser.urlencoded({extended : true}));
//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '32mb', extended: true }));
app.use(bodyParser.json({ limit: '32mb' }));

app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());
app.use('/', router);

app.set('views', path.join(__dirname, 'views'));

module.exports = app;
