#!/bin/bash
echo "function Symbol() {}; (function(global){%output%})(Symbol)"
closure -O SIMPLE \
	--js _symbol.js \
	--js sym.js \
	--js function.js \
	--js array.js \
	--output_wrapper "Symbol=function(){};(function(global){%output%})(Symbol);" \
	--js_output_file symbol.js
