var PARAM_BYTES = 4;
global.Array = function() {
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

global.Vector = function(arr) {
	var result = new Symbol.Array(arr.length);
	for (var i=0;i<arr.length;i++) {
		result.data[i] = arr[i];
	}
	return result;
}
