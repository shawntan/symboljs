#!/bin/bash
(
	echo "Symbol=function(){};"
	echo "(function(global) {"
	cat \
		_symbol.js \
		sym.js \
		function.js \
		array.js
	echo "})(Symbol);"
	cat main.js
) | node
