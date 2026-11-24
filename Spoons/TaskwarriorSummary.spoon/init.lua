--- === TaskwarriorSummary ===
---
--- Desktop widget with taskwarrior's state for the active context: how many
--- tasks are overdue and due today, and the top tasks from the next report
--- with their due dates. Read-only: nothing is changed or synced.

local canvas = require("hs.canvas")
local task   = require("hs.task")
local summary = dofile(hs.spoons.resourcePath("summary.lua"))

local obj = {
    name    = "TaskwarriorSummary",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- TaskwarriorSummary.taskPath
--- Variable
--- Full path to the task binary (Hammerspoon does not inherit the shell PATH).
obj.taskPath = "/opt/homebrew/bin/task"

--- TaskwarriorSummary.refreshInterval
--- Variable
--- Seconds between refreshes. Polled rather than watching the database,
--- because reading it touches its files too.
obj.refreshInterval = 120

--- TaskwarriorSummary.limit
--- Variable
--- Number of tasks listed.
obj.limit = 5

--- TaskwarriorSummary.minWidth
--- Variable
--- Minimum width of the widget.
obj.minWidth = 260

--- TaskwarriorSummary.font / backgroundColor / borderColor / textColor / alertColor
--- Variable
--- Styling, matching the other desktop widgets.
obj.font = { name = "Menlo", boldName = "Menlo-Bold", size = 11 }
obj.backgroundColor = { hex = "#000000", alpha = 0.25 }
obj.borderColor = { hex = "#FFFFFF", alpha = 0.1 }
obj.textColor = { hex = "#FFFFFF" }
obj.alertColor = { hex = "#FF7878" }

--- TaskwarriorSummary.onClick
--- Variable
--- Function called when the widget is clicked, or nil.
obj.onClick = nil

--- TaskwarriorSummary.onLayout
--- Variable
--- Function called with the widget's frame each time it is drawn (its height
--- changes with the number of tasks), e.g. to place a widget below it; or nil.
obj.onLayout = nil

local padding = 10

-- per row style: colour, alpha, bold
local styles = {
    header     = { alpha = 0.45, bold = true },
    stats      = { alpha = 0.6 },
    statsAlert = { alert = true, alpha = 0.85 },
    late       = { alert = true, alpha = 0.8 },
    soon       = { alpha = 0.95 },
    normal     = { alpha = 0.7 },
    empty      = { alpha = 0.35 },
}

local function styledRows(rows)
    local out = hs.styledtext.new("")
    for i, row in ipairs(rows) do
        local s = styles[row.style] or styles.normal
        local base = s.alert and obj.alertColor or obj.textColor
        out = out .. hs.styledtext.new(row.text .. (i < #rows and "\n" or ""), {
            font = { name = s.bold and obj.font.boldName or obj.font.name, size = obj.font.size },
            color = { hex = base.hex, alpha = s.alpha },
        })
    end
    return out
end

function obj:_render()
    local rows
    if self._error then
        rows = { { text = "Tasks", style = "header" }, { text = self._error, style = "empty" } }
    elseif not self._tasks then
        rows = { { text = "Tasks", style = "header" }, { text = "loading…", style = "empty" } }
    else
        local t = os.date("*t")
        rows = summary.rows(self._tasks, {
            now = os.time(),
            todayEnd = os.time({ year = t.year, month = t.month, day = t.day + 1, hour = 0 }),
            tomorrowEnd = os.time({ year = t.year, month = t.month, day = t.day + 2, hour = 0 }),
            context = self._context,
            limit = self.limit,
        })
    end
    local text = styledRows(rows)
    local c = self.canvas
    local size = c:minimumTextSize(text)
    local w = math.max(self.minWidth, math.ceil(size.w) + 4 + 2 * padding)
    local h = math.ceil(size.h) + 2 * padding
    local anchor = self._topLeft or { x = 20, y = hs.screen.mainScreen():frame().y + 200 }
    c:frame({ x = anchor.x, y = anchor.y, w = w, h = h })
    c[2].frame = { x = padding, y = padding, w = w - 2 * padding, h = h - 2 * padding }
    c[2].text = text
    if self.onLayout then self.onLayout(c:frame()) end
