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
  hotkeyCheatsheet.group("System")
  hotkeyCheatsheet.bindHotkey(cmd_opt, "p", function()
    local success, err = pcall(function()
      hs.network.ping.ping("8.8.8.8", 1, 0.01, 1.0, "any", pingResult)
    end)
    if not success then
      hs.alert.show("Ping failed: " .. tostring(err))
    end
  end, "Check network speed")
end

-- Wi-Fi name in the menu bar (based on
-- https://dev.to/mcrowder65/configuring-your-mac-to-display-the-wifi-name-on-the-menu-bar-3p8b).
-- macOS only gives apps the SSID with Location Services permission; until
-- Hammerspoon has it, the title asks for it instead of claiming Wi-Fi is off.
function M.wifiTitle()
  local details = hs.wifi.interfaceDetails() or {}
  if not details.power then return "Wi-Fi off" end
  local ssid = hs.wifi.currentNetwork()
  if ssid then return ssid end
  if hs.location.authorizationStatus() ~= "authorized" then return "Wi-Fi: allow Location" end
  return "Wi-Fi: not connected"
end

-- Titles longer than this are drawn in a smaller font, so a long SSID is
-- less likely to be hidden when the menu bar runs out of room
local wifiLongTitle = 16
local wifiSmallFontSize = 10

-- styled text doesn't follow the menu bar's text colour by itself, so pick
-- it from light/dark mode (as SpeedMenu does)
local function styledWifiTitle(title)
  if #title <= wifiLongTitle then return title end
  local color = hs.host.interfaceStyle() == "Dark" and "#FFFFFF" or "#000000"
  return hs.styledtext.new(title, { font = { size = wifiSmallFontSize }, color = { hex = color } })
end

function M.startWifiMenu()
  M.wifiMenu = hs.menubar.new()
  local function update() M.wifiMenu:setTitle(styledWifiTitle(M.wifiTitle())) end
  M.wifiMenu:setClickCallback(function()
    hs.execute("open 'x-apple.systempreferences:com.apple.wifi-settings-extension'")
  end)
  M.wifiMenu:setTooltip("Click for Wi-Fi settings")

  M.wifiWatcher = hs.wifi.watcher.new(update)
    :watchingFor({ "SSIDChange", "powerChange", "linkChange" })
    :start()
  M.wifiThemeWatcher = hs.distributednotifications.new(update, "AppleInterfaceThemeChangedNotification"):start()
  update()

  -- First run: hs.location.start() makes macOS ask for permission; poll until
  -- it's answered, then stop location updates (only the permission is needed)
  if hs.location.authorizationStatus() ~= "authorized" then
    hs.location.start()
    M.locationDone = hs.timer.waitUntil(function()
      return hs.location.authorizationStatus() ~= "undefined"
    end, function()
      hs.location.stop()
      update()
    end, 2)
  end
end

return M
