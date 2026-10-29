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

-- Reload automatically when a .lua file in ~/.hammerspoon changes.
-- (Not the ReloadConfiguration spoon: it reloads on any change, e.g. Cherry writing cherry.db.)
configWatcher = hs.pathwatcher.new(hs.configdir, function(paths)
  for _, path in ipairs(paths) do
    if path:sub(-4) == ".lua" then return hs.reload() end
  end
end):start()

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
hotkeyCheatsheet.group("Windows")
hotkeyCheatsheet.describe(hyper, "up", "Snap window to top (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "right", "Snap window to right (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "down", "Snap window to bottom (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "left", "Snap window to left (repeat: 1/2, 1/3, 2/3)")
hotkeyCheatsheet.describe(hyper, "f", "Full screen (repeat: full, 3/4, 1/2)")

-- Menu shortcuts of the frontmost app, in the cheatsheet's searchable panel
local appShortcuts = require('modules.appShortcuts')
hotkeyCheatsheet.group("Hammerspoon")
hotkeyCheatsheet.bindHotkey(hyper, "/", appShortcuts.toggle, "Search menu shortcuts of frontmost app")

hotkeyCheatsheet.group("Tools")

-- AClock: big clock in the middle of the screen for a few seconds
hs.loadSpoon("AClock")
hotkeyCheatsheet.bindHotkey(hyper, "c", function()
  spoon.AClock:toggleShow()
end, "Show big clock (AClock)")

-- MountedVolumes: disks with free-space pie charts on the desktop
hs.loadSpoon("MountedVolumes")
-- styled to match the other desktop widgets: faint dark panel, translucent white text
spoon.MountedVolumes.backgroundColor  = { hex = "#000000", alpha = 0.25 }
spoon.MountedVolumes.backgroundBorder = { hex = "#FFFFFF", alpha = 0.1 }
spoon.MountedVolumes.textStyle = {
  font = { name = "Menlo", size = 10 },
  color = { hex = "#FFFFFF", alpha = 0.6 },
  paragraphStyle = { alignment = "center" },
}
spoon.MountedVolumes:show()
spoon.MountedVolumes:bindHotkeys({ toggle = { hyper, "m" } })
hotkeyCheatsheet.describe(hyper, "m", "Toggle mounted volumes on desktop")

-- MicMute: menu bar mic status; tap to toggle, hold for push-to-talk
hotkeyCheatsheet.group("System")
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
-- recolour the clock face (numbers and ticks are baked into watchbg.png) to the
-- translucent light grey used by the other desktop widgets
do
  local face = spoon.CircleClock.canvas[1].image
  local size = face:size()
  local tint = hs.canvas.new({ x = 0, y = 0, w = size.w, h = size.h })
  tint[1] = { type = "image", image = face, imageScaling = "scaleToFit" }
  tint[2] = { type = "rectangle", action = "fill", compositeRule = "sourceIn",
              fillColor = { hex = "#FFFFFF", alpha = 0.6 } }
  spoon.CircleClock.canvas[1].image = tint:imageFromCanvas()
  tint:delete()
end
Install:andUse("TimeFlow")
Install:andUse("HCalendar")
Install:andUse("BingDaily")

hotkeyCheatsheet.group("Tools")

-- RemindCalendar: next two weeks from remind (same files as wyrd/rcal) in a popup
hs.loadSpoon("RemindCalendar")
hotkeyCheatsheet.bindHotkey(hyper, "w", function()
  spoon.RemindCalendar:toggle()
end, "Remind calendar popup: show or hide (1/2/m: week, two weeks, month; Esc or click closes)")
hotkeyCheatsheet.describeViews(hyper, "w", "Remind calendar", spoon.RemindCalendar)

-- TaskwarriorViews: taskwarrior reports for the active context in a popup
hs.loadSpoon("TaskwarriorViews")
hotkeyCheatsheet.bindHotkey(hyper, "t", function()
  spoon.TaskwarriorViews:toggle()
end, "Taskwarrior popup: show or hide (n/b/h/s: next, burndown, history, summary; Esc or click closes)")
hotkeyCheatsheet.describeViews(hyper, "t", "Taskwarrior", spoon.TaskwarriorViews)

-- QuickNote: one-line box that adds a timestamped note to a file, at the end
-- of the section whose heading contains `section`
hs.loadSpoon("QuickNote")
spoon.QuickNote.file = "~/markdown/running_notes/inbx.md"
spoon.QuickNote.section = "Uncategorised"
hotkeyCheatsheet.bindHotkey(hyper, "n", function()
  spoon.QuickNote:toggle()
end, "Quick note to " .. spoon.QuickNote.file:match("[^/]+$") .. " (" .. spoon.QuickNote.section .. "): Enter saves, Esc cancels")
-- open the same file in Marked (via its `mk` command-line tool)
hotkeyCheatsheet.bindHotkey({ "ctrl", "alt", "cmd", "shift" }, "n", function()
  hs.task.new("/opt/homebrew/bin/mk", nil, { hs.fs.pathToAbsolute(spoon.QuickNote.file) }):start()
end, "Open " .. spoon.QuickNote.file:match("[^/]+$") .. " in Marked (mk)")

-- Bring the console to the current desktop when opened (e.g. for Cherry stats),
-- rather than switching to whichever desktop it was last on
hs.console.behaviorAsLabels({ "fullScreenPrimary", "moveToActiveSpace" })

-- Cherry: 25-minute Pomodoro timer, shown in the menu bar while running
hs.loadSpoon("Cherry")
spoon.Cherry.sound = hs.sound.getByName("Glass")
spoon.Cherry:bindHotkeys({ start = { hyper, "p" }, stats = { { "ctrl", "alt", "cmd", "shift" }, "p" } })
hotkeyCheatsheet.describe(hyper, "p", "Pomodoro timer: start, or pause/resume (Cherry)")
hotkeyCheatsheet.describe({ "ctrl", "alt", "cmd", "shift" }, "p", "Pomodoro stats overlay: show or hide (Esc or click also closes it) (Cherry)")

-- HSearch: search box with sources picked by keyword + Tab
-- (d dates, n notes, s thesaurus, t Brave tabs)
hs.loadSpoon("HSearch")
hotkeyCheatsheet.bindHotkey(hyper, "g", function()
  spoon.HSearch:toggleShow()
end, "HSearch (d/n/s/t + Tab: dates, notes, thesaurus, Brave tabs)")
-- a cheatsheet row per source, which opens HSearch on it (as typing the
-- keyword and Tab would)
local hsearchSteps = {}
for _, source in ipairs({ { "d", "Dates" }, { "n", "Notes" }, { "s", "Thesaurus" }, { "t", "Brave tabs" } }) do
  hsearchSteps[#hsearchSteps + 1] = { key = source[1], text = "HSearch › " .. source[2], fn = function()
    if not spoon.HSearch.chooser:isVisible() then spoon.HSearch:toggleShow() end
    spoon.HSearch.chooser:query(source[1])
    spoon.HSearch:switchSource()
  end }
end
hotkeyCheatsheet.describeSequence(hyper, "g", hsearchSteps)

-- Desktop widget layout: keep widgets inside the usable screen area (below the
-- menu bar, clear of the Dock) with a consistent margin. Re-applied whenever
-- the screen configuration changes.
local function layoutDesktopWidgets()
  local f = hs.screen.mainScreen():frame()
  local margin = 20

  local colRight = f.x + f.w - margin

  -- right edge, vertically centred: CircleClock
  local cc = spoon.CircleClock.canvas
  local ccSize = cc:size()
  cc:topLeft({ x = colRight - ccSize.w, y = f.y + (f.h - ccSize.h) / 2 })

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
