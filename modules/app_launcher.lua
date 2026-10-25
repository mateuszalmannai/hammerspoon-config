---@diagnostic disable: undefined-global
local hotkeyCheatsheet = require('modules.hotkeyCheatsheet')
local M = {}

local cmd_shift = {"cmd", "shift"}
local cmd_opt = {"cmd", "alt"}

local applicationHotkeys = {
  b = 'Brave Browser',
  w = 'WhatsApp',
}

local cmdOptApps = {
  c = 'Fantastical',
  w = 'WezTerm',
  s = 'Strongbox',
  y = 'Yubico Authenticator',
}

function M.bindAppHotkeys()

  for key, app in pairs(applicationHotkeys) do
    hotkeyCheatsheet.bindHotkey(cmd_shift, key, function()
      hs.application.launchOrFocus(app)
    end, "Launch or focus " .. app)
  end

  for key, app in pairs(cmdOptApps) do
    hotkeyCheatsheet.bindHotkey(cmd_opt, key, function()
      hs.application.launchOrFocus(app)
    end, "Launch or focus " .. app)
  end
end


return M
