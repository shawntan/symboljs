var x = new Sym("x");
var y = new Sym("y");
var w = new SymParam("w",Symbol.Vector([2]));
var z = new SymParam("z",Symbol.Vector([5]));

var wy = w.mul(y);
var wx = w.mul(x);
var zy = z.mul(y);
var zx = z.mul(x);
var expr1 = wy.add(wx);
var expr2 = zy.add(zx);
//console.log(Symbol.gradient(expr,[w]));
var fun = Symbol.createFunction([expr1,expr2]);
console.log(fun({
	'x': Symbol.Vector([2]),
	'y': Symbol.Vector([3])
}));

console.log(fun({
	'x': Symbol.Vector([5]),
	'y': Symbol.Vector([3])
}));

