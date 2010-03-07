CP = cp
CP_R = cp -R
MV = mv
NOOP = $(SHELL) -c true
RM_RF = rm -rf
MKPATH = mkdir -p
GIT = git
CD = cd
PYTHON = python
SED = sed
LN_S = ln -s
PLATFORM ?= $(shell uname -s)

ifeq ($(PLATFORM),SunOS)
    TAR = gtar
else
    TAR = tar
endif

TOP ?= $(shell pwd)
NAME ?= $(strip $(shell perl -ne '/AGENT_NAME.+?([\w\-]+)/ && print $$1' app.js))
VERSION ?= $(strip $(shell perl -ne '/VERSION.+?(\d+\.\d+)/ && print $$1' app.js))
PREFIX ?= /opt/local/agents/$(NAME)

all :: build

checkout:
	$(GIT) submodule init
	$(GIT) submodule update

build :: build_node

build_node :: checkout
	$(CD) node; $(PYTHON) tools/waf-light configure --prefix=$(PREFIX)/local/
	$(CD) node; $(PYTHON) tools/waf-light build

build_postgres :: checkout build_node
	$(CD) postgres; $(PREFIX)/local/bin/node-waf configure build
	$(CD) postgres; $(MV) postgres.js index.js

build_router :: checkout build_node
	$(CD) router; $(MV) node-router.js index.js

clean :: clean_node clean_libs

clean_node:
	-$(RM_RF) node

clean_libs:
	-$(RM_RF) postgres
	-$(RM_RF) router

install: build install_env install_node build_postgres install_postgres install_router
	$(CP) app.js $(PREFIX)/app.js
	$(SED) -i -e '1s"^#!.\+$$"#!$(PREFIX)/local/bin/node"' $(PREFIX)/app.js
	$(MKPATH) $(PREFIX)/share
	$(CP) schema.sql $(PREFIX)/share/
	$(CP) smartacl.conf $(PREFIX)/

install_env:
	$(MKPATH) $(PREFIX)

install_node:
	$(CD) node; $(PYTHON) tools/waf-light install

install_postgres: install_node
	$(CP_R) postgres $(PREFIX)/local/lib/node/libraries/

install_router: install_node
	$(CP_R) router $(PREFIX)/local/lib/node/libraries/

