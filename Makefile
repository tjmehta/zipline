all:
	./node_modules/.bin/browserify ./lib/client.js -d > ./public/bundle.js