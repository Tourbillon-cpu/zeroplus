"use strict";

const db = require("../coSqlite3");
const U = require("./util");

function * activeCount(bID) {
	let rows = yield db.execSQL("select count(*) as cnt from borrow where bID=? and returnDate is null", [bID]);
	return rows[0].cnt;
}

function * bookRow(bID) {
	let rows = yield db.execSQL("select * from books where bID=?", [bID]);
	return rows[0] || null;
}

function * readerRow(rID) {
	let rows = yield db.execSQL("select * from readers where rID=?", [rID]);
	return rows[0] || null;
}

function validBookInput(body, withCount, requireName) {
	if (!U.requireLen(body.bID, 30)) return false;
	if (requireName && !U.requireLen(body.bName, 30)) return false;
	if (!U.optionalLen(body.bName, 30)) return false;
	if (!U.optionalLen(body.bPub, 30)) return false;
	if (!U.validDate(body.bDate, true)) return false;
	if (!U.optionalLen(body.bAuthor, 20)) return false;
	if (!U.optionalLen(body.bMem, 30)) return false;
	if (withCount && !U.isPositiveInt(body.bCnt)) return false;
	return true;
}

function validReaderInput(body, requireAll) {
	if (!U.requireLen(body.rID, 8)) return false;
	if (requireAll && !U.requireLen(body.rName, 10)) return false;
	if (requireAll && (U.text(body.rSex) !== "男" && U.text(body.rSex) !== "女")) return false;
	if (!U.optionalLen(body.rName, 10)) return false;
	if (U.text(body.rSex) && U.text(body.rSex) !== "男" && U.text(body.rSex) !== "女") return false;
	if (!U.optionalLen(body.rDept, 10)) return false;
	if (U.text(body.rGrade) && !U.isPositiveInt(body.rGrade)) return false;
	if (requireAll && !U.isPositiveInt(body.rGrade)) return false;
	return true;
}

exports.Init = function * () {
	let sqls = [
		"drop table if exists borrow",
		"drop table if exists readers",
		"drop table if exists books",
		"create table books(bID varchar(30) primary key,bName varchar(30) not null,bPub varchar(30),bDate varchar(10),bAuthor varchar(20),bMem varchar(30),bCnt integer not null check(bCnt>0))",
		"create table readers(rID varchar(8) primary key,rName varchar(10) not null,rSex varchar(2) not null check(rSex in ('男','女')),rDept varchar(10),rGrade integer check(rGrade>0))",
		"create table borrow(id integer primary key autoincrement,rID varchar(8) not null,bID varchar(30) not null,borrowDate varchar(10) not null,returnDate varchar(10),foreign key(rID) references readers(rID),foreign key(bID) references books(bID))"
	];
	yield db.execSQL(sqls, true);
	return U.code(0, "成功");
};

exports.AddBook = function * (req) {
	let b = req.body;
	if (!validBookInput(b, true, true)) return U.code(2, "提交的参数有误");
	if (yield bookRow(U.text(b.bID))) return U.code(1, "该书已经存在");
	yield db.execSQL("insert into books(bID,bName,bPub,bDate,bAuthor,bMem,bCnt) values(?,?,?,?,?,?,?)", [
		U.text(b.bID), U.text(b.bName), U.text(b.bPub), b.bDate ? U.normalizeDate(b.bDate) : "", U.text(b.bAuthor), U.text(b.bMem), U.toPositiveInt(b.bCnt)
	]);
	return U.code(0, "成功");
};

exports.IncreaseBook = function * (req) {
	let b = req.body;
	if (!U.requireLen(b.bID, 30) || !U.isPositiveInt(b.bCnt)) return U.code(2, "提交的参数有误");
	let row = yield bookRow(U.text(b.bID));
	if (!row) return U.code(1, "该书不存在");
	yield db.execSQL("update books set bCnt=bCnt+? where bID=?", [U.toPositiveInt(b.bCnt), U.text(b.bID)]);
	return U.code(0, "成功");
};

