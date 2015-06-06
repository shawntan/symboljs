#!/bin/bash
closure -O SIMPLE_OPTIMIZATIONS \
	--js symbol.js \
	--js sym.js \
	--js function.js \
	--js array.js \
	--js main.js | node
