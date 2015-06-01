var PARAM_BYTES = 4;

function construct(constructor, args) {
	function F() { return constructor.apply(this, args); }
	F.prototype = constructor.prototype;
	return new F();
}

function Sym(name) {
	this.name = name;
}
Sym.prototype = {
	toString: function() { return this.name }
}

var ONE = new Sym("1");

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

Symbol.Vector = function(arr) {
	var result = new Symbol.Array(arr.length);
	for (var i=0;i<arr.length;i++) {
		result.data[i] = arr[i];
	}
	return result;
}

function topologicalSort(expr) {
	var nodeIndex = {},
		nodeOrder = [],
		nodeDeps  = [];
	function traverse(node) {
		var deps = [];
		if (node.inputs) {
			for (var i=0;i < node.inputs.length; i++) {
				if (!(node.inputs[i].name in nodeIndex)) {
					//console.log(node.name,"->",node.inputs[i].name);
					traverse(node.inputs[i]);
				}
				deps.push(nodeIndex[node.inputs[i].name]);
			}
		}
		nodeIndex[node.name] = nodeOrder.length;
		nodeOrder.push(node);
		nodeDeps.push(deps);
	}
	traverse(expr);
	return {
		index: nodeIndex,
		order: nodeOrder,
		dependencies: nodeDeps
	}
}

Symbol.gradient = function(expr,wrts) {
	var nodes = topologicalSort(expr);
	var nodeIndex = nodes.index,
		nodeOrder = nodes.order,
		nodeDeps  = nodes.dependencies;

	var deltas = new Array(nodeOrder.length);
	deltas[deltas.length-1] = ONE;
	for (var i=deltas.length-1;i >= 0;i--) {
		if (nodeOrder[i].grad) {
			var depDeltas = nodeOrder[i].grad(deltas[i]);
			var depIdxs = nodeDeps[i];
			for (var j = 0;j < depDeltas.length; j++) {
				var idx   = depIdxs[j],
					delta = depDeltas[j];
				deltas[idx] = deltas[idx] ? deltas[idx].add(delta) : delta;
			}
		}
	}
	return wrts.map(function(p) {
		return deltas[nodeIndex[p]];
	});
}

Symbol.createFunction = function(expr) {
	var nodes = topologicalSort(expr);
	var nodeIndex = nodes.index,
		nodeOrder = nodes.order,
		nodeDeps  = nodes.dependencies;
	var memoize = new Array(nodeOrder.length);
	var lambdaMemoized = function(j) { return memoize[j] };
	return function(inputs) {
		for (var i=0;i < memoize.length; i++) {
			var currNode = nodeOrder[i];
			if (currNode.fun) {
				var deps = nodeDeps[i];
				memoize[i] = currNode.fun.apply(null,deps.map(lambdaMemoized));
			} else {
				memoize[i] = inputs[currNode.name];
			}
		}
		return memoize[memoize.length-1];
	}
}



function SymParam(name,value) {
	this.name = name;
	this.value = value;
	this.fun = function() { return this.value; }
}
SymParam.prototype = new Sym();
SymParam.prototype.constructor = SymParam;

Symbol.Functions = function() {};
Symbol.Functions.Builder = function(name,fun,grad) {
	var functionName = name;
	var fun = fun;
	function SymExpr() {
		this.inputs = Array.prototype.slice.call(arguments);;
		this.name = name + "(" +
			this.inputs.map(
				function(arg) { return arg.name; }
			).join(",") + ")";
		this.fun = fun;
		if (grad) {
			this.grad = grad;
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
		grad: function(error) {
			return [error,error];
		}
	},
	{
		name: "sub",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x,y) {return x - y}),
	},
	{
		name: "mul",
		op: Symbol.Functions.ElementWiseOpBuilder(function(x,y) {return x * y}),
		grad: function(error) {
			var X = this.inputs[0];
			var Y = this.inputs[1];
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
	var symfun = Symbol.Functions.Builder(desc.name,desc.op,desc.grad)
	Symbol[desc.name] = symfun;
	Sym.prototype[desc.name] = function(y) { return symfun(this,y) };
});

Symbol.Functions.single.forEach(function(desc) {
	var symfun = Symbol.Functions.Builder(desc.name,desc.op,desc.grad)
	Symbol[desc.name] = symfun;
});



var x = new Sym("x");
var y = new Sym("y");
var w = new SymParam("w",Symbol.Vector([2]));


var wy = w.mul(y);
var wx = w.mul(x);
var expr = wy.add(wx);

console.log(Symbol.gradient(expr,[w]));
/*
var fun = Symbol.createFunction(); // xy + zxy
console.log(fun({
	'x': Symbol.Vector([2]),
	'y': Symbol.Vector([3]),
	'z': Symbol.Vector([4]), // 6 + 24
}))

console.log(fun({
	'x': Symbol.Vector([2]),
	'y': Symbol.Vector([3]),
	'z': Symbol.Vector([6]), // 6 + 36
}))
*/
