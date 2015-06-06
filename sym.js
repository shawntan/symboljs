function Sym(name) {
	this.name = name;
}
Sym.prototype = {
	toString: function() { return this.name }
}
Sym.ONE = new Sym("1");


function SymParam(name,value) {
	this.name = name;
	this.value = value;
	this.fun = function() { return this.value; }
}
SymParam.prototype = new Sym();
SymParam.prototype.constructor = SymParam;


