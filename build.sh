#!/bin/bash
closure -O SIMPLE_OPTIMIZATIONS \
	--js _symbol.js \
	--js sym.js \
	--js function.js \
	--js array.js > symbol.js
