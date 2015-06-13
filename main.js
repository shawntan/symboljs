var x = new Symbol.Var("x");
var W = new Symbol.Param("W",Symbol.Matrix([[2,0],[0,1]]));

var expr = x.dot(W);
var fun = Symbol.createFunction([expr]);
console.log(fun({'x': Symbol.Vector([2,1])}));

