---@diagnostic disable: undefined-global
local hotkeyCheatsheet = require('modules.hotkeyCheatsheet')
local M = {}

local hyper = { "ctrl", "alt", "cmd" }
local cmd_opt = { "cmd", "alt" }

-- Actions shared by the hotkeys below and the leader menu (modules/leader.lua)
M.actions = {
  killDock = function()
    local _, status = hs.execute("killall Dock")
    local message = "Killed Dock: " .. tostring(status)
    hs.alert.show(message)
  end,
  showTime = function()
    hs.alert.show(os.date("%X"))
  end,
  copyEpochHex = function()
    hs.pasteboard.setContents(string.format("%x", os.time()):upper())
  end,
  copyDate = function()
    hs.pasteboard.setContents(os.date("%Y-%m-%d-"))
  end,
  typeClipboard = function()
    hs.eventtap.keyStrokes(hs.pasteboard.getContents())
  end,
  lockScreen = function()
    hs.caffeinate.lockScreen()
  end,
  sleep = function()
    hs.caffeinate.systemSleep()
  end,
}

function M.bindMiscHotkeys()
-- RELOAD CONFIG
  hotkeyCheatsheet.bindHotkey(hyper, "y", hs.toggleConsole, "Toggle Hammerspoon Console")
  hotkeyCheatsheet.bindHotkey(hyper, "r", hs.reload, "Reload Hammerspoon Config")

  hotkeyCheatsheet.bindHotkey(cmd_opt, 'h', function()
    hotkeyCheatsheet.toggle()
  end, "Toggle Hammerspoon cheatsheet")

  hotkeyCheatsheet.bindHotkey(cmd_opt, "K", M.actions.killDock, "Kill Dock")
  hotkeyCheatsheet.bindHotkey({"alt", "shift"}, "t", M.actions.showTime, "Show current time")
  hotkeyCheatsheet.bindHotkey(cmd_opt, "t", M.actions.copyEpochHex, "Copy unix epoch hex value to clipboard")
  hotkeyCheatsheet.bindHotkey(cmd_opt, "d", M.actions.copyDate, "Copy date to clipboard")
  hotkeyCheatsheet.bindHotkey(hyper, "V", M.actions.typeClipboard, "Type clipboard contents: circumvent pasteblockers")
  hotkeyCheatsheet.bindHotkey(hyper, "l", M.actions.lockScreen, "Lock screen")
  hotkeyCheatsheet.bindHotkey(hyper, "z", M.actions.sleep, "Put system to sleep")
end

return M
