-- Plain-Lua date arithmetic for the PensionCountdown widget (tested in
-- spec/pension_countdown_spec.lua). Works in local time, so a countdown
-- across a DST change still counts calendar days, not 24-hour blocks.

local M = {}

local function daysInMonth(year, month)
  return os.date("*t", os.time({ year = year, month = month + 1, day = 0, hour = 12 })).day
end

-- `t` (epoch seconds) moved by `months` calendar months at the same local
-- time; the day is clamped to the month's length (31 Jan + 1 month = 28/29 Feb).
local function addMonths(t, months)
  local d = os.date("*t", t)
  local m0 = d.month - 1 + months
  local year, month = d.year + m0 // 12, m0 % 12 + 1
  return os.time({ year = year, month = month, day = math.min(d.day, daysInMonth(year, month)),
                   hour = d.hour, min = d.min, sec = d.sec })
end

-- `t` moved by `days` calendar days at the same local time.
local function addDays(t, days)
  local d = os.date("*t", t)
  return os.time({ year = d.year, month = d.month, day = d.day + days,
                   hour = d.hour, min = d.min, sec = d.sec })
end

-- Epoch seconds for local midnight at the start of "YYYY-MM-DD", or nil.
function M.parseDate(s)
  local y, m, d = (s or ""):match("^(%d%d%d%d)-(%d%d)-(%d%d)$")
  if not y then return nil end
  return os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d), hour = 0, min = 0, sec = 0 })
end

-- Time left from `now` until `target`, as calendar years, months and days
-- plus hours, minutes and seconds, and the total number of whole days.
-- `done` is true (and everything 0) once the target has passed.
function M.remaining(now, target)
  local r = { years = 0, months = 0, days = 0, hours = 0, mins = 0, secs = 0, totalDays = 0, done = now >= target }
  if r.done then return r end

  local a, b = os.date("*t", now), os.date("*t", target)
  local months = (b.year - a.year) * 12 + (b.month - a.month)
  while months > 0 and addMonths(now, months) > target do months = months - 1 end
  local anchor = addMonths(now, months)

  local days = math.floor((target - anchor) / 86400)
  while days > 0 and addDays(anchor, days) > target do days = days - 1 end
  while addDays(anchor, days + 1) <= target do days = days + 1 end
  local rest = target - addDays(anchor, days)

  local total = math.floor((target - now) / 86400)
  while total > 0 and addDays(now, total) > target do total = total - 1 end
  while addDays(now, total + 1) <= target do total = total + 1 end

  r.years, r.months, r.days = months // 12, months % 12, days
  r.hours, r.mins, r.secs = rest // 3600, rest % 3600 // 60, rest % 60
  r.totalDays = total
  return r
end

-- Share of the time from `start` to `target` that has passed, from 0 to 1.
function M.progress(now, start, target)
  if target <= start then return 1 end
  return math.max(0, math.min(1, (now - start) / (target - start)))
end

local function plural(n, word)
  return n .. " " .. word .. (n == 1 and "" or "s")
end

-- The two text lines shown: calendar years/months/days, and the time of day
-- left plus the total day count.
function M.lines(r)
  if r.done then return "Retired!", "" end
  local big = plural(r.years, "year") .. " " .. plural(r.months, "month") .. " " .. plural(r.days, "day")
  local small = string.format("%d h %02d min %02d sec · %d days", r.hours, r.mins, r.secs, r.totalDays)
  return big, small
end

return M
