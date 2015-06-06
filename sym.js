var Var = function(name) {
	this.name = name;
}
Var.prototype = {
	toString: function() { return this.name }
}
Var.ONE = new Var("1");

var Param = function(name,value) {
	this.name = name;
	this.value = value;
	this.fun = function() { return this.value; }
}
Param.prototype = new Var();
Param.prototype.constructor = Param;

global.Var = Var;
global.Param = Param;