exports.ReduceBook = function * (req) {
	let b = req.body, id = U.text(b.bID), cnt = U.toPositiveInt(b.bCnt);
	if (!U.requireLen(id, 30) || !U.isPositiveInt(b.bCnt)) return U.code(3, "提交的参数有误");
	let row = yield bookRow(id);
	if (!row) return U.code(1, "该书不存在");
	let borrowed = yield activeCount(id);
	let available = row.bCnt - borrowed;
	if (cnt > available) return U.code(2, "减少的数量大于该书目前在库数量");
	if (cnt >= row.bCnt) {
		yield db.execSQL("delete from borrow where bID=? and returnDate is not null", [id]);
		yield db.execSQL("delete from books where bID=?", [id]);
	}
	else
		yield db.execSQL("update books set bCnt=bCnt-? where bID=?", [cnt, id]);
	return U.code(0, "成功");
};

exports.UpdateBook = function * (req) {
	let b = req.body, id = U.text(b.bID);
	if (!validBookInput(b, false, true)) return U.code(2, "提交的参数有误");
	if (!(yield bookRow(id))) return U.code(1, "该书不存在");
	yield db.execSQL("update books set bName=?,bPub=?,bDate=?,bAuthor=?,bMem=? where bID=?", [
		U.text(b.bName), U.text(b.bPub), b.bDate ? U.normalizeDate(b.bDate) : "", U.text(b.bAuthor), U.text(b.bMem), id
	]);
	return U.code(0, "成功");
};

exports.QueryBook = function * (req) {
	let b = req.body, where = [], args = [];
	U.likeWhere(b, "bID", "bID", where, args);
	U.likeWhere(b, "bName", "bName", where, args);
	U.likeWhere(b, "bPub", "bPub", where, args);
	U.likeWhere(b, "bAuthor", "bAuthor", where, args);
	U.likeWhere(b, "bMem", "bMem", where, args);
	if (U.text(b.bDate0) && U.validDate(b.bDate0, false)) { where.push("bDate>=?"); args.push(U.normalizeDate(b.bDate0)); }
	if (U.text(b.bDate1) && U.validDate(b.bDate1, false)) { where.push("bDate<=?"); args.push(U.normalizeDate(b.bDate1)); }
	let sql = "select bID,bName,bCnt,(bCnt-(select count(*) from borrow br where br.bID=books.bID and br.returnDate is null)) as inCnt,bPub,bDate,bAuthor,bMem from books";
	if (where.length) sql += " where " + where.join(" and ");
	sql += " order by bID";
	let rows = yield db.execSQL(sql, args);
	return U.table(rows, ["bID", "bName", "bCnt", "inCnt", "bPub", "bDate", "bAuthor", "bMem"]);
};

exports.AddReader = function * (req) {
	let r = req.body;
	if (!validReaderInput(r, true)) return U.code(2, "提交的参数有误");
	if (yield readerRow(U.text(r.rID))) return U.code(1, "该证号已经存在");
	yield db.execSQL("insert into readers(rID,rName,rSex,rDept,rGrade) values(?,?,?,?,?)", [
		U.text(r.rID), U.text(r.rName), U.text(r.rSex), U.text(r.rDept), U.toPositiveInt(r.rGrade)
	]);
	return U.code(0, "成功");
};

exports.DeleteReader = function * (req) {
	let id = U.text(req.body.rID);
	if (!id || !(yield readerRow(id))) return U.code(1, "该证号不存在");
	let rows = yield db.execSQL("select count(*) as cnt from borrow where rID=? and returnDate is null", [id]);
	if (rows[0].cnt > 0) return U.code(2, "该读者尚有书籍未归还");
	yield db.execSQL("delete from borrow where rID=? and returnDate is not null", [id]);
	yield db.execSQL("delete from readers where rID=?", [id]);
	return U.code(0, "成功");
};

exports.UpdateReader = function * (req) {
	let r = req.body, id = U.text(r.rID), sets = [], args = [];
	if (!U.requireLen(id, 8)) return U.code(2, "提交的参数有误");
	if (!(yield readerRow(id))) return U.code(1, "该证号不存在");
	if (!validReaderInput(r, false)) return U.code(2, "提交的参数有误");
	if (U.text(r.rName)) { sets.push("rName=?"); args.push(U.text(r.rName)); }
	if (U.text(r.rSex)) { sets.push("rSex=?"); args.push(U.text(r.rSex)); }
	if (U.text(r.rDept)) { sets.push("rDept=?"); args.push(U.text(r.rDept)); }
	if (U.text(r.rGrade)) { sets.push("rGrade=?"); args.push(U.toPositiveInt(r.rGrade)); }
	if (sets.length) {
		args.push(id);
		yield db.execSQL("update readers set " + sets.join(",") + " where rID=?", args);
	}
	return U.code(0, "成功");
};

