# Unit tests for the plain-Lua parts of the spoons. Uses busted installed for
# Lua 5.4 (the version Hammerspoon runs); see "Tests" in the README.
BUSTED ?= $(HOME)/.luarocks/bin/busted

.PHONY: test readme
test:
	TZ=Europe/Berlin $(BUSTED)

# Rewrite the hotkey tables in README.md from the live ⌘⌥H cheatsheet
# (needs Hammerspoon running with this config and its `hs` command-line tool).
# `hs` occasionally hangs, e.g. just after a config reload: Ctrl-C and rerun.
readme:
	hs -c 'return require("modules.hotkeyReadme").write()'
