#!/bin/bash
(
	echo "function Symbol() {}"
	echo "(function(global) {"
	cat \
		_symbol.js \
		sym.js \
		function.js \
		array.js
	echo "})(Symbol)"
	cat main.js
) | node
