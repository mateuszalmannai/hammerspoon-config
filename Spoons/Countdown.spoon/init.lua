--- === Countdown ===
---
--- Desktop widgets counting down to dates, in the style of TimeFlow: one per
--- countdown, stacked upwards from a corner, each with its topic and date,
--- the years, months and days left, the hours, minutes and seconds on top,
--- and optionally a bar showing how much of the way is done. Countdowns are
--- added, edited and removed from a list (Countdown:toggleChooser()) in the style of
--- the hotkey cheatsheet, and saved in a JSON file.

local countdown = dofile(hs.spoons.resourcePath("countdown.lua"))
local searchPanel = require("modules.searchPanel")
local promptPanel = require("modules.promptPanel")

local obj = {
    name    = "Countdown",
    version = "0.2",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- Countdown.file
--- Variable
--- JSON file the countdowns are saved in: a list of
--- { "topic": "…", "date": "YYYY-MM-DD" or "MM-DD" (every year),
---   "startDate": "YYYY-MM-DD" (optional, adds a progress bar) }.
obj.file = hs.configdir .. "/local/countdowns.json"

--- Countdown.gap
--- Variable
--- Space between stacked widgets.
obj.gap = 20

local W = 280

local function rel(v, total) return tostring(v / total) end

local function load(path)
    if not hs.fs.attributes(path) then return {} end
    local ok, data = pcall(hs.json.read, path)
    if not ok or type(data) ~= "table" then
        print("Countdown: can't read " .. path)
        return {}
    end
    return data
end

function obj:_save()
    hs.json.write(self.countdowns, self.file, true, true)
end

-- A canvas for one countdown; entry.startDate adds the progress bar.
local function build(entry)
    local withBar = countdown.parseDate(entry.startDate) ~= nil
    local H = withBar and 140 or 85
    local c = hs.canvas.new({ x = 0, y = 0, w = W, h = H })
    c:behavior(hs.canvas.windowBehaviors.canJoinAllSpaces)
    c:level(hs.canvas.windowLevels.desktopIcon)
    c[1] = {
        type = "rectangle", action = "fill",
        fillColor = { hex = "#000000", alpha = 0.2 },
        roundedRectRadii = { xRadius = 5, yRadius = 5 },
    }
    c[2] = {
        type = "text", text = "", textSize = 14, textColor = { hex = "#FFFFFF", alpha = 0.3 },
        textLineBreak = "truncateTail",
        frame = { x = rel(10, W), y = rel(10, H), w = rel(260, W), h = rel(25, H) },
    }
    c[3] = {
        type = "text", text = "", textSize = 17, textAlignment = "center",
        textColor = { hex = "#A6AAC3" },
        frame = { x = "0", y = rel(33, H), w = "1", h = rel(25, H) },
    }
    c[4] = {
        type = "text", text = "", textSize = 12, textAlignment = "center",
        textColor = { hex = "#A6AAC3", alpha = 0.7 },
        frame = { x = "0", y = rel(58, H), w = "1", h = rel(20, H) },
    }
    if withBar then
        local bar = { x = rel(20, W), y = rel(90, H), w = rel(240, W), h = rel(20, H) }
        -- same layers as TimeFlow: background image, light track, mask, gradient
        c[5] = {
            type = "image", image = hs.image.imageFromPath(hs.spoons.resourcePath("timebg.png")),
            frame = { x = rel(10, W), y = rel(80, H), w = rel(260, W), h = rel(50, H) },
        }
        c[6] = { type = "rectangle", action = "fill", fillColor = { hex = "#FFFFFF", alpha = 0.2 }, frame = bar }
        c[7] = { type = "rectangle", action = "fill", frame = { x = bar.x, y = bar.y, w = bar.w, h = bar.h } }
        c[8] = {
            type = "rectangle", action = "fill", frame = bar,
            fillGradient = "linear",
            fillGradientColors = {
                { hex = "#00A0F7" }, { hex = "#92D2E5" }, { hex = "#4BE581" },
                { hex = "#EAF25E" }, { hex = "#F4CA55" }, { hex = "#E04E4E" },
            },
            compositeRule = "sourceAtop",
        }
    end
    return c
end

function obj:_update()
    local now = os.time()
    for i, entry in ipairs(self.countdowns) do
        local c = self._canvases[i]
        local target = countdown.occurrence(entry.date, now)
        if c and target then
            c[2].text = (entry.topic or "") .. " · " .. os.date("%d.%m.%Y", target)
            c[3].text, c[4].text = countdown.lines(now, target)
            local start = countdown.parseDate(entry.startDate)
            if start then
                c[7].frame.w = tostring(240 / W * countdown.progress(now, start, target))
            end
        end
    end
end

-- Stacks the widgets upwards from the bottom-right anchor, the first
-- countdown at the bottom.
function obj:_layout()
    local a = self._bottomRight
    if not a then return end
    local y = a.y
    for _, c in ipairs(self._canvases) do
        local size = c:size()
        y = y - size.h
        c:topLeft({ x = a.x - size.w, y = y })
        y = y - self.gap
    end
end

-- (Re)creates the widgets from self.countdowns.
function obj:_rebuild()
    for _, c in ipairs(self._canvases or {}) do c:delete() end
    self._canvases = {}
    for _, entry in ipairs(self.countdowns) do
        if countdown.occurrence(entry.date, os.time()) then
            self._canvases[#self._canvases + 1] = build(entry)
        else
            print("Countdown: skipping " .. hs.inspect(entry) .. ", bad date")
        end
    end
    self:_layout()
    self:_update()
    for _, c in ipairs(self._canvases) do c:show() end
end

--- Countdown:setBottomRight(point)
--- Method
--- Places the stack of widgets with its bottom-right corner at point.
function obj:setBottomRight(point)
    self._bottomRight = point
    self:_layout()
end

--- Countdown:start()
--- Method
--- Loads the countdowns from Countdown.file, shows them and updates them
--- every second.
function obj:start()
    self._prompt = self._prompt or promptPanel.new()
    self._list = self._list or searchPanel.new({
        placeholder = "Countdowns",
        emptyText = "No matching countdowns",
        height = 300,
        onRun = function(item)
            if item.action == "add" then self:_edit()
            elseif item.action == "edit" then self:_edit(item.index)
            else self:_remove(item.index) end
        end,
    })
    self.countdowns = load(self.file)
    self:_rebuild()
    if self.timer then self.timer:stop() end
    self.timer = hs.timer.doEvery(1, function() self:_update() end)
    return self
end

local HINT_DATE = "DD.MM.YYYY, or DD.MM. for every year (e.g. 24.12.) · Enter adds · Esc cancels"

-- Asks for a topic, then a date. Adds a countdown, or with index i updates
-- that one (pre-filled with its topic and date; other fields such as
-- startDate are kept).
function obj:_edit(i)
    local entry = i and self.countdowns[i]
    self._prompt:ask({
        title = entry and "Edit countdown" or "New countdown",
        placeholder = "Topic, e.g. Days to Christmas",
        value = entry and entry.topic or "",
        hint = "Enter continues · Esc cancels",
        onSubmit = function(text)
            local topic = text:gsub("^%s+", ""):gsub("%s+$", "")
            if topic == "" then return "Type a topic first · Esc cancels" end
            self._prompt:ask({
                title = "Date for “" .. topic .. "”",
                placeholder = "24.12.",
                value = entry and countdown.formatInput(entry.date) or "",
                hint = entry and HINT_DATE:gsub("Enter adds", "Enter saves") or HINT_DATE,
                onSubmit = function(dateText)
                    local date, err = countdown.parseInput(dateText)
                    if not date then return err:sub(1, 1):upper() .. err:sub(2) .. " · Esc cancels" end
                    if entry then
                        entry.topic, entry.date = topic, date
                    else
                        table.insert(self.countdowns, { topic = topic, date = date })
                    end
                    self:_save()
                    self:_rebuild()
                end,
            })
        end,
    })
end

function obj:_remove(i)
    local entry = self.countdowns[i]
    self._prompt:ask({
        title = "Remove the countdown “" .. entry.topic .. "”?",
        hint = "Enter removes · Esc cancels",
        input = false,
        onSubmit = function()
            table.remove(self.countdowns, i)
            self:_save()
            self:_rebuild()
        end,
    })
end

--- Countdown:toggleChooser()
--- Method
--- Shows a list to add, edit or remove countdowns (or hides it), in the style
--- of the hotkey cheatsheet.
function obj:toggleChooser()
    if self._prompt:isVisible() then self._prompt:hide() return end
    if self._list:isVisible() then self._list:hide() return end
    local items = { { text = "Add countdown…", combo = "new", action = "add" } }
    local now = os.time()
    for i, entry in ipairs(self.countdowns) do
        local target = countdown.occurrence(entry.date, now)
        local when = target and os.date("%d.%m.%Y", target) or entry.date
        if entry.date and #entry.date == 5 then when = os.date("%d.%m.", target) .. " every year" end
        items[#items + 1] = { text = "Edit: " .. entry.topic, combo = when, action = "edit", index = i }
        items[#items + 1] = { text = "Remove: " .. entry.topic, combo = when, action = "remove", index = i }
    end
    self._list:show(items)
end

return obj
