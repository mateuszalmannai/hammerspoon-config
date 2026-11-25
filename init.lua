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
-- PensionCountdown: TimeFlow-style countdown to the start of my pension, in
-- the bottom-right corner (placed in layoutDesktopWidgets). The date is
-- personal, so it lives in the git-ignored local/pension.lua (format:
-- local/pension.example.lua); without it the widget isn't loaded.
local pensionConfig = hs.configdir .. "/local/pension.lua"
if hs.fs.attributes(pensionConfig) then
  hs.loadSpoon("PensionCountdown")
  for k, v in pairs(dofile(pensionConfig)) do spoon.PensionCountdown[k] = v end
  spoon.PensionCountdown:start()
else
  print("PensionCountdown: no " .. pensionConfig .. ", widget not shown")
end
Install:andUse("HCalendar")
Install:andUse("BingDaily")

hotkeyCheatsheet.group("Tools")

-- RemindCalendar: next two weeks from remind (same files as wyrd/rcal) in a popup
hs.loadSpoon("RemindCalendar")
hotkeyCheatsheet.bindHotkey(hyper, "w", function()
  spoon.RemindCalendar:toggle()
end, "Remind calendar popup: show or hide (1/2/m: week, two weeks, month; Esc or click closes)")
hotkeyCheatsheet.describeViews(hyper, "w", "Remind calendar", spoon.RemindCalendar)

-- RemindAgenda: today's and tomorrow's reminders on the desktop, bottom left
-- above the calendar strip (placed in layoutDesktopWidgets); click opens the popup
hs.loadSpoon("RemindAgenda")
spoon.RemindAgenda.onClick = function() spoon.RemindCalendar:toggle() end
spoon.RemindAgenda:start()

-- VPNStatus: vpn-switch tunnels on the desktop (left edge, placed in
-- layoutDesktopWidgets), each with a check that the service behind it answers;
-- click opens VPN Switch. The tunnel list names internal hosts, so it lives in
-- the git-ignored local/vpn_tunnels.lua (format: local/vpn_tunnels.example.lua);
-- without it the widget isn't loaded.
local vpnTunnels = hs.configdir .. "/local/vpn_tunnels.lua"
if hs.fs.attributes(vpnTunnels) then
  hs.loadSpoon("VPNStatus")
  spoon.VPNStatus.tunnels = dofile(vpnTunnels)
  spoon.VPNStatus.onClick = function() hs.application.launchOrFocus("VPN Switch") end
  spoon.VPNStatus:start()
else
  print("VPNStatus: no " .. vpnTunnels .. ", widget not shown")
end

-- TaskwarriorViews: taskwarrior reports for the active context in a popup
hs.loadSpoon("TaskwarriorViews")
hotkeyCheatsheet.bindHotkey(hyper, "t", function()
  spoon.TaskwarriorViews:toggle()
end, "Taskwarrior popup: show or hide (n/b/h/s: next, burndown, history, summary; Esc or click closes)")
hotkeyCheatsheet.describeViews(hyper, "t", "Taskwarrior", spoon.TaskwarriorViews)

-- TaskwarriorSummary: overdue / due-today counts and the top tasks of the
-- active context on the desktop, top left; click opens the popup
hs.loadSpoon("TaskwarriorSummary")
spoon.TaskwarriorSummary.onClick = function() spoon.TaskwarriorViews:toggle() end
spoon.TaskwarriorSummary:start()

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

-- DecisionTools: decision-making tools (PMI, Eisenhower, Pareto, …) in a popup
hs.loadSpoon("DecisionTools")
hotkeyCheatsheet.bindHotkey(hyper, "d", function()
  spoon.DecisionTools:toggle()
end, "Decision tools popup: show or hide (⌘1–⌘8 switch tools; Esc or click elsewhere closes)")

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
  -- the primary screen (the one with the menu bar), not mainScreen(), which is
  -- whichever screen has the focused window when this runs
  local f = hs.screen.primaryScreen():frame()
  local margin = 20

  local left = f.x + margin

  -- Everything sits in one column on the left edge, in two stacks. Widgets
  -- whose height varies pass their frame on (onLayout), so the ones next to
  -- them move along instead of overlapping.

  -- top stack, growing downwards: mounted volumes, task summary, VPN status
  local mv = spoon.MountedVolumes
  mv.growsDownwards = true
  mv.growsLeftwards = false
  mv.location = { x = left, y = f.y + margin }
  mv.onLayout = function(volumes)
    spoon.TaskwarriorSummary:setTopLeft({ x = left, y = volumes.y + volumes.h + margin })
  end
  spoon.TaskwarriorSummary.onLayout = function(tasks)
    if spoon.VPNStatus then
      spoon.VPNStatus:setTopLeft({ x = left, y = tasks.y + tasks.h + margin })
    end
  end
  if mv.canvas and mv.canvas:isShowing() then
    mv:show()
  else
    mv.onLayout({ y = f.y, h = 0 })
  end

  -- bottom stack, growing upwards: TimeFlow (year) at the bottom, the month
  -- strip above it, the agenda above that and CircleClock on top, moving up
  -- as the agenda grows
  local tf = spoon.TimeFlow.canvas
  tf:topLeft({ x = left, y = f.y + f.h - tf:size().h - margin })

  local hc = spoon.HCalendar.canvas
  hc:topLeft({ x = left, y = tf:topLeft().y - hc:size().h - margin })

  local cc = spoon.CircleClock.canvas
  spoon.RemindAgenda.onLayout = function(agenda)
    cc:topLeft({ x = left, y = agenda.y - cc:size().h - margin })
  end
  spoon.RemindAgenda:setBottomLeft({ x = left, y = hc:topLeft().y - margin })

  -- the pension countdown on its own in the bottom-right corner
  if spoon.PensionCountdown then
    local pc = spoon.PensionCountdown.canvas
    local pcSize = pc:size()
    pc:topLeft({ x = f.x + f.w - pcSize.w - margin, y = f.y + f.h - pcSize.h - margin })
  end
end
layoutDesktopWidgets()
widgetScreenWatcher = hs.screen.watcher.new(layoutDesktopWidgets):start()


print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> init.lua loaded - " .. os.date("%Y-%m-%d-%X"))
hs.alert.show("Hammerspoon config loaded")
local announcement = hs.sound.getByName("Blow")
if announcement then announcement:play() end
