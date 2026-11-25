--- === PensionCountdown ===
---
--- Desktop widget counting down to a date (e.g. the start of a pension), in the
--- style of TimeFlow: years, months and days left, the hours, minutes and
--- seconds on top, and optionally a bar showing how much of the way is done.

local countdown = dofile(hs.spoons.resourcePath("countdown.lua"))

local obj = {
    name    = "PensionCountdown",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- PensionCountdown.targetDate
--- Variable
--- The date counted down to, "YYYY-MM-DD" (local midnight at its start).
--- Required.
obj.targetDate = nil

--- PensionCountdown.startDate
--- Variable
--- "YYYY-MM-DD" the progress bar counts from (e.g. the start of your working
--- life), or nil for no bar.
obj.startDate = nil

--- PensionCountdown.title
--- Variable
--- Heading; "%s" is replaced by the target date as DD.MM.YYYY.
obj.title = "Pension countdown · %s"

local W = 280

local function rel(v, total) return tostring(v / total) end

function obj:_build()
    local withBar = self._start ~= nil
    local H = withBar and 140 or 85
    self._height = H
    local c = hs.canvas.new({ x = 20, y = 400, w = W, h = H })
    c:behavior(hs.canvas.windowBehaviors.canJoinAllSpaces)
    c:level(hs.canvas.windowLevels.desktopIcon)
    c[1] = {
        type = "rectangle", action = "fill",
        fillColor = { hex = "#000000", alpha = 0.2 },
        roundedRectRadii = { xRadius = 5, yRadius = 5 },
    }
    c[2] = {
        type = "text",
        text = string.format(self.title, os.date("%d.%m.%Y", self._target)),
        textSize = 14, textColor = { hex = "#FFFFFF", alpha = 0.3 },
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
    self.canvas = c
end

function obj:_update()
    local now = os.time()
    local big, small = countdown.lines(countdown.remaining(now, self._target))
    local c = self.canvas
    c[3].text = big
    c[4].text = small
    if self._start then
        c[7].frame.w = tostring(240 / W * countdown.progress(now, self._start, self._target))
    end
end

--- PensionCountdown:start()
--- Method
--- Builds and shows the widget (after setting targetDate / startDate) and
--- updates it every second.
function obj:start()
    self._target = countdown.parseDate(self.targetDate)
    assert(self._target, "PensionCountdown.targetDate must be YYYY-MM-DD")
    self._start = self.startDate and countdown.parseDate(self.startDate)
    if self.canvas then self.canvas:delete() end
    self:_build()
    self:_update()
    self.canvas:show()
    if self.timer then self.timer:stop() end
    self.timer = hs.timer.doEvery(1, function() self:_update() end)
    return self
end

return obj
