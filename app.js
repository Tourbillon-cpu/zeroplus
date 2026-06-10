"use strict";

const session = require("express-session");
const bodyParser = require("body-parser");
const srvstatic = require("serve-static");
const path = require("path");

String.prototype.toHTML = function () {
	return this.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

const app = require("./WebApp")();
require("./coSqlite3")({ file: "lib.db" });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
	name: "library",
	secret: "library",
	resave: false,
	saveUninitialized: false,
	cookie: { httpOnly: true, secure: false, maxAge: null }
}));

app.use("/", function (req, res) {
	res.writeHead(302, { "Location": "/__index.htm" });
	res.end();
});

app.use(srvstatic(path.join(__dirname, "/static")));

app.use(function (req, res, next) {
	res.setHeader("Cache-control", "no-cache");
	res.setHeader("Pragma", "no-cache");
	res.setHeader("Content-Type", "text/html;charset=utf-8");
	next();
});

require("./routes/index");
app.use(app.router);

app.use(function (err, req, res, next) {
	if (!next) return res();
	if (String === err.constructor) err = { no: 500, msg: err };
	if (null == err.no || null == err.msg || res.finished || res._sent)
		return next(err);
	res.send(err);
});

let port = 80;
let server = require("http").createServer(app.OnRequest);
server.on("error", onError);
server.on("listening", onListening);
server.listen(port);

function onError(error) {
	if (error.syscall !== "listen") throw error;
	switch (error.code) {
	case "EACCES":
		console.error("Port " + port + " requires elevated privileges");
		process.exit(1);
		break;
	case "EADDRINUSE":
		console.error("Port " + port + " is already in use");
		process.exit(1);
		break;
	default:
		throw error;
	}
}

function onListening() {
	let addr = server.address();
	let bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
	console.log("Listening on " + bind);
}

process.on("uncaughtException", function (err) {
	console.log(err);
});
