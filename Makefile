CP = cp
CP_R = cp -R
MV = mv
NOOP = $(SHELL) -c true
RM_RF = rm -rf
MKPATH = mkdir -p
GIT = git
CD = cd
PYTHON = python
PERL = perl
LN_S = ln -s
LN_SF = ln -sf
TOUCH = touch
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

all: build

checkout: ./.UPTODATE
./.UPTODATE: 
	$(GIT) submodule init
	$(GIT) submodule update
	$(TOUCH) node/.UPTODATE
	$(TOUCH) postgres/.UPTODATE
	$(TOUCH) router/.UPTODATE
	$(TOUCH) ./.UPTODATE

build: build_node build_router

build_node: checkout node/.BUILT
node/.BUILT:
	$(CD) node; $(PYTHON) tools/waf-light configure --prefix=$(PREFIX)/local/
	$(CD) node; $(PYTHON) tools/waf-light build
	$(TOUCH) node/.BUILT



build_postgres: checkout build_node postgres/.BUILT
postgres/.BUILT:
	$(CD) postgres; $(PREFIX)/local/bin/node-waf configure build
	$(CD) postgres; $(LN_SF) postgres.js index.js
	$(TOUCH) postgres/.BUILT

build_router: checkout build_node router/.BUILT
router/.BUILT:
	$(CD) router; $(LN_SF) node-router.js index.js
	$(TOUCH) router/.BUILT

clean: clean_node clean_libs
	-$(RM_RF) ./.UPTODATE

clean_node:
	-$(RM_RF) node

clean_libs:
	-$(RM_RF) postgres
	-$(RM_RF) router

install: build install_env install_node build_postgres install_postgres install_router
	$(CP) app.js $(PREFIX)/app.js
	$(PERL) -pi -e 's{^#!.+$$}{#!$(PREFIX)/local/bin/node}' $(PREFIX)/app.js
	$(MKPATH) $(PREFIX)/share
	$(CP) schema.sql $(PREFIX)/share/
	$(CP) smart-acl.xml $(PREFIX)/share/
	$(CP) smartacl.conf $(PREFIX)/share/

install_env:
	$(MKPATH) $(PREFIX)

install_node:
	$(CD) node; $(PYTHON) tools/waf-light install

install_postgres: install_node
	$(CP_R) postgres $(PREFIX)/local/lib/node/libraries/

install_router: install_node
	$(CP_R) router $(PREFIX)/local/lib/node/libraries/

