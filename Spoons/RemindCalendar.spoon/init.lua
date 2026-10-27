--- === RemindCalendar ===
---
--- Shows the ASCII calendar from `remind -c` in a popup on the current screen.
--- remind is re-run each time the popup opens, so it is always up to date.
--- While the popup is open, 1 / 2 / m switch to the one-week, two-week and
--- month views; click the popup or press Escape to dismiss it.

local canvas = require("hs.canvas")
local task   = require("hs.task")

local obj = {
    name    = "RemindCalendar",
    version = "0.3",
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

--- RemindCalendar.views
--- Variable
--- Calendar options for remind per view: -c+1 is one week, -c+2 two weeks, -c a month;
--- -m starts weeks on Monday. `key` switches to the view while the popup is open.
obj.views = {
    week     = { key = "1", args = { "-c+1", "-m", "-w100" } },
    twoWeeks = { key = "2", args = { "-c+2", "-m", "-w100" } },
    month    = { key = "m", args = { "-c",   "-m", "-w160" } },
}

--- RemindCalendar.defaultView
--- Variable
--- View shown when no view is given to show() or toggle().
obj.defaultView = "week"

--- RemindCalendar.font
--- Variable
--- Font for the popup; must be monospaced so the calendar grid lines up.
obj.font = { name = "Menlo", size = 14 }

--- RemindCalendar.minFontSize
--- Variable
--- The font shrinks towards this size when a view is too big for the screen.
obj.minFontSize = 9

--- RemindCalendar.backgroundColor
--- Variable
--- Fill colour of the popup; lower the alpha to see more of what is behind it.
obj.backgroundColor = { white = 0, alpha = 0.6 }

local padding = 24
local screenMargin = 20

-- Styled text at the largest font size (down to minFontSize) that fits on the screen.
local function fitText(c, text, screen)
    local maxW = screen.w - 2 * (padding + screenMargin)
    local maxH = screen.h - 2 * (padding + screenMargin)
    local styled, size
    for fontSize = obj.font.size, obj.minFontSize, -1 do
        styled = hs.styledtext.new(text, {
            font = { name = obj.font.name, size = fontSize }, color = { white = 1 },
        })
        size = c:minimumTextSize(styled)
        if size.w <= maxW and size.h <= maxH then break end
    end
    return styled, size
end

local function render(text)
    -- remind wraps each cell in left-to-right marks (U+200E); they render as gaps in Menlo
    text = text:gsub("\u{200E}", ""):gsub("\n+$", "")
    local screen = hs.screen.mainScreen():frame()
    local c = canvas.new({ x = 0, y = 0, w = 0, h = 0 })
    local styled, size = fitText(c, text, screen)
    -- a little slack so the widest line never wraps
    local textW, textH = math.ceil(size.w) + 4, math.ceil(size.h)
    local w, h = textW + 2 * padding, textH + 2 * padding
    c:frame({ x = screen.x + (screen.w - w) / 2, y = screen.y + (screen.h - h) / 2, w = w, h = h })
    c:appendElements(
        { type = "rectangle", action = "fill", fillColor = obj.backgroundColor,
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
    -- popup-only keys: Escape closes, each view's key switches to it
    obj._keys = { hs.hotkey.bind({}, "escape", function() obj:hide() end) }
    for name, view in pairs(obj.views) do
        if view.key and name ~= obj.view then
            table.insert(obj._keys, hs.hotkey.bind({}, view.key, function() obj:show(name) end))
        end
    end
end

--- RemindCalendar:show([view])
--- Method
--- Runs remind and shows the calendar popup, replacing it if it is already open.
---
--- Parameters:
---  * view - name of a view in RemindCalendar.views (default: RemindCalendar.defaultView)
function obj:show(view)
    view = view or self.defaultView
    if not self.views[view] then
        print("RemindCalendar: unknown view " .. tostring(view))
        return self
    end
    if self._task and self._task:isRunning() then return self end
    local args = {}
    for _, a in ipairs(self.views[view].args) do table.insert(args, a) end
    table.insert(args, self.reminders)
    self._task = task.new(self.remindPath, function(code, stdout, stderr)
        if code == 0 then
            self:hide()
            self.view = view
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
    for _, key in ipairs(self._keys or {}) do key:delete() end
    self._keys = nil
    self.view = nil
    return self
end

--- RemindCalendar:toggle([view])
--- Method
--- Shows the calendar popup, or hides it if already open.
---
--- Parameters:
---  * view - name of a view in RemindCalendar.views (default: RemindCalendar.defaultView)
function obj:toggle(view)
    if self.canvas then return self:hide() end
    return self:show(view)
end

return obj
