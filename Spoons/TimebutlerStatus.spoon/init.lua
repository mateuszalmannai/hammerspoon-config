--- === TimebutlerStatus ===
---
--- Desktop widget with the Timebutler clock (running, paused or stopped),
--- today's worked time against the daily target and the vacation days left,
--- read through `util tb ... --json`. Also the clock actions (start, pause,
--- resume, stop) and text views (balance, recent entries) for hotkeys.

local canvas = require("hs.canvas")
local task   = require("hs.task")
local status = dofile(hs.spoons.resourcePath("status.lua"))

local obj = {
    name    = "TimebutlerStatus",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- TimebutlerStatus.utilPath
--- Variable
--- Full path to the `util` binary that has the `tb` command.
obj.utilPath = os.getenv("HOME") .. "/bin/util"

--- TimebutlerStatus.path
--- Variable
--- PATH for `util`: Hammerspoon does not inherit the shell PATH, and `util tb`
--- reads the API token through `secret` (in ~/.local/bin).
obj.path = os.getenv("HOME") .. "/.local/bin:" .. os.getenv("HOME") .. "/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

--- TimebutlerStatus.refreshInterval / balanceInterval
--- Variable
--- Seconds between reading the clock, and between reading the vacation
--- balance. In between, a running clock keeps counting locally.
obj.refreshInterval = 120
obj.balanceInterval = 3600

--- TimebutlerStatus.minWidth / barHeight
--- Variable
--- Minimum width of the widget, and height of today's progress bar.
obj.minWidth = 200
obj.barHeight = 12

--- TimebutlerStatus.barColors
--- Variable
--- Gradient of the progress bar, the same as TimeFlow's year bar.
obj.barColors = {
    { hex = "#00A0F7" }, { hex = "#92D2E5" }, { hex = "#4BE581" },
    { hex = "#EAF25E" }, { hex = "#F4CA55" }, { hex = "#E04E4E" },
}

--- TimebutlerStatus.font / backgroundColor / borderColor / textColor / stateColors
--- Variable
--- Styling, matching the other desktop widgets.
obj.font = { name = "Menlo", boldName = "Menlo-Bold", size = 11 }
obj.backgroundColor = { hex = "#000000", alpha = 0.25 }
obj.borderColor = { hex = "#FFFFFF", alpha = 0.1 }
obj.textColor = { hex = "#FFFFFF", alpha = 0.7 }
obj.stateColors = {
    running = { hex = "#5FD068", alpha = 0.9 },
    paused  = { hex = "#FFB347", alpha = 0.9 },
    stopped = { hex = "#FFFFFF", alpha = 0.3 },
    error   = { hex = "#FF7878", alpha = 0.9 },
}

--- TimebutlerStatus.onClick
--- Variable
--- Function called when the widget is clicked. Defaults to starting, pausing
--- or resuming the clock, whichever fits its state; nil to do nothing.
obj.onClick = function() obj:toggleClock() end

--- TimebutlerStatus.onLayout
--- Variable
--- Function called with the widget's frame each time it is drawn, or nil.
obj.onLayout = nil

local padding = 10
obj._running = {}

local function styled(text, color, bold)
    return hs.styledtext.new(text, {
        font = { name = bold and obj.font.boldName or obj.font.name, size = obj.font.size },
        color = color,
    })
end

-- Canvas element 1 is the background; the rest is rebuilt on each draw: a
-- text block for each run of text rows, and three layers for each bar row (as
-- in TimeFlow: a light track; a mask as wide as the part done; the gradient
-- over the full width, composited "sourceAtop" so it is bright over the mask
-- and faint over the track).
local barGap = 6

function obj:_styledRow(row, first)
    local nl = first and "" or "\n"
    local s = row.style
    if s == "header" then
        return styled(nl .. row.text, { hex = "#FFFFFF", alpha = 0.45 }, true)
    elseif self.stateColors[s] then
        return styled(nl .. "● ", self.stateColors[s])
            .. styled(row.text, s == "error" and self.stateColors.error or self.textColor)
    end
    return styled(nl .. row.text, { hex = self.textColor.hex, alpha = s == "dim" and 0.45 or self.textColor.alpha })
end

function obj:_render()
    local rows = status.rows(self._data, self._balance, {
        now = os.time(), fetchedAt = self._fetchedAt, error = self._error,
    })
    -- group the rows into text blocks separated by bars
    local blocks, current = {}, nil
    for _, row in ipairs(rows) do
        if row.style == "bar" then
            blocks[#blocks + 1] = { bar = row.fraction }
            current = nil
        else
            if not current then
                current = { text = hs.styledtext.new(""), first = true }
                blocks[#blocks + 1] = current
            end
            current.text = current.text .. self:_styledRow(row, current.first)
            current.first = false
        end
    end

    local c = self.canvas
    local textW = 0
    for _, block in ipairs(blocks) do
        if block.text then
            block.size = c:minimumTextSize(block.text)
            textW = math.max(textW, block.size.w)
        end
    end
    local w = math.max(self.minWidth, math.ceil(textW) + 4 + 2 * padding)
    local inner = w - 2 * padding

    while #c > 1 do c:removeElement(#c) end
    local y = padding
    for i, block in ipairs(blocks) do
        if block.text then
            local h = math.ceil(block.size.h)
            c:appendElements({ type = "text", text = block.text, trackMouseUp = true,
                               frame = { x = padding, y = y, w = inner, h = h } })
            y = y + h
        else
            local bar = { x = padding, y = y + barGap, w = inner, h = self.barHeight }
            c:appendElements(
                { type = "rectangle", action = "fill", fillColor = { hex = "#FFFFFF", alpha = 0.2 },
                  frame = bar, trackMouseUp = true },
                { type = "rectangle", action = "fill", trackMouseUp = true,
                  frame = { x = bar.x, y = bar.y, w = bar.w * block.bar, h = bar.h } },
                { type = "rectangle", action = "fill", fillGradient = "linear",
                  fillGradientColors = self.barColors, compositeRule = "sourceAtop",
                  frame = bar, trackMouseUp = true })
            y = bar.y + bar.h + (i < #blocks and barGap or 0)
        end
    end

    local anchor = self._topLeft or { x = 20, y = hs.screen.mainScreen():frame().y + 20 }
    c:frame({ x = anchor.x, y = anchor.y, w = w, h = y + padding })
    if self.onLayout then self.onLayout(c:frame()) end
end

-- Runs `util tb <args>` and calls back with exit code and stdout+stderr.
-- Stdin is closed, so a question util would ask reads end-of-input instead
-- of waiting forever.
function obj:_tb(args, callback)
    local full = { "tb" }
    for _, a in ipairs(args) do full[#full + 1] = a end
    local t
    t = task.new(self.utilPath, function(code, out, err)
        self._running[t] = nil
        callback(code, (out or "") .. (err or ""))
    end, full)
    t:setEnvironment({
        HOME = os.getenv("HOME"), USER = os.getenv("USER"), TMPDIR = os.getenv("TMPDIR"),
        LANG = "en_US.UTF-8", PATH = self.path,
    })
    -- keep a reference until it exits, so it isn't garbage-collected
    self._running[t] = true
    t:start()
    t:closeInput()
    return t
end

local function firstLine(s)
    return (s or ""):match("^%s*([^\n]*)") or ""
end

--- TimebutlerStatus:refresh([withBalance])
--- Method
--- Re-reads the clock (and the vacation balance when `withBalance` is true or
--- it hasn't been read yet) and redraws the widget.
function obj:refresh(withBalance)
    if self._busy then return self end
    self._busy = true
    self:_tb({ "status", "--json" }, function(code, out)
        self._busy = false
        local data = code == 0 and hs.json.decode(out) or nil
        if type(data) ~= "table" then
            print("TimebutlerStatus: util tb status exited " .. code .. ": " .. out)
            self._error = "util tb failed (see console)"
        else
            self._data, self._fetchedAt, self._error = data, os.time(), nil
        end
        if self.canvas then self:_render() end
    end)
    if withBalance or not self._balance then
        self:_tb({ "balance", "--json" }, function(code, out)
            local data = code == 0 and hs.json.decode(out) or nil
            if type(data) == "table" then
                self._balance = data
                if self.canvas then self:_render() end
            else
                print("TimebutlerStatus: util tb balance exited " .. code .. ": " .. out)
            end
        end)
    end
    return self
end

-- Runs a clock command with --yes, shows its first line and refreshes.
function obj:_clock(command)
    self:_tb({ command, "--yes" }, function(code, out)
        if code ~= 0 then print("TimebutlerStatus: util tb " .. command .. " exited " .. code .. ": " .. out) end
        hs.alert.show("Timebutler: " .. (firstLine(out) ~= "" and firstLine(out) or command .. (code == 0 and " done" or " failed")))
        self:refresh()
    end)
    return self
end

--- TimebutlerStatus:startClock() / pauseClock() / resumeClock()
--- Method
--- Start, pause or resume the Timebutler clock.
function obj:startClock() return self:_clock("start") end
function obj:pauseClock() return self:_clock("pause") end
function obj:resumeClock() return self:_clock("resume") end

--- TimebutlerStatus:toggleClock()
--- Method
--- Starts, pauses or resumes the clock depending on its last known state.
function obj:toggleClock()
    return self:_clock(status.clickAction(status.state(self._data)))
end

--- TimebutlerStatus:stopClock()
--- Method
--- Asks, then stops the clock and saves the session as a time entry. When the
--- session breaks the company's break rule, shows Timebutler's correction and
--- asks whether to apply or ignore it (or keep the clock running).
function obj:stopClock()
    local worked = status.duration(status.workedSeconds(self._data, self._fetchedAt, os.time()))
    hs.focus()
    local answer = hs.dialog.blockAlert("Stop the Timebutler clock?",
        "The session is saved as a time entry (today so far: " .. worked .. ").", "Stop", "Cancel")
    if answer ~= "Stop" then return self end

    local function stop(extra)
        local args = { "stop", "--yes" }
        for _, a in ipairs(extra or {}) do args[#args + 1] = a end
        self:_tb(args, function(code, out)
            if status.needsBreakDecision(out) and not extra then
                hs.focus()
                local choice = hs.dialog.blockAlert("Timebutler: break rule", status.withoutPrompt(out),
                    "Apply correction", "Keep running", "informational")
                -- blockAlert has two buttons, so "ignore" is asked separately
                if choice == "Apply correction" then return stop({ "--break", "apply" }) end
                local ignore = hs.dialog.blockAlert("Save without the correction?",
                    "Saves the session as it is, ignoring the break rule.", "Keep running", "Ignore and save")
                if ignore == "Ignore and save" then return stop({ "--break", "ignore" }) end
                hs.alert.show("Timebutler: clock keeps running")
                return self:refresh()
            end
            if code ~= 0 then print("TimebutlerStatus: util tb stop exited " .. code .. ": " .. out) end
            hs.alert.show("Timebutler: " .. (firstLine(out) ~= "" and firstLine(out) or "stop " .. (code == 0 and "done" or "failed")))
            self:refresh()
        end)
    end
    stop()
    return self
end

local textAlertStyle = { textFont = "Menlo", textSize = 13 }

--- TimebutlerStatus:showBalance()
--- Method
--- Shows vacation and sick days this year in an alert.
function obj:showBalance()
    self:_tb({ "balance" }, function(_, out)
        hs.alert.show((out:gsub("%s+$", "")), textAlertStyle, 6)
    end)
    return self
end

--- TimebutlerStatus:showEntries()
--- Method
--- Shows this month's last time entries and the month's total in an alert.
function obj:showEntries()
    self:_tb({ "entries" }, function(code, out)
        hs.alert.show(code == 0 and status.recentEntries(out, 5) or (out:gsub("%s+$", "")), textAlertStyle, 8)
    end)
    return self
end

--- TimebutlerStatus:setTopLeft(point)
--- Method
--- Puts the widget's top-left corner at `point` ({x=, y=}).
function obj:setTopLeft(point)
    self._topLeft = point
    if self.canvas then self:_render() end
    return self
end

--- TimebutlerStatus:start()
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
    c:mouseCallback(function()
        if self.onClick then self.onClick() end
    end)
    self.canvas = c
    self:_render()
    c:show()

    self:refresh(true)
    self._timer = hs.timer.doEvery(self.refreshInterval, function() self:refresh() end)
    self._balanceTimer = hs.timer.doEvery(self.balanceInterval, function() self:refresh(true) end)
    -- a running clock's worked time and a paused one's break tick on
    -- between API calls
    self._tick = hs.timer.doEvery(30, function()
        if status.state(self._data) ~= "stopped" then self:_render() end
    end)
    self._wake = hs.caffeinate.watcher.new(function(event)
        if event == hs.caffeinate.watcher.systemDidWake then self:refresh(true) end
    end):start()
    return self
end

--- TimebutlerStatus:stop()
--- Method
--- Hides the widget and stops refreshing it.
function obj:stop()
    for _, k in ipairs({ "_timer", "_balanceTimer", "_tick", "_wake" }) do
        if self[k] then self[k]:stop(); self[k] = nil end
    end
    if self.canvas then self.canvas:delete(); self.canvas = nil end
    return self
end

--- TimebutlerStatus:toggle()
--- Method
--- Shows the widget, or hides it if shown.
function obj:toggle()
    if self.canvas then return self:stop() end
    return self:start()
end

return obj
