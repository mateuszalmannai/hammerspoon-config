--- === Cherry ===
---
--- Cherry tomato (a tiny Pomodoro) -- a Pomodoro Timer for the menubar
---
--- Download: [https://github.com/Hammerspoon/Spoons/raw/master/Spoons/Cherry.spoon.zip](https://github.com/Hammerspoon/Spoons/raw/master/Spoons/Cherry.spoon.zip)
---

local obj = {}
obj.__index = obj

-- Metadata
obj.name = "Cherry"
obj.version = "0.2"
obj.author = "Daniel Marques <danielbmarques@gmail.com> and Omar El-Domeiri <omar@doesnotexist.com>"
obj.license = "MIT"
obj.homepage = "https://github.com/Hammerspoon/Spoons"

-- Settings

-- timer duration in minutes
obj.duration = 25

-- set this to true to always show the menubar item
obj.alwaysShow = false

-- duration in seconds for alert to stay on screen
-- set to 0 to turn off alert completely
obj.alertDuration = 5

-- Font size for alert
obj.alertTextSize = 80

-- set to nil to turn off notification when time's up or provide a hs.notify notification
-- obj.notification = nil
obj.notification = hs.notify.new({ title = "Done! 🍒", withdrawAfter = 0})

-- set to nil to turn off notification sound when time's up or provide a hs.sound
obj.sound = nil
-- obj.sound = hs.sound.getByFile("System/Library/PrivateFrameworks/ScreenReader.framework/Versions/A/Resources/Sounds")

-- sqlite database where finished pomodoros are logged
obj.dbFile = hs.configdir .. "/cherry.db"

-- stopped pomodoros that ran for less than this many seconds are not logged
obj.minLogSeconds = 60

-- font for the stats overlay; must be monospaced so the columns line up
obj.statsFont = { name = "Menlo", size = 16 }

obj.defaultMapping = {
  start = {{"cmd", "ctrl", "alt"}, "C"}
}


--- Cherry:bindHotkeys(mapping)
--- Method
--- Binds hotkeys for Cherry
---
--- Parameters:
---  * mapping - A table containing hotkey details for the following items:
---   * start - start the pomodoro timer, or pause/resume it if one is in progress (Default: cmd-ctrl-alt-C)
---   * stats - show or hide the pomodoro statistics overlay (Default: none)
function obj:bindHotkeys(mapping)
  if self.hotkeys then
    for _, hotkey in pairs(self.hotkeys) do hotkey:delete() end
  end
  self.hotkeys = {}

  local key = (mapping and mapping["start"]) or self.defaultMapping["start"]
  self.hotkeys.start = hs.hotkey.bind(key[1], key[2], "Pomodoro Timer", function() self:toggle() end)

  key = mapping and mapping["stats"]
  if key then
    self.hotkeys.stats = hs.hotkey.bind(key[1], key[2], "Pomodoro Stats", function() self:stats() end)
  end
end


function obj:init()
  self.menu = hs.menubar.new(self.alwaysShow)
  self:reset()
end


-- Database

local function warn(message)
  print("Cherry: " .. message)
end

-- Opens the database, creating the schema if needed. Returns nil on failure.
function obj:openDb()
  local db, _, err = hs.sqlite3.open(self.dbFile)
  if not db then
    warn("could not open " .. self.dbFile .. ": " .. tostring(err))
    return nil
  end
  -- only touch the schema on a fresh database, so opening never writes to the file
  local version = 0
  for v in db:urows("PRAGMA user_version") do version = v end
  if version > 0 then return db end
  local rc = db:exec([[
    CREATE TABLE IF NOT EXISTS pomodoros (
      id      INTEGER PRIMARY KEY,
      start   INTEGER NOT NULL,
      finish  INTEGER NOT NULL,
      planned INTEGER NOT NULL,
      outcome TEXT    NOT NULL CHECK (outcome IN ('completed', 'abandoned'))
    );
    CREATE INDEX IF NOT EXISTS pomodoros_finish ON pomodoros (finish);
    PRAGMA user_version = 1;
  ]])
  if rc ~= hs.sqlite3.OK then
    warn("could not create schema: " .. db:errmsg())
    db:close()
    return nil
  end
  return db
end


-- Logs the pomodoro in progress with the given outcome ("completed" or "abandoned").
function obj:record(outcome)
  if not self.startedAt then return end
  local db = self:openDb()
  if not db then return end
  local stmt = db:prepare("INSERT INTO pomodoros (start, finish, planned, outcome) VALUES (?, ?, ?, ?)")
  if not stmt then
    warn("could not log pomodoro: " .. db:errmsg())
  else
    stmt:bind_values(self.startedAt, os.time(), self.plannedMinutes, outcome)
    if stmt:step() ~= hs.sqlite3.DONE then
      warn("could not log pomodoro: " .. db:errmsg())
    end
    stmt:finalize()
  end
  db:close()
end


-- Stats

-- Local calendar date `offset` days from today, as a time value at noon (safe across DST changes).
local function dayTime(offset)
  local t = os.date("*t")
  t.day = t.day + offset
  t.hour, t.min, t.sec = 12, 0, 0
  return os.time(t)
end

local function dayKey(offset)
  return os.date("%Y-%m-%d", dayTime(offset))
end

local DAY = "date(finish, 'unixepoch', 'localtime')"

-- Always drains the iterator: leaving it early would keep the statement open and block db:close()
local function queryRows(db, sql)
  local rows = {}
  for row in db:nrows(sql) do table.insert(rows, row) end
  return rows
end

local function queryRow(db, sql)
  return queryRows(db, sql)[1] or {}
end

local function completedSince(db, sinceExpr)
  local row = queryRow(db, string.format([[
    SELECT COUNT(*) AS n, COALESCE(SUM(planned), 0) AS minutes
    FROM pomodoros
    WHERE outcome = 'completed' AND %s >= %s
  ]], DAY, sinceExpr))
  return row.n or 0, row.minutes or 0
end

local function formatMinutes(minutes)
  return string.format("%dh %02dm", minutes // 60, minutes % 60)
end


-- Builds the stats report as plain text, or returns nil if the database can't be opened.
function obj:statsText()
  local db = self:openDb()
  if not db then return nil end

  local lines = { "🍒 Pomodoro stats", "" }
  local function add(fmt, ...) table.insert(lines, string.format(fmt, ...)) end

  local todayN, todayMin = completedSince(db, "date('now', 'localtime')")
  -- 'weekday 0' moves forward to Sunday (or stays on it); 6 days earlier is this week's Monday
  local weekN, weekMin = completedSince(db, "date('now', 'localtime', 'weekday 0', '-6 days')")
  local allN, allMin = completedSince(db, "'0000-00-00'")
  add("  Today      %4d   %s", todayN, formatMinutes(todayMin))
  add("  This week  %4d   %s", weekN, formatMinutes(weekMin))
  add("  All time   %4d   %s", allN, formatMinutes(allMin))

  local rate = queryRow(db, [[
    SELECT SUM(outcome = 'completed') AS completed, COUNT(*) AS total FROM pomodoros
  ]])
  if (rate.total or 0) > 0 then
    add("  Completion %3d%%   (%d of %d started)",
      math.floor(100 * rate.completed / rate.total + 0.5), rate.completed, rate.total)
  end

  -- Streak: consecutive days with a completed pomodoro, ending today, or yesterday if today has none yet
  local days = queryRows(db, string.format([[
    SELECT DISTINCT %s AS day FROM pomodoros WHERE outcome = 'completed' ORDER BY day DESC
  ]], DAY))
  local streak = 0
  local expected = (days[1] and days[1].day == dayKey(0)) and 0 or -1
  for _, row in ipairs(days) do
    if row.day ~= dayKey(expected) then break end
    streak = streak + 1
    expected = expected - 1
  end
  add("  Streak     %4d   day%s", streak, streak == 1 and "" or "s")

  local perDay = {}
  for _, row in ipairs(queryRows(db, string.format([[
    SELECT %s AS day, COUNT(*) AS n FROM pomodoros
    WHERE outcome = 'completed' AND %s >= date('now', 'localtime', '-13 days')
    GROUP BY day
  ]], DAY, DAY))) do
    perDay[row.day] = row.n
  end
  db:close()

  local max = 0
  for _, n in pairs(perDay) do max = math.max(max, n) end
  local scale = max > 40 and 40 / max or 1

  add("")
  add("  Last 14 days")
  for offset = -13, 0 do
    local n = perDay[dayKey(offset)] or 0
    local width = n > 0 and math.max(1, math.floor(n * scale + 0.5)) or 0
    add("  %s  %s %s", os.date("%a %d %b", dayTime(offset)), string.rep("█", width), n > 0 and n or "")
  end

  return table.concat(lines, "\n")
end


function obj:hideStats()
  if self.statsCanvas then
    self.statsCanvas:delete()
    self.statsCanvas = nil
  end
  if self.statsEscape then
    self.statsEscape:delete()
    self.statsEscape = nil
  end
end


--- Cherry:stats()
--- Method
--- Shows pomodoro statistics in an overlay on the current screen, or hides it if already shown.
--- Click the overlay or press Escape to dismiss it.
---
--- Parameters:
---  * None
---
--- Returns:
---  * None
function obj:stats()
  if self.statsCanvas then return self:hideStats() end
  local text = self:statsText()
  if not text then return end

  local styled = hs.styledtext.new(text, { font = self.statsFont, color = { white = 1 } })
  local padding = 24
  local canvas = hs.canvas.new({ x = 0, y = 0, w = 0, h = 0 })
  local size = canvas:minimumTextSize(styled)
  -- a little slack so the widest line never wraps
  local textW, textH = math.ceil(size.w) + 4, math.ceil(size.h)
  local w, h = textW + 2 * padding, textH + 2 * padding
  local screen = hs.screen.mainScreen():frame()
  canvas:frame({ x = screen.x + (screen.w - w) / 2, y = screen.y + (screen.h - h) / 2, w = w, h = h })
  canvas:appendElements(
    { type = "rectangle", action = "fill", fillColor = { white = 0, alpha = 0.85 },
      roundedRectRadii = { xRadius = 12, yRadius = 12 }, trackMouseUp = true },
    { type = "text", text = styled, frame = { x = padding, y = padding, w = textW, h = textH },
      trackMouseUp = true }
  )
  canvas:level(hs.canvas.windowLevels.modalPanel)
  -- show on whichever desktop is current, rather than switching desktops
  canvas:behaviorAsLabels({ "canJoinAllSpaces" })
  canvas:mouseCallback(function() self:hideStats() end)
  canvas:show()

  self.statsCanvas = canvas
  self.statsEscape = hs.hotkey.bind({}, "escape", function() self:hideStats() end)
end


-- Timer

function obj:stopTimer()
  if self.timer then
    self.timer:stop()
    self.timer = nil
  end
  self.timerRunning = false
end


function obj:reset()
  self:stopTimer()
  self.paused = false
  self.startedAt = nil
  local items = {
    { title = "Start", fn = function() self:start() end },
    { title = "Stats", fn = function() self:stats() end }
  }
  self.menu:setMenu(items)
  self.menu:setTitle("🍒")
  if not self.alwaysShow then
      self.menu:removeFromMenuBar()
  end
end


--- Cherry:stop()
--- Method
--- Stops the pomodoro in progress, logging it as abandoned if it ran for at least `minLogSeconds`
---
--- Parameters:
---  * None
---
--- Returns:
---  * None
function obj:stop()
  if self.startedAt and (self.plannedMinutes * 60 - self.timeLeft) >= self.minLogSeconds then
    self:record("abandoned")
  end
  self:reset()
end


function obj:updateTimerString()
    local minutes = math.floor(self.timeLeft / 60)
    local seconds = self.timeLeft - (minutes * 60)
    local timerString = string.format("%02d:%02d 🍒", minutes, seconds)
    self.menu:setTitle(timerString)
end


--- Cherry:popup()
--- Method
--- Popup an alert or notification when time is up.
---
--- Parameters:
---  * None
---
--- Returns:
---  * None
function obj:popup()
  if 0 < self.alertDuration then
    hs.alert.show("Done! 🍒", { textSize = self.alertTextSize }, self.alertDuration)
  end
  if self.notification then
    self.notification:send()
  end
  if self.sound then
    self.sound:play()
  end
end


function obj:tick()
  self.timeLeft = self.timeLeft - 1
  self:updateTimerString()
  if self.timeLeft <= 0 then
    self:record("completed")
    self:reset()
    self:popup()
  end
end


--- Cherry:start()
--- Method
--- Starts the timer and displays the countdown in a menubar item
---
--- Parameters:
---  * resume - boolean when true resumes countdown at current value of self.timeLeft
---
--- Returns:
---  * None
function obj:start(resume)
  if not self.menu:isInMenuBar() then
    self.menu:returnToMenuBar()
  end
  if not resume then
     self.startedAt = os.time()
     self.plannedMinutes = self.duration
     self.timeLeft = self.duration * 60
     self:updateTimerString()
  end
  -- only ever one countdown timer, however often start is called
  self:stopTimer()
  self.timerRunning = true
  self.paused = false
  self.timer = hs.timer.doEvery(1, function() self:tick() end)
  local items = {
    { title = "Stop",  fn = function() self:stop() end },
    { title = "Pause", fn = function() self:pause() end },
    { title = "Stats", fn = function() self:stats() end }
  }
  self.menu:setMenu(items)
end


function obj:pause()
  self:stopTimer()
  self.paused = true
  local items = {
    { title = "Stop", fn = function() self:stop() end },
    { title = "Resume", fn = function() self:start(true) end },
    { title = "Stats", fn = function() self:stats() end }
  }
  self.menu:setMenu(items)
end


--- Cherry:toggle()
--- Method
--- Starts a new timer, or pauses/resumes the one in progress
---
--- Parameters:
---  * None
---
--- Returns:
---  * None
function obj:toggle()
  if self.timerRunning then
    self:pause()
  elseif self.paused then
    self:start(true)
  else
    self:start()
  end
end


return obj
