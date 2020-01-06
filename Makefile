###########################################################
# Build script
###########################################################

# Operating System (darwin or linux)
ARCH=x64
PLATFORM:=$(shell uname | tr A-Z a-z)
PROJECT_ROOT=$(shell git rev-parse --show-toplevel)

# Nodejs
NODE=lib/nodejs/bin/node
NODE_MODULES_BIN=node_modules/.bin
NODE_VERSION=12.14.0

# Values
NPM=lib/nodejs/bin/npm
PORT=8081
SRC_FILES=$(shell find . -name "*js" ! -path "*node_modules*" ! -path "*.dist.js")
TEST_FILES=$(shell find . -name "*_test.js" ! -path "*node_modules*")
WEBPACK_CLIENT_CONFIG=webpack-client.config.js

# Derived values
ESLINT=$(NODE_MODULES_BIN)/eslint
MOCHA=$(NODE_MODULES_BIN)/mocha
NODEMON=${NODE_MODULES_BIN}/nodemon
NODE_FILENAME=node-v$(NODE_VERSION)-$(PLATFORM)-$(ARCH)
NYC=$(NODE_MODULES_BIN)/nyc
WEBPACK=$(NODE_MODULES_BIN)/webpack
YARN=$(NODE_MODULES_BIN)/yarn

.PHONY: build coverage test test-w test-debug dev-install build build-module lint clean

# Build the example app distribution
example/stream/app.dist.js: ${SRC_FILES}
	${YARN} webpack -o example/stream/app.dist.js --mode development example/stream/app.js

# Build any source files
build: ${NODE} example/stream/app.dist.js

# Run all JavaScript tests
test: ${NODE}
	${NYC} ${MOCHA} ${TEST_FILES}

test-w: ${NODE}
	${NYC} ${MOCHA} ${TEST_FILES} -w

# Open a new chrome tab at chrome://inspect and click the small blue link
# that says, "Open dedicated DevTools for Node."
test-debug: ${NODE}
	${NYC} ${MOCHA} ${TEST_FILES} --inspect-brk

# NOTE: Currently broken b/c eslint dependencies are too painful
lint:
	$(ESLINT) --config $(PROJECT_ROOT)/.eslintrc.json ${SRC_FILES}

module-install: 
	$(NPM) install

integrate: clean lint test

serve:
	${NODE} example/stream/static_server.jsm ${PORT}

serve-dev:
	${NODEMON} -x "make build serve || true" -i example/stream/app.dist.js -w .

coverage:
	${NYC} report --reporter=text-lcov > coverage.lcov && codecov

clean: 
	rm -rf example/stream/app.dist.js
	rm -rf tmp
	rm -f .tmp-view.html

yarn:
	$(NPM) install yarn --save-dev

# Intall development dependencies (OS X and Linux only)
dev-install: $(NODE) yarn

yarn-install:
	$(YARN) install

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

