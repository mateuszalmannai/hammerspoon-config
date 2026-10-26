---@diagnostic disable: undefined-global

-- Enable the `hs` command-line tool
require("hs.ipc")

local hotkeyCheatsheet = require('modules.hotkeyCheatsheet')
local appLauncher = require('modules.app_launcher')
local windowMgmt = require('modules.window_management')
local network = require('modules.network')
local miscHotkeys = require('modules.misc_hotkeys')
local leader = require('modules.leader')

-- VARIABLES
local hyper = { "ctrl", "alt", "cmd" }

-- Bind all hotkeys from modules:
appLauncher.bindAppHotkeys()
windowMgmt.bindWindowHotkeys()
network.bindPingHotkey()
miscHotkeys.bindMiscHotkeys()
leader.bindLeader()


-- #################################################################### Spoons

hs.loadSpoon("SpoonInstall")
Install=spoon.SpoonInstall

-- ReloadConfiguration: reload automatically when a .lua file in ~/.hammerspoon changes
Install:andUse("ReloadConfiguration", { start = true })

-- Miro Windows Manager
hs.loadSpoon("MiroWindowsManager")

hs.window.animationDuration = 0
spoon.MiroWindowsManager:bindHotkeys({
  up = {hyper, "up"},
  right = {hyper, "right"},
  down = {hyper, "down"},
  left = {hyper, "left"},
  fullscreen = {hyper, "f"}
})
hotkeyCheatsheet.describe(hyper, "up", "Snap window to top (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "right", "Snap window to right (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "down", "Snap window to bottom (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "left", "Snap window to left (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "f", "Full screen (repeat: full, 3/4, 1/2)")

-- keybindings
Install:andUse("KSheet", {
  hotkeys = {
    toggle = { hyper, "/" }
  }
})
hotkeyCheatsheet.describe(hyper, "/", "Toggle KSheet (menu shortcuts of frontmost app)")

-- AClock: big clock in the middle of the screen for a few seconds
hs.loadSpoon("AClock")
hotkeyCheatsheet.bindHotkey(hyper, "c", function()
  spoon.AClock:toggleShow()
end, "Show big clock (AClock)")

-- MountedVolumes: disks with free-space pie charts on the desktop
hs.loadSpoon("MountedVolumes")
spoon.MountedVolumes:show()
spoon.MountedVolumes:bindHotkeys({ toggle = { hyper, "m" } })
hotkeyCheatsheet.describe(hyper, "m", "Toggle mounted volumes on desktop")

-- MicMute: menu bar mic status; tap to toggle, hold for push-to-talk
hs.loadSpoon("MicMute")
spoon.MicMute:bindHotkeys({ toggle = { {"ctrl"}, "/" } }, 0.75)
hotkeyCheatsheet.describe({"ctrl"}, "/", "Toggle mic mute (hold for push-to-talk)")

-- SpeedMenu: upload/download speed in the menu bar
hs.loadSpoon("SpeedMenu")
spoon.SpeedMenu:start()
-- redraw in the right text color when switching light/dark mode
themeWatcher = hs.distributednotifications.new(function()
  spoon.SpeedMenu:rescan()
end, "AppleInterfaceThemeChangedNotification"):start()
-- rescan when the primary network changes (Wi-Fi, Ethernet, VPN); delayed
-- so a burst of changes while switching triggers a single rescan
speedMenuRescan = hs.timer.delayed.new(2, function()
  spoon.SpeedMenu:rescan()
end)
networkWatcher = hs.network.configuration.open()
networkWatcher:setCallback(function() speedMenuRescan:start() end)
networkWatcher:monitorKeys("State:/Network/Global/IPv4")
networkWatcher:start()

-- FadeLogo
Install:andUse("FadeLogo",
  {
    config = {
      default_run = 1.0,
    },
    start = true
  }
)

Install:andUse("CircleClock")
Install:andUse("TimeFlow")
Install:andUse("HCalendar")
Install:andUse("BingDaily")

-- Desktop widget layout: keep widgets inside the usable screen area (below the
-- menu bar, clear of the Dock) with a consistent margin. Re-applied whenever
-- the screen configuration changes.
local function layoutDesktopWidgets()
  local f = hs.screen.mainScreen():frame()
  local margin = 20

  local colRight = f.x + f.w - margin

  -- centre: CircleClock
  local cc = spoon.CircleClock.canvas
  local ccSize = cc:size()
  cc:topLeft({ x = f.x + (f.w - ccSize.w) / 2, y = f.y + (f.h - ccSize.h) / 2 })

  -- top-right: mounted volumes, anchored by its right edge so it stays
  -- aligned as its width changes
  local mv = spoon.MountedVolumes
  mv.growsLeftwards = true
  mv.location = { x = colRight, y = f.y + margin }
  if mv.canvas and mv.canvas:isShowing() then mv:show() end

  -- bottom-right: TimeFlow
  local tf = spoon.TimeFlow.canvas
  local tfSize = tf:size()
  tf:topLeft({ x = colRight - tfSize.w, y = f.y + f.h - tfSize.h - margin })

  -- bottom-left: calendar strip
  local hc = spoon.HCalendar.canvas
  hc:topLeft({ x = f.x + margin, y = f.y + f.h - hc:size().h - margin })
end
layoutDesktopWidgets()
widgetScreenWatcher = hs.screen.watcher.new(layoutDesktopWidgets):start()


print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> init.lua loaded - " .. os.date("%Y-%m-%d-%X"))
hs.alert.show("Hammerspoon config loaded")
local announcement = hs.sound.getByName("Blow")
if announcement then announcement:play() end
