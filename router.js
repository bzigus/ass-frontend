const { name, version } = require('./package.json');
const express = require('express');
const router = express.Router();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer();
const fs = require("fs");

function json(path) {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function freshUsers() {
    return json(process.cwd() + "/auth.json");
}

function freshData() {
    return json(process.cwd() + "/data.json");
}

function getRenderPath(path) {
    return [process.cwd(), name, 'views', path].join("/");
}

function isLoginPath(req) {
    return req.path.startsWith("/login");
}

function isValidToken(token) {
    const users = freshUsers();
    if(token === undefined) return false;
    const tokens = Object.keys(users.users);
    return tokens.includes(token);
}

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(cookieParser());
router.use(upload.array());

router.use((req, res, next) => {
    const token = req.cookies.assToken;
    if((token === undefined || !isValidToken(token)) && !isLoginPath(req)) {
        res.redirect("/dashboard/login");
        return;
    } else if(isLoginPath(req) && isValidToken(token)) {
        res.clearCookie('assToken');
    }
    next();
});

router.get('/', (req, res) => {
    const data = freshData();
    const users = freshUsers();
    const token = req.cookies.assToken;
    if(token !== undefined) {
        const user = users.users[token];
        const images = {};
        Object.keys(data)
            .filter(id => data[id].mimetype.startsWith("image/"))
            .forEach(id => {
                images[id] = data[id];
        });
        res.render(getRenderPath("browse/browse.ejs"), {
            user: user,
            images: images,
            users: users.users
        });
    }
});

router.post("/login", (req, res) => {
    const token = req.body.token;
    if(token !== undefined) {
        res.cookie('assToken', token, {
            maxAge: 60000*60, // One hour
            httpOnly: true
        });
        res.redirect("/dashboard");
    }
    res.end();
});

router.get('/login', (req, res) => {
    const path = getRenderPath("login/login.ejs");
    res.render(path, {
        msg: "Ahoj",
        publicPath: getRenderPath("login/")
    });
});

module.exports = {
    router,
    enabled: true,
    brand: `${name} v${version}`,
    endpoint: '/dashboard'
};
