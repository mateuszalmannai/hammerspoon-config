--- === RemindCalendar ===
---
--- Displays the ASCII calendar from `remind -c` on the desktop.
--- Refreshes when a reminder file changes, periodically, and on wake.

local canvas = require("hs.canvas")
local task   = require("hs.task")
local timer  = require("hs.timer")

local obj = {
    name    = "RemindCalendar",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- RemindCalendar.remindPath
--- Variable
--- Full path to the remind binary (Hammerspoon does not inherit the shell PATH).
obj.remindPath = "/opt/homebrew/bin/remind"

--- RemindCalendar.reminders
--- Variable
--- Reminder file or directory passed to remind.
obj.reminders = os.getenv("HOME") .. "/markdown/synched_reminders"

--- RemindCalendar.args
--- Variable
--- Calendar options for remind: -c+2 is two weeks, -c+ one week, -c a month; -m starts weeks on Monday.
obj.args = { "-c+2", "-m", "-w100" }

--- RemindCalendar.refreshInterval
--- Variable
--- Seconds between refreshes, so the calendar rolls over to the next day.
obj.refreshInterval = 600

--- RemindCalendar.location
--- Variable
--- Top-left corner of the widget, or "center" to centre it on the main screen.
obj.location = "center"

obj.backgroundColor  = { hex = "#000000", alpha = 0.25 }
obj.backgroundBorder = { hex = "#FFFFFF", alpha = 0.1 }
obj.textStyle = {
    font  = { name = "Menlo", size = 10 },
    color = { hex = "#FFFFFF", alpha = 0.6 },
}

local padding = 10

obj.canvas = canvas.new{}:behavior{ "canJoinAllSpaces" }:level(canvas.windowLevels.desktopIcon + 1)

local function render(text)
    -- remind wraps each cell in left-to-right marks (U+200E); they render as gaps in Menlo
    text = text:gsub("\u{200E}", ""):gsub("\n+$", "")
    local styled = hs.styledtext.new(text, obj.textStyle)
    local size = obj.canvas:minimumTextSize(styled)

    while #obj.canvas > 0 do obj.canvas:removeElement() end
    obj.canvas:appendElements{
        {
            type = "rectangle", action = "strokeAndFill",
            fillColor = obj.backgroundColor, strokeColor = obj.backgroundBorder,
            roundedRectRadii = { xRadius = 10, yRadius = 10 },
        },
        {
            type = "text", text = styled,
            frame = { x = padding, y = padding, w = size.w, h = size.h },
        },
    }
    local frame = { w = size.w + 2 * padding, h = size.h + 2 * padding }
    if obj.location == "center" then
        local f = hs.screen.mainScreen():frame()
        frame.x, frame.y = f.x + (f.w - frame.w) / 2, f.y + (f.h - frame.h) / 2
    else
        frame.x, frame.y = obj.location.x, obj.location.y
    end
    obj.canvas:frame(frame):show()
end

--- RemindCalendar:refresh()
--- Method
--- Re-runs remind and redraws the calendar.
function obj:refresh()
    if self._task and self._task:isRunning() then return self end
    local args = {}
    for _, a in ipairs(self.args) do table.insert(args, a) end
    table.insert(args, self.reminders)
    self._task = task.new(self.remindPath, function(code, stdout, stderr)
        if code == 0 then
            render(stdout)
        else
            print("RemindCalendar: remind exited " .. code .. ": " .. stderr)
        end
    end, args)
    self._task:start()
    return self
end

--- RemindCalendar:start()
--- Method
--- Shows the calendar and starts watching for changes.
function obj:start()
    self:refresh()
    self._timer = timer.doEvery(self.refreshInterval, function() self:refresh() end)
    self._watcher = hs.pathwatcher.new(self.reminders, function() self:refresh() end):start()
    self._caffeinate = hs.caffeinate.watcher.new(function(event)
        if event == hs.caffeinate.watcher.systemDidWake then self:refresh() end
    end):start()
    return self
end

--- RemindCalendar:stop()
--- Method
--- Hides the calendar and stops watching.
function obj:stop()
    if self._timer then self._timer:stop() end
    if self._watcher then self._watcher:stop() end
    if self._caffeinate then self._caffeinate:stop() end
    self.canvas:hide()
    return self
end

--- RemindCalendar:toggle()
--- Method
--- Shows or hides the calendar.
function obj:toggle()
    if self.canvas:isShowing() then self.canvas:hide() else self:refresh() end
    return self
end

return obj
