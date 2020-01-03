###########################################################
# Build script
###########################################################

# Operating System (darwin or linux)
PLATFORM:=$(shell uname | tr A-Z a-z)
ARCH=x64
PROJECT_ROOT=$(shell git rev-parse --show-toplevel)

# Nodejs
NODE_VERSION=12.14.0
NODE=lib/nodejs/bin/node
NPM=lib/nodejs/bin/npm

# Derived values
NODE_FILENAME=node-v$(NODE_VERSION)-$(PLATFORM)-$(ARCH)
TEST_FILES=`find . -name "*_test.js" ! -path "*node_modules*"`
NODE_MODULES_BIN=node_modules/.bin

# Node utilities
ESLINT=$(NODE_MODULES_BIN)/eslint
NYC=$(NODE_MODULES_BIN)/nyc
WEBPACK=$(NODE_MODULES_BIN)/webpack
WEBPACK_CLIENT_CONFIG=webpack-client.config.js

.PHONY: test test-w dev-install build build-module lint clean

build: dist/nomplate.js dist/nomplate.min.js dist/nomplate.min.gz

# Run all JavaScript tests
test: ${NODE}
	${NYC} ${TEST_FILES}

test-w: ${NODE}
	${NYC} ${TEST_FILES} -w

# Open a new chrome tab at chrome://inspect and click the small blue link
# that says, "Open dedicated DevTools for Node."
test-debug: ${NODE}
	${NYC} --inspect-brk

build-module: src/*

publish: clean build
	npm publish

dist/nomplate.js: index.js src/*
	$(WEBPACK) --mode development --config $(WEBPACK_CLIENT_CONFIG) index.js --output dist/nomplate.js

dist/nomplate.min.js: index.js src/*
	$(WEBPACK) --mode production --optimize-minimize --config $(WEBPACK_CLIENT_CONFIG) index.js --output dist/nomplate.min.js

dist/nomplate.min.gz: dist/nomplate.min.js
	gzip --best -c dist/nomplate.min.js > dist/nomplate.min.gz

dist/express.js:
	$(WEBPACK) --mode development --config $(WEBPACK_SERVER_CONFIG) express.js --output dist/express.js
	
lint:
	$(ESLINT) --config $(PROJECT_ROOT)/.eslintrc.json .

module-install: 
	$(NPM) install

integrate: clean lint test build

clean: 
	rm -rf dist
	rm -rf tmp
	rm -f .tmp-view.html

yarn:
	npm install -g yarn

# Intall development dependencies (OS X and Linux only)
dev-install: $(NODE) yarn

yarn-install:
	yarn install

# Download and unpack the Node binaries into lib/nodejs.
$(NODE):
	mkdir -p tmp
	wget -O tmp/nodejs.tar.xz --no-check-certificate "https://nodejs.org/dist/v$(NODE_VERSION)/$(NODE_FILENAME).tar.xz"
	touch tmp/nodejs.tar.xz
	mkdir -p lib/nodejs
	tar -xvf tmp/nodejs.tar.xz -C lib/nodejs --strip 1
	touch lib/nodejs/README.md
	rm -rf tmp

# Install npm dependencies
$(NODE_MODULES_BIN): $(PROJECT_ROOT)/package.json
	$(NPM) install --development