exports.QueryReader = function * (req) {
	let r = req.body, where = [], args = [];
	U.likeWhere(r, "rID", "rID", where, args);
	U.likeWhere(r, "rName", "rName", where, args);
	if (U.text(r.rSex)) { where.push("rSex=?"); args.push(U.text(r.rSex)); }
	U.likeWhere(r, "rDept", "rDept", where, args);
	if (U.text(r.rGrade0) && U.isPositiveInt(r.rGrade0)) { where.push("rGrade>=?"); args.push(U.toPositiveInt(r.rGrade0)); }
	if (U.text(r.rGrade1) && U.isPositiveInt(r.rGrade1)) { where.push("rGrade<=?"); args.push(U.toPositiveInt(r.rGrade1)); }
	let sql = "select rID,rName,rSex,rDept,rGrade from readers";
	if (where.length) sql += " where " + where.join(" and ");
	sql += " order by rID";
	let rows = yield db.execSQL(sql, args);
	return U.table(rows, ["rID", "rName", "rSex", "rDept", "rGrade"]);
};

exports.ReaderBorrowing = function * (req) {
	let id = U.text(req.body.rID);
	if (!id || !(yield readerRow(id))) return U.code(1, "该证号不存在");
	let rows = yield db.execSQL("select books.bID,bName,borrowDate from borrow,books where borrow.bID=books.bID and rID=? and returnDate is null order by borrowDate,books.bID", [id]);
	for (let row of rows) {
		row.dueDate = U.addDays(row.borrowDate, 60);
		row.overdue = U.overdueDays(row.borrowDate) > 0 ? "是" : "否";
	}
	return U.table(rows, ["bID", "bName", "borrowDate", "dueDate", "overdue"]);
};

exports.BorrowBook = function * (req) {
	let rID = U.text(req.body.rID), bID = U.text(req.body.bID);
	if (!rID || !(yield readerRow(rID))) return U.code(1, "该证号不存在");
	let book = yield bookRow(bID);
	if (!bID || !book) return U.code(2, "该书号不存在");
	let overdue = yield db.execSQL("select count(*) as cnt from borrow where rID=? and returnDate is null and date(borrowDate,'+60 day') < date('now','localtime')", [rID]);
	if (overdue[0].cnt > 0) return U.code(3, "该读者有超期书未还");
	let same = yield db.execSQL("select count(*) as cnt from borrow where rID=? and bID=? and returnDate is null", [rID, bID]);
	if (same[0].cnt > 0) return U.code(4, "该读者已经借阅该书，且未归还");
	let borrowed = yield activeCount(bID);
	if (book.bCnt - borrowed <= 0) return U.code(5, "该书已经全部借出");
	yield db.execSQL("insert into borrow(rID,bID,borrowDate,returnDate) values(?,?,?,null)", [rID, bID, U.fmtDate(U.today())]);
	return U.code(0, "成功");
};

exports.ReturnBook = function * (req) {
	let rID = U.text(req.body.rID), bID = U.text(req.body.bID);
	if (!rID || !(yield readerRow(rID))) return U.code(1, "该证号不存在");
	if (!bID || !(yield bookRow(bID))) return U.code(2, "该书号不存在");
	let rows = yield db.execSQL("select id,borrowDate from borrow where rID=? and bID=? and returnDate is null order by id limit 1", [rID, bID]);
	if (rows.length < 1) return U.code(3, "该读者并未借阅该书");
	let days = U.overdueDays(rows[0].borrowDate);
	yield db.execSQL("update borrow set returnDate=? where id=?", [U.fmtDate(U.today()), rows[0].id]);
	return U.code(0, days > 0 ? "成功，超期" + days + "天" : "成功");
};

exports.OverdueReaders = function * () {
	let rows = yield db.execSQL("select distinct readers.rID,rName,rSex,rDept,rGrade from readers,borrow where readers.rID=borrow.rID and returnDate is null and date(borrowDate,'+60 day') < date('now','localtime') order by readers.rID");
	return U.table(rows, ["rID", "rName", "rSex", "rDept", "rGrade"]);
};
