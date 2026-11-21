--- === RemindAgenda ===
---
--- Desktop widget listing today's and tomorrow's reminders from remind, with
--- past events dimmed, the current one marked and a countdown to the next.
--- remind is re-run every few minutes and whenever a reminder file changes;
--- the rows are redrawn every minute so the countdown stays current.

local canvas = require("hs.canvas")
local task   = require("hs.task")
local agenda = dofile(hs.spoons.resourcePath("agenda.lua"))

local obj = {
    name    = "RemindAgenda",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- RemindAgenda.remindPath
--- Variable
--- Full path to the remind binary (Hammerspoon does not inherit the shell PATH).
obj.remindPath = "/opt/homebrew/bin/remind"

--- RemindAgenda.reminders
--- Variable
--- Reminder file or directory passed to remind.
obj.reminders = os.getenv("HOME") .. "/markdown/synched_reminders"

--- RemindAgenda.refreshInterval
--- Variable
--- Seconds between remind runs (file changes also trigger a run).
obj.refreshInterval = 600

--- RemindAgenda.maxPerDay
--- Variable
--- Events listed per day before the rest are summed up as "+N more".
obj.maxPerDay = 8

--- RemindAgenda.minWidth
--- Variable
--- The widget is at least this wide, so it doesn't jump around as text changes.
obj.minWidth = 260

--- RemindAgenda.font / backgroundColor / borderColor / textColor
--- Variable
--- Styling, matching the other desktop widgets.
obj.font = { name = "Menlo", boldName = "Menlo-Bold", size = 11 }
obj.backgroundColor = { hex = "#000000", alpha = 0.25 }
obj.borderColor = { hex = "#FFFFFF", alpha = 0.1 }
obj.textColor = { hex = "#FFFFFF", alpha = 0.6 }

--- RemindAgenda.onClick
--- Variable
--- Function called when the widget is clicked, or nil.
obj.onClick = nil

local padding = 10

-- per row style: alpha of the text colour, and whether it's bold
local styles = {
    header = { alpha = 0.45, bold = true },
    past   = { alpha = 0.3 },
    now    = { alpha = 0.95, bold = true },
    next   = { alpha = 0.95 },
    normal = { alpha = 0.7 },
    empty  = { alpha = 0.35 },
}

local function styledRows(rows)
    local out = hs.styledtext.new("")
    for i, row in ipairs(rows) do
        local s = styles[row.style] or styles.normal
        -- a blank line before each day heading except the first
        local prefix = (row.style == "header" and i > 1) and "\n" or ""
        local color = { hex = obj.textColor.hex, alpha = s.alpha }
        out = out .. hs.styledtext.new(prefix .. row.text .. (i < #rows and "\n" or ""), {
            font = { name = s.bold and obj.font.boldName or obj.font.name, size = obj.font.size },
            color = color,
        })
    end
    return out
end

function obj:_render()
    local rows
    if self._error then
        rows = { { text = "Agenda", style = "header" }, { text = self._error, style = "empty" } }
    else
        rows = agenda.rows(self._events or {}, os.date("*t"), self.maxPerDay)
    end
    local text = styledRows(rows)
    local c = self.canvas
    local size = c:minimumTextSize(text)
    local w = math.max(self.minWidth, math.ceil(size.w) + 4 + 2 * padding)
    local h = math.ceil(size.h) + 2 * padding
    local anchor = self._topLeft or { x = 20, y = hs.screen.mainScreen():frame().y + 20 }
    c:frame({ x = anchor.x, y = anchor.y, w = w, h = h })
    c[2].frame = { x = padding, y = padding, w = w - 2 * padding, h = h - 2 * padding }
    c[2].text = text
end

--- RemindAgenda:refresh()
--- Method
--- Re-runs remind and redraws the widget.
function obj:refresh()
    if self._task and self._task:isRunning() then return self end
    -- -s+2: simple-calendar format for this week and next, which always holds
    -- today and tomorrow; -b1: 24-hour times
    self._task = task.new(self.remindPath, function(code, stdout, stderr)
        if code == 0 then
            self._events = agenda.parse(stdout)
            self._error = nil
        else
            print("RemindAgenda: remind exited " .. code .. ": " .. stderr)
            self._error = "remind failed (see console)"
        end
        if self.canvas then self:_render() end
    end, { "-s+2", "-b1", self.reminders })
    if not self._task:start() then
        self._error = "could not run " .. self.remindPath
        if self.canvas then self:_render() end
    end
    return self
end

--- RemindAgenda:setTopLeft(point)
--- Method
--- Puts the widget's top-left corner at `point` ({x=, y=}); it grows
--- downwards as the number of events changes.
function obj:setTopLeft(point)
    self._topLeft = point
    if self.canvas then self:_render() end
    return self
end

--- RemindAgenda:start()
--- Method
--- Shows the widget and starts refreshing it.
function obj:start()
    if self.canvas then return self end
    local c = canvas.new({ x = 0, y = 0, w = self.minWidth, h = 50 })
    c:behaviorAsLabels({ "canJoinAllSpaces" })
    c:level(canvas.windowLevels.desktopIcon + 1)
    c[1] = { type = "rectangle", action = "strokeAndFill", fillColor = self.backgroundColor,
             strokeColor = self.borderColor, strokeWidth = 1,
             roundedRectRadii = { xRadius = 10, yRadius = 10 }, trackMouseUp = true }
    c[2] = { type = "text", text = "", trackMouseUp = true }
    c:mouseCallback(function()
        if self.onClick then self.onClick() end
    end)
    self.canvas = c
    self:_render()
    c:show()

    self:refresh()
    self._refreshTimer = hs.timer.doEvery(self.refreshInterval, function() self:refresh() end)
    -- redraw on each minute boundary so the countdown and past/now marks move on
    self._minuteTimer = hs.timer.doAt(
        os.date("%H:%M", os.time() + 60), "1m", function() self:_render() end)
    -- reminder files change when they sync; wait a moment so a burst of
    -- writes causes one run
    self._delayed = hs.timer.delayed.new(2, function() self:refresh() end)
    self._watcher = hs.pathwatcher.new(self.reminders, function() self._delayed:start() end):start()
    -- after sleep the day may have changed and timers may have been paused
    self._wake = hs.caffeinate.watcher.new(function(event)
        if event == hs.caffeinate.watcher.systemDidWake then self:refresh() end
    end):start()
    return self
end

--- RemindAgenda:stop()
--- Method
--- Hides the widget and stops refreshing it.
function obj:stop()
    for _, k in ipairs({ "_refreshTimer", "_minuteTimer", "_delayed", "_watcher", "_wake" }) do
        if self[k] then self[k]:stop(); self[k] = nil end
    end
    if self.canvas then self.canvas:delete(); self.canvas = nil end
    return self
end

--- RemindAgenda:toggle()
--- Method
--- Shows the widget, or hides it if shown.
function obj:toggle()
    if self.canvas then return self:stop() end
    return self:start()
end

return obj
