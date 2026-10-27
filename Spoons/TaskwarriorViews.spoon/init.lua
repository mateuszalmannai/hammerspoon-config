--- === TaskwarriorViews ===
---
--- Shows taskwarrior reports (next, burndown, history, project summary) in a
--- popup on the current screen, in taskwarrior's own colours. task is re-run
--- each time a view opens, so it is always up to date, and it follows the active
--- context. While the popup is open, n / b / h / s switch views; click the popup
--- or press Escape to dismiss it. Read-only: nothing is changed or synced.

local canvas = require("hs.canvas")
local task   = require("hs.task")
local layout = require("modules.popupLayout")
local ansi   = dofile(hs.spoons.resourcePath("ansi.lua"))

local obj = {
    name    = "TaskwarriorViews",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- TaskwarriorViews.taskPath
--- Variable
--- Full path to the task binary (Hammerspoon does not inherit the shell PATH).
obj.taskPath = "/opt/homebrew/bin/task"

--- TaskwarriorViews.width
--- Variable
--- Columns taskwarrior lays its reports out in (it has no terminal to measure).
obj.width = 120

--- TaskwarriorViews.views
--- Variable
--- The views, in the order the header lists them. `args` are the task command
--- and filter; `key` switches to the view while the popup is open. Change
--- burndown.weekly / ghistory.monthly here for another time scale.
obj.views = {
    { name = "next",     key = "n", args = { "next", "limit:25" } },
    { name = "burndown", key = "b", args = { "burndown.weekly" } },
    { name = "history",  key = "h", args = { "ghistory.monthly" } },
    { name = "summary",  key = "s", args = { "summary" } },
}

--- TaskwarriorViews.defaultView
--- Variable
--- View shown when no view is given to show() or toggle().
obj.defaultView = "next"

--- TaskwarriorViews.font
--- Variable
--- Font for the popup; must be monospaced so tables and charts line up.
obj.font = { name = "Menlo", boldName = "Menlo-Bold", size = 14 }

--- TaskwarriorViews.minFontSize
--- Variable
--- The font shrinks towards this size when a view is too big for the screen.
obj.minFontSize = 9

--- TaskwarriorViews.backgroundColor
--- Variable
--- Fill colour of the popup; lower the alpha to see more of what is behind it.
obj.backgroundColor = { white = 0, alpha = 0.85 }

local padding = 24
local screenMargin = 20
local textColor = { white = 1 }
local dimColor = { white = 1, alpha = 0.5 }

local function findView(name)
    for _, view in ipairs(obj.views) do
        if view.name == name then return view end
    end
end

-- "next · context: work      n next  b burndown  h history  s summary", with
-- the current view's key highlighted
local function headerSegments(viewName, context)
    local segments = {
        { text = viewName, bold = true },
        { text = " · context: " .. (context ~= "" and context or "none"), dim = true },
        { text = "      " },
    }
    for i, view in ipairs(obj.views) do
        local current = view.name == viewName
        segments[#segments + 1] = { text = view.key, bold = true, dim = not current }
        segments[#segments + 1] = { text = " " .. view.name .. (i < #obj.views and "  " or ""), dim = not current }
    end
    segments[#segments + 1] = { text = "\n\n" }
    return segments
end

-- Segments (header ones and ansi.parse ones) as styled text at fontSize
local function styled(segments, fontSize)
    local out = hs.styledtext.new("")
    for _, s in ipairs(segments) do
        local attrs = {
            font = { name = s.bold and obj.font.boldName or obj.font.name, size = fontSize },
            color = s.fg and ansi.rgb(s.fg) or (s.dim and dimColor or textColor),
        }
        if s.bg then attrs.backgroundColor = ansi.rgb(s.bg) end
        if s.underline then attrs.underlineStyle = hs.styledtext.lineStyles.single end
        out = out .. hs.styledtext.new(s.text, attrs)
    end
    return out
end

local function render(segments)
    local screen = hs.screen.mainScreen():frame()
    local c = canvas.new({ x = 0, y = 0, w = 0, h = 0 })
    -- the largest font size (down to minFontSize) at which the popup fits on the screen
    local fontSize, size = layout.fitFontSize(
        function(fs) return c:minimumTextSize(styled(segments, fs)) end,
        screen.w - 2 * (padding + screenMargin), screen.h - 2 * (padding + screenMargin),
        obj.font.size, obj.minFontSize)
    -- a little slack so the widest line never wraps
    local textW, textH = math.ceil(size.w) + 4, math.ceil(size.h)
    local w, h = textW + 2 * padding, textH + 2 * padding
    c:frame({ x = screen.x + (screen.w - w) / 2, y = screen.y + (screen.h - h) / 2, w = w, h = h })
    c:appendElements(
        { type = "rectangle", action = "fill", fillColor = obj.backgroundColor,
          roundedRectRadii = { xRadius = 12, yRadius = 12 }, trackMouseUp = true },
        { type = "text", text = styled(segments, fontSize),
          frame = { x = padding, y = padding, w = textW, h = textH }, trackMouseUp = true }
    )
    c:level(canvas.windowLevels.modalPanel)
    -- show on whichever desktop is current, rather than switching desktops
    c:behaviorAsLabels({ "canJoinAllSpaces" })
    c:mouseCallback(function() obj:hide() end)
    c:show()

    obj.canvas = c
    -- popup-only keys: Escape closes, each view's key switches to it
    obj._keys = { hs.hotkey.bind({}, "escape", function() obj:hide() end) }
    for _, view in ipairs(obj.views) do
        if view.name ~= obj.view then
            table.insert(obj._keys, hs.hotkey.bind({}, view.key, function() obj:show(view.name) end))
        end
    end
end

-- Runs task with args and calls back with exit code, stdout and stderr
local function runTask(args, callback)
    obj._task = task.new(obj.taskPath, callback, args)
    obj._task:start()
end

--- TaskwarriorViews:show([view])
--- Method
--- Runs taskwarrior and shows the view in the popup, replacing it if it is already open.
---
--- Parameters:
---  * view - name of a view in TaskwarriorViews.views (default: TaskwarriorViews.defaultView)
function obj:show(viewName)
    viewName = viewName or self.defaultView
    local view = findView(viewName)
    if not view then
        print("TaskwarriorViews: unknown view " .. tostring(viewName))
        return self
    end
    if self._task and self._task:isRunning() then return self end
    runTask({ "_get", "rc.context" }, function(_, contextOut)
        local context = contextOut:gsub("%s+$", "")
        local args = { "rc._forcecolor=on", "rc.verbose=label", "rc.defaultwidth=" .. self.width }
        for _, a in ipairs(view.args) do table.insert(args, a) end
        runTask(args, function(code, stdout, stderr)
            local body
            if stdout:match("%S") then
                body = ansi.parse((stdout:gsub("[\r\n%s]+$", "")))
            elseif code == 1 then
                -- task exits 1 with no output when nothing matches
                body = { { text = "No tasks to show in this context.\nIf that's unexpected, run `task sync` in a terminal.", dim = true } }
            else
                print("TaskwarriorViews: task exited " .. code .. ": " .. stderr)
                body = { { text = "task exited " .. code .. ":\n" .. stderr:gsub("%s+$", "") } }
            end
            local segments = headerSegments(view.name, context)
            for _, s in ipairs(body) do table.insert(segments, s) end
            self:hide()
            self.view = view.name
            render(segments)
        end)
    end)
    return self
end

--- TaskwarriorViews:hide()
--- Method
--- Closes the popup.
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

--- TaskwarriorViews:toggle([view])
--- Method
--- Shows the popup, or hides it if already open.
---
--- Parameters:
---  * view - name of a view in TaskwarriorViews.views (default: TaskwarriorViews.defaultView)
function obj:toggle(viewName)
    if self.canvas then return self:hide() end
    return self:show(viewName)
end

return obj
