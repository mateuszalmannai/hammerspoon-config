# Unit tests for the plain-Lua parts of the spoons. Uses busted installed for
# Lua 5.4 (the version Hammerspoon runs); see "Tests" in the README.
BUSTED ?= $(HOME)/.luarocks/bin/busted

.PHONY: test
test:
	TZ=Europe/Berlin $(BUSTED)
