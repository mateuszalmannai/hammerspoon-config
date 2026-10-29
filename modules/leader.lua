---@diagnostic disable: undefined-global
-- Leader-key menu (RecursiveBinder): press Hyper+Space, then follow the
-- on-screen helper. Escape aborts.
local hotkeyCheatsheet = require('modules.hotkeyCheatsheet')
local windowMgmt = require('modules.window_management')
local misc = require('modules.misc_hotkeys')
local M = {}

local hyper = { "ctrl", "alt", "cmd" }

local function app(name)
  return function() hs.application.launchOrFocus(name) end
end

function M.bindLeader()
  hs.loadSpoon("RecursiveBinder")
  local rb = spoon.RecursiveBinder
  rb.escapeKey = { {}, "escape" }
  local key = rb.singleKey

  local keymap = {
    [key("a", "apps+")] = {
      [key("b", "Brave")] = app("Brave Browser"),
      [key("w", "WhatsApp")] = app("WhatsApp"),
      [key("f", "Fantastical")] = app("Fantastical"),
      [key("t", "WezTerm")] = app("WezTerm"),
      [key("s", "Strongbox")] = app("Strongbox"),
      [key("y", "Yubico")] = app("Yubico Authenticator"),
    },
    [key("w", "window+")] = {
      [key("1", "to display 1")] = windowMgmt.moveWindowToDisplay(1),
      [key("2", "to display 2")] = windowMgmt.moveWindowToDisplay(2),
      [key("3", "to display 3")] = windowMgmt.moveWindowToDisplay(3),
    },
    [key("c", "clipboard+")] = {
      [key("d", "copy date")] = misc.actions.copyDate,
      [key("e", "copy epoch hex")] = misc.actions.copyEpochHex,
      [key("v", "type clipboard")] = misc.actions.typeClipboard,
    },
    [key("s", "system+")] = {
      [key("l", "lock screen")] = misc.actions.lockScreen,
      [key("z", "sleep")] = misc.actions.sleep,
      [key("k", "kill Dock")] = misc.actions.killDock,
      [key("t", "show time")] = misc.actions.showTime,
    },
    [key("h", "hammerspoon+")] = {
      [key("r", "reload")] = hs.reload,
      [key("c", "console")] = hs.toggleConsole,
      [key("h", "cheatsheet")] = hotkeyCheatsheet.toggle,
    },
  }

  hotkeyCheatsheet.group("Leader menu")
  hotkeyCheatsheet.bindHotkey(hyper, "space", rb.recursiveBind(keymap),
    "Leader menu (apps, window, clipboard, system, hammerspoon)")
  -- each leader action also gets its own row in the cheatsheet
  hotkeyCheatsheet.describeKeymap(hyper, "space", keymap)
end

return M
