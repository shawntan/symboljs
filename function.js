(function(global) {

	var construct = function(constructor, args) {
		function F() { return constructor.apply(this, args); }
		F.prototype = constructor.prototype;
		return new F();
	}

	var rowdot = function(row,matrix) {
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

	var symbolicFunctionBuilder = function(name,fun,grad) {
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

	var elementWiseOpBuilder = function(fun) {
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

	var pairwise = [
		{
			name: "add",
			op: elementWiseOpBuilder(function(x,y) {return x + y}),
			grad: function(error) {
				return [error,error];
			}
		},
		{
			name: "sub",
			op: elementWiseOpBuilder(function(x,y) {return x - y})
		},
		{
			name: "mul",
			op: elementWiseOpBuilder(function(x,y) {return x * y}),
			grad: function(error) {
				var X = this.inputs[0];
				var Y = this.inputs[1];
				return [ Y.mul(error), X.mul(error) ];
			}
		},
		{
			name: "div",
			op: elementWiseOpBuilder(function(x,y) {return x / y})
		},
		{
			name: "dot",
			op: rowdot
		}
	];

	var single = [
		{
			name: "sigmoid",
			op: elementWiseOpBuilder(function(x) {return 1 / ( 1 + Math.exp(-x))}) },
		{
			name: "exp", 
			op: elementWiseOpBuilder(function(x) {return Math.exp(x)}) },
		{
			name: "tanh",
			op: elementWiseOpBuilder(function(x) {
				var x_ = Math.exp(2*x);
				return (x_ - 1)/(x_ + 1);
			})
		}
	]

	pairwise.forEach(function(desc) {
		var symfun = symbolicFunctionBuilder(desc.name,desc.op,desc.grad)
		global[desc.name] = symfun;
		Sym.prototype[desc.name] = function(y) { return symfun(this,y) };
	});

	single.forEach(function(desc) {
		var symfun = symbolicFunctionBuilder(desc.name,desc.op,desc.grad)
		global[desc.name] = symfun;
	});
})(Symbol);


