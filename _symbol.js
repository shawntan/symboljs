function topologicalSort(exprs) {
	var nodeIndex = {},
		nodeOrder = [],
		nodeDeps  = [];

	function traverse(node) {
		var deps = [];
		if (node.inputs) {
			for (var i=0;i < node.inputs.length; i++) {
				if (!(node.inputs[i].name in nodeIndex)) {
					traverse(node.inputs[i]);
				}
				deps.push(nodeIndex[node.inputs[i].name]);
			}
		}
		nodeIndex[node.name] = nodeOrder.length;
		nodeOrder.push(node);
		nodeDeps.push(deps);
	}

	for (var i=0;i < exprs.length;i++) {
		traverse(exprs[i]);
	}

	return {
		index: nodeIndex,
		order: nodeOrder,
		dependencies: nodeDeps
	}
}

global.gradient = function(expr,wrts) {
	var nodes = topologicalSort(expr);
	var nodeIndex = nodes.index,
		nodeOrder = nodes.order,
		nodeDeps  = nodes.dependencies;

	var deltas = new Array(nodeOrder.length);
	deltas[deltas.length-1] = Var.ONE;
	for (var i=deltas.length-1;i >= 0;i--) {
		if (nodeOrder[i].grad) {
			var depDeltas = nodeOrder[i].grad(deltas[i]);
			var depIdxs = nodeDeps[i];
			for (var j = 0;j < depDeltas.length; j++) {
				var idx = depIdxs[j], delta = depDeltas[j];
				deltas[idx] = deltas[idx] ? deltas[idx].add(delta) : delta;
			}
		}
	}
	return wrts.map(function(p) {
		return deltas[nodeIndex[p]];
	});
}

global.createFunction = function(exprs) {
	var nodes = topologicalSort(exprs);
	var nodeIndex = nodes.index,
		nodeOrder = nodes.order,
		nodeDeps  = nodes.dependencies;
	var memoize = new Array(nodeOrder.length);
	var lambdaMemoized = function(j) { return memoize[j] };
	return function(inputs) {
		var resultMap = {};
		var resultPtr = 0;
		for (var i=0;i < memoize.length; i++) {
			var currNode = nodeOrder[i];
			if (currNode.fun) {
				var deps = nodeDeps[i];
				memoize[i] = currNode.fun.apply(
						currNode,
						deps.map(lambdaMemoized)
					);
			} else {
				memoize[i] = inputs[currNode.name];
			}
			if (currNode.name == exprs[resultPtr].name) {
				resultMap[currNode.name] = memoize[i];
				resultPtr++;
			}
		}
		return resultMap;
	}
}
