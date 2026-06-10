"use strict";

const DAY_MS = 24 * 60 * 60 * 1000;

function html(body) {
	return '<html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head><body>' + body + '</body></html>';
}

function code(no, msg) {
	return html("<div id='result' style='display:none'>" + no + "</div>" + (msg || ""));
}

function table(rows, cols) {
	let s = "<table border=1 id='result'>";
	for (let row of rows) {
		s += "<tr>";
		for (let col of cols)
			s += "<td>" + escapeHtml(row[col] == null ? "" : String(row[col])) + "</td>";
		s += "</tr>";
	}
	return html(s + "</table>");
}

function escapeHtml(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function text(v) {
	return (v == null ? "" : String(v)).trim();
}

function isPositiveInt(v) {
	return /^[1-9][0-9]*$/.test(text(v));
}

function toPositiveInt(v) {
	return parseInt(text(v), 10);
}

function validDate(v, allowEmpty) {
	v = text(v);
	if (!v) return !!allowEmpty;
	if (!/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/.test(v)) return false;
	let d = parseDate(v);
	return d && fmtDate(d) === normalizeDate(v);
}

function normalizeDate(v) {
	let p = text(v).split("-");
	return pad4(p[0]) + "-" + pad2(p[1]) + "-" + pad2(p[2]);
}

function parseDate(v) {
	if (!v) return null;
	let p = text(v).split("-").map(function (x) { return parseInt(x, 10); });
	let d = new Date(p[0], p[1] - 1, p[2]);
	if (d.getFullYear() !== p[0] || d.getMonth() !== p[1] - 1 || d.getDate() !== p[2])
		return null;
	return d;
}

function fmtDate(d) {
	return pad4(d.getFullYear()) + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function today() {
	let d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(dateText, days) {
	let d = parseDate(dateText);
	d.setDate(d.getDate() + days);
	return fmtDate(d);
}

function overdueDays(dateText) {
	let due = parseDate(addDays(dateText, 60));
	let days = Math.floor((today().getTime() - due.getTime()) / DAY_MS);
	return days > 0 ? days : 0;
}

function requireLen(v, max) {
	return text(v).length > 0 && text(v).length <= max;
}

function optionalLen(v, max) {
	return text(v).length <= max;
}

function likeWhere(body, key, field, where, args) {
	let v = text(body[key]);
	if (!v) return;
	where.push(field + " like ?");
	args.push("%" + v + "%");
}

function pad2(v) {
	v = String(v);
	return v.length < 2 ? "0" + v : v;
}

function pad4(v) {
	v = String(v);
	while (v.length < 4) v = "0" + v;
	return v;
}

exports.DAY_MS = DAY_MS;
exports.html = html;
exports.code = code;
exports.table = table;
exports.escapeHtml = escapeHtml;
exports.text = text;
exports.isPositiveInt = isPositiveInt;
exports.toPositiveInt = toPositiveInt;
exports.validDate = validDate;
exports.normalizeDate = normalizeDate;
exports.fmtDate = fmtDate;
exports.today = today;
exports.addDays = addDays;
exports.overdueDays = overdueDays;
exports.requireLen = requireLen;
exports.optionalLen = optionalLen;
exports.likeWhere = likeWhere;
