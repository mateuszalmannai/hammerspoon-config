---@diagnostic disable: undefined-global
local hotkeyCheatsheet = require('modules.hotkeyCheatsheet')
local M = {}

local cmd_opt = { "cmd", "alt" }

function M.moveWindowToDisplay(d)
  return function()
    local displays = hs.screen.allScreens()
    local win = hs.window.focusedWindow()
    if not win then
      hs.alert.show("No focused window")
      return
    end
    if not displays[d] then
      hs.alert.show("Display " .. d .. " not found")
      return
    end
    win:moveToScreen(displays[d], false, true)
  end
end

function M.bindWindowHotkeys()
  hotkeyCheatsheet.bindHotkey(cmd_opt, "1", M.moveWindowToDisplay(1), "Move window to display 1")
  hotkeyCheatsheet.bindHotkey(cmd_opt, "2", M.moveWindowToDisplay(2), "Move window to display 2")
  hotkeyCheatsheet.bindHotkey(cmd_opt, "3", M.moveWindowToDisplay(3), "Move window to display 3")
end

return M
