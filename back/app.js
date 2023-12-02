var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
const R = require('./utils/resp');
var app = express();
const {loginCache,ordinaryCache} = require("./utils/cache.utils");

const exPath = ['/login', '/logout','/book/get_book',"/book/get","/ordinary/login","/ordinary/comment","/ordinary/like","/ordinary/favorite"]
const validateLogin = (req, res, next) => {
    const oToken = req.cookies["o-token"]
    if (oToken && ordinaryCache.get(oToken)) {
        let _=ordinaryCache.get(oToken)
        ordinaryCache.set(oToken, _, 60*60)
    }
    if (exPath.includes(req.url.split("?")[0])) {
        next()
        return
    }
    const token = req.cookies.token
    if (token && loginCache.get(token)) {
        let _=loginCache.get(token)
        loginCache.set(token, _, 60*60)
        next()
    } else {

        res.status(401)
        res.json(R.notLogin())
    }
}
const sqlInjectionMiddleware = (req, res, next) => {
    const { query } = req;
    const sqlRegex = /select|insert|update|delete|where|drop|table|or|union|order by|\*|'/i;
    if (sqlRegex.test(JSON.stringify(query))) {
        return res.status(400).json(R.error("NOT not follow the rules"));
    }
    next();
};
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads',express.static(path.join(__dirname, 'uploads')));
app.use('/api', validateLogin)
app.use('/api', loginRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Custom 404 error handlers
app.use((req, res, next) => {
    res.status(404).json(R.notFound());
});
module.exports = app;
