--- === RemindCalendar ===
---
--- Shows the ASCII calendar from `remind -c` in a popup on the current screen.
--- remind is re-run each time the popup opens, so it is always up to date.
--- Click the popup or press Escape to dismiss it.

local canvas = require("hs.canvas")
local task   = require("hs.task")

local obj = {
    name    = "RemindCalendar",
    version = "0.2",
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

--- RemindCalendar.font
--- Variable
--- Font for the popup; must be monospaced so the calendar grid lines up.
obj.font = { name = "Menlo", size = 14 }

local padding = 24

local function render(text)
    -- remind wraps each cell in left-to-right marks (U+200E); they render as gaps in Menlo
    text = text:gsub("\u{200E}", ""):gsub("\n+$", "")
    local styled = hs.styledtext.new(text, { font = obj.font, color = { white = 1 } })
    local c = canvas.new({ x = 0, y = 0, w = 0, h = 0 })
    local size = c:minimumTextSize(styled)
    -- a little slack so the widest line never wraps
    local textW, textH = math.ceil(size.w) + 4, math.ceil(size.h)
    local w, h = textW + 2 * padding, textH + 2 * padding
    local screen = hs.screen.mainScreen():frame()
    c:frame({ x = screen.x + (screen.w - w) / 2, y = screen.y + (screen.h - h) / 2, w = w, h = h })
    c:appendElements(
        { type = "rectangle", action = "fill", fillColor = { white = 0, alpha = 0.85 },
          roundedRectRadii = { xRadius = 12, yRadius = 12 }, trackMouseUp = true },
        { type = "text", text = styled, frame = { x = padding, y = padding, w = textW, h = textH },
          trackMouseUp = true }
    )
    c:level(canvas.windowLevels.modalPanel)
    -- show on whichever desktop is current, rather than switching desktops
    c:behaviorAsLabels({ "canJoinAllSpaces" })
    c:mouseCallback(function() obj:hide() end)
    c:show()

    obj.canvas = c
    obj._escape = hs.hotkey.bind({}, "escape", function() obj:hide() end)
end

--- RemindCalendar:show()
--- Method
--- Runs remind and shows the calendar popup.
function obj:show()
    if self.canvas or (self._task and self._task:isRunning()) then return self end
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

--- RemindCalendar:hide()
--- Method
--- Closes the calendar popup.
function obj:hide()
    if self.canvas then
        self.canvas:delete()
        self.canvas = nil
    end
    if self._escape then
        self._escape:delete()
        self._escape = nil
    end
    return self
end

--- RemindCalendar:toggle()
--- Method
--- Shows or hides the calendar popup.
function obj:toggle()
    if self.canvas then return self:hide() end
    return self:show()
end

return obj
