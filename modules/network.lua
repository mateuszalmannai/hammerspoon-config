---@diagnostic disable: undefined-global
local hotkeyCheatsheet = require('modules.hotkeyCheatsheet')
local M = {}

local cmd_opt = { "cmd", "alt" }

local function pingResult(object, message)
  if message == "didFinish" then
    local avg = tonumber(string.match(object:summary(), '/(%d+%.%d+)/'))
    if not avg then
      hs.alert.show("Ping summary parsing error")
      return
    end

    if avg == 0.0 then
      hs.alert.show("No network")
    elseif avg < 200.0 then
      hs.alert.show("Network good (" .. avg .. "ms)")
    elseif avg < 500.0 then
      hs.alert.show("Network poor (" .. avg .. "ms)")
    else
      hs.alert.show("Network bad (" .. avg .. "ms)")
    end
  end
end

function M.bindPingHotkey()
  hotkeyCheatsheet.bindHotkey(cmd_opt, "p", function()
    local success, err = pcall(function()
      hs.network.ping.ping("8.8.8.8", 1, 0.01, 1.0, "any", pingResult)
    end)
    if not success then
      hs.alert.show("Ping failed: " .. tostring(err))
    end
  end, "Check network speed")
end

return M
