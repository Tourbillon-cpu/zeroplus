"use strict";

const app = require("../WebApp");
const lib = require("./library");

app.route("/init", "post", lib.Init);
app.route("/book/add", "post", lib.AddBook);
app.route("/book/inc", "post", lib.IncreaseBook);
app.route("/book/reduce", "post", lib.ReduceBook);
app.route("/book/update", "post", lib.UpdateBook);
app.route("/book/query", "post", lib.QueryBook);
app.route("/reader/add", "post", lib.AddReader);
app.route("/reader/delete", "post", lib.DeleteReader);
app.route("/reader/update", "post", lib.UpdateReader);
app.route("/reader/query", "post", lib.QueryReader);
app.route("/reader/borrow", "post", lib.ReaderBorrowing);
app.route("/borrow", "post", lib.BorrowBook);
app.route("/return", "post", lib.ReturnBook);
app.route("/overdue", "post", lib.OverdueReaders);
