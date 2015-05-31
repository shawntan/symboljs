PARAM_BYTES=4;

function construct(constructor, args) {
	function F() { return constructor.apply(this, args); }
	F.prototype = constructor.prototype;
	return new F();
}

var Symbol = function() {};
Symbol.Array = function() {
	this.shape = Array.prototype.slice.call(arguments);
	this.size = this.shape.reduce(function(p,c) { return p * c; },1);
	this.buffer = new ArrayBuffer(this.size * PARAM_BYTES);
	this.flattened = new Float32Array(this.buffer);
	var offset = 0;
	function initNestedArray(dimensions,buffer) {
		if (dimensions.length > 1) {
			var result = new Array(dimensions[0]);
			for (var i=0;i < dimensions[0];i++ ){
				result[i] = initNestedArray(dimensions.slice(1),buffer);
			}
		} else {
			var result = new Float32Array(
					buffer,
					offset * PARAM_BYTES,
					dimensions[0]
				);
			offset += dimensions[0];
		}
		return result;
	}
	this.data = initNestedArray(this.shape,this.buffer);
}



function Sym(name) {
	this.name = name;
}

function SymInput(name) {
	this.name = name;
	this.evaluate = function(inputs) {
		return inputs[this.name];
	}
}
SymInput.prototype = new Sym();
SymInput.prototype.constructor = SymInput;

function SymParam(name,value) {
	this.name = name;
	this.value = value;
	this.evaluate = function() {
		return this.value;
	}
}
SymParam.prototype = new Sym();
SymParam.prototype.constructor = SymParam;

Symbol.Functions = function() {};
Symbol.Functions.Builder = function(name,fun) {
	var functionName = name;
	var fun = fun;
	function SymExpr() {
		this.inputs = Array.prototype.slice.call(arguments);;
		this.name = name + "(" +
			this.inputs.map(
				function(arg) { return arg.name; }
			).join(",") + ")";

		this.evaluate = function(inputs) {
			var values = this.inputs.map(function(i) { 
				return i.evaluate(inputs);
			});
			return fun.apply(null,values);
		}
	}
	SymExpr.prototype = new Sym();
	return function() {
		var args = arguments;
		return construct(SymExpr,args);
	}
}

Symbol.Functions.ElementWiseOpBuilder = function(fun) {
	var argCount = fun.length;
	var buffer = new Array(argCount);
	return function() {
		var result = construct(Symbol.Array,arguments[0].shape);
		for ( var i=0; i < result.flattened.length; i++ ) {
			for ( var j=0; j < arguments.length; j++ ) {
				buffer[j] = arguments[j].flattened[i];
			}
			result.flattened[i] = fun.apply(null,buffer);
		}
		return result;
	}
}
Symbol.Functions.rowdot = function(row,matrix) {
	var inputSize  = row.shape[0];
	var outputSize = matrix.shape[1];
	var result = new Symbol.Array(outputSize);
	for (var j=0; j < outputSize; j++) {
		var sum = 0;
		for (var i=0; i < inputSize; i++) {
			sum += row.data[i] * matrix.data[i][j];
		}
		result.data[j] = sum;
	}
	return result;
}

Symbol.Functions.pairwise = [
	{
		name: "add",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x,y) {return x + y}),
		grad: function(X,Y,output,error) {
			return [ error, error ];
		}
	},
	{
		name: "sub",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x,y) {return x - y}),
	},
	{
		name: "mul",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x,y) {return x * y}),
		grad: function(X,Y,output,error) {
			return [ Y.mul(error), X.mul(error) ];
		}
	},
	{
		name: "div",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x,y) {return x / y})
	},
	{
		name: "dot",
		op: Symbol.Functions.rowdot
	}
];

Symbol.Functions.single = [
	{
		name: "sigmoid",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x) {return 1 / ( 1 + Math.exp(-x))}) },
	{
		name: "exp", 
		op: Symbol.Functions.ElementWiseOpBuilder(function(x) {return Math.exp(x)}) },
	{
		name: "tanh",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x) {
			var x_ = Math.exp(2*x);
			return (x_ - 1)/(x_ + 1);
		})
	}
]

Symbol.Functions.pairwise.forEach(function(desc) {
	var symfun = Symbol.Functions.Builder(desc.name,desc.op,false)
	Symbol[desc.name] = symfun;
	Sym.prototype[desc.name] = function(y) { return symfun(this,y) };
});

Symbol.Functions.single.forEach(function(desc) {
	var symfun = Symbol.Functions.Builder(desc.name,desc.op,false)
	Symbol[desc.name] = symfun;
});




var weights = new Symbol.Array(2,2);
weights.data[0][0] = weights.data[1][1] = 0;
weights.data[1][0] = weights.data[0][1] = 1;

var x = new SymInput("x");
var W = new SymParam("W",weights);

input = new Symbol.Array(2);
input.data[0] = 1;
input.data[1] = 2;
var expr = Symbol.sigmoid(x.dot(W).sub(x));
console.log(expr);
console.log(W.evaluate());
console.log(expr.evaluate({ "x": input }))
//console.log({ W.add(W): 1})