end

-- Runs task with args; calls back with exit code and stdout. Only for small
-- outputs: hs.task can stall on large output, and garbles text that arrives
-- in pieces split inside a UTF-8 character.
local function runTask(args, callback)
    local t = task.new(obj.taskPath, function(code, stdout) callback(code, stdout or "") end, args)
    t:start()
    return t
end

-- Runs task with args, sending stdout to a temporary file, and calls back
-- with exit code and the file's contents: safe for large output.
local function runTaskToFile(args, callback)
    local out = os.tmpname()
    local shArgs = { "-c", 'out=$1; shift; exec "$@" > "$out"', "sh", out, obj.taskPath }
    for _, a in ipairs(args) do shArgs[#shArgs + 1] = a end
    local t = task.new("/bin/sh", function(code)
        local fh = io.open(out, "r")
        local data = fh and fh:read("a") or ""
        if fh then fh:close() end
        os.remove(out)
        callback(code, data)
    end, shArgs)
    t:start()
    return t
end

function obj:_fail(message)
    print("TaskwarriorSummary: " .. message)
    self._error = "task failed (see console)"
    self._busy = false
    if self.canvas then self:_render() end
end

--- TaskwarriorSummary:refresh()
--- Method
--- Re-reads the tasks and redraws the widget.
function obj:refresh()
    if self._busy then return self end
    self._busy = true
    -- `task export` ignores the context, so look up its read filter and apply it
    self._task = runTask({ "_get", "rc.context" }, function(code, out)
        if code ~= 0 then return self:_fail("task _get rc.context exited " .. code) end
        local context = out:gsub("%s+$", "")
        local function export(filter)
            local args = { "rc.gc=off", "rc.hooks=off", "rc.verbose=nothing" }
            for _, a in ipairs(filter) do args[#args + 1] = a end
            for _, a in ipairs({ "status:pending", "export", "next" }) do args[#args + 1] = a end
            self._task = runTaskToFile(args, function(code2, json)
                if code2 ~= 0 then return self:_fail("task export exited " .. code2) end
                local tasks = hs.json.decode(json ~= "" and json or "[]")
                if type(tasks) ~= "table" then return self:_fail("could not read task export output") end
                self._tasks, self._context, self._error, self._busy = tasks, context, nil, false
                if self.canvas then self:_render() end
            end)
        end
        if context == "" then return export({}) end
        self._task = runTask({ "_get", "rc.context." .. context .. ".read" }, function(code2, filter)
            if code2 ~= 0 then return self:_fail("task _get context filter exited " .. code2) end
            export(summary.contextFilter(filter))
        end)
    end)
    return self
end

--- TaskwarriorSummary:setTopLeft(point)
--- Method
--- Puts the widget's top-left corner at `point` ({x=, y=}).
function obj:setTopLeft(point)
    self._topLeft = point
    if self.canvas then self:_render() end
    return self
end

--- TaskwarriorSummary:start()
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
        self:refresh()
    end)
    self.canvas = c
    self:_render()
    c:show()

    self:refresh()
    self._timer = hs.timer.doEvery(self.refreshInterval, function() self:refresh() end)
    -- due labels ("today", "2d late") change at midnight even without edits
    self._midnight = hs.timer.doAt("00:00", "1d", function() self:_render() end)
    self._wake = hs.caffeinate.watcher.new(function(event)
        if event == hs.caffeinate.watcher.systemDidWake then self:refresh() end
    end):start()
    return self
end

--- TaskwarriorSummary:stop()
--- Method
--- Hides the widget and stops refreshing it.
function obj:stop()
    for _, k in ipairs({ "_timer", "_midnight", "_wake" }) do
        if self[k] then self[k]:stop(); self[k] = nil end
    end
    if self.canvas then self.canvas:delete(); self.canvas = nil end
    return self
end

--- TaskwarriorSummary:toggle()
--- Method
--- Shows the widget, or hides it if shown.
function obj:toggle()
    if self.canvas then return self:stop() end
    return self:start()
end

return obj
