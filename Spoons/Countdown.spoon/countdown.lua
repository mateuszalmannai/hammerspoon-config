-- Plain-Lua date arithmetic for the Countdown widgets (tested in
-- spec/countdown_spec.lua). Works in local time, so a countdown across a DST
-- change still counts calendar days, not 24-hour blocks.

local M = {}

local function daysInMonth(year, month)
  return os.date("*t", os.time({ year = year, month = month + 1, day = 0, hour = 12 })).day
end

local function validDay(year, month, day)
  return month >= 1 and month <= 12 and day >= 1 and day <= daysInMonth(year, month)
end

local function midnight(year, month, day)
  return os.time({ year = year, month = month, day = day, hour = 0, min = 0, sec = 0 })
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

-- Whole calendar days from `from` to `to` (from <= to), DST-safe.
local function wholeDays(from, to)
  local n = math.floor((to - from) / 86400)
  while n > 0 and addDays(from, n) > to do n = n - 1 end
  while addDays(from, n + 1) <= to do n = n + 1 end
  return n
end

-- Epoch seconds for local midnight at the start of "YYYY-MM-DD", or nil.
function M.parseDate(s)
  local y, m, d = (s or ""):match("^(%d%d%d%d)-(%d%d)-(%d%d)$")
  if not y then return nil end
  y, m, d = tonumber(y), tonumber(m), tonumber(d)
  if not validDay(y, m, d) then return nil end
  return midnight(y, m, d)
end

-- Reads a date as typed in the add dialog and returns the stored form:
-- "24.12." or "24.12" (every year) -> "12-24"; "24.12.2026" or "2026-12-24"
-- -> "2026-12-24". Returns nil and a message for anything else.
function M.parseInput(s)
  s = (s or ""):gsub("^%s+", ""):gsub("%s+$", "")
  local d, m, y = s:match("^(%d%d?)%.(%d%d?)%.(%d%d%d%d)$")
  if not d then
    y, m, d = s:match("^(%d%d%d%d)-(%d%d?)-(%d%d?)$")
  end
  if d then
    y, m, d = tonumber(y), tonumber(m), tonumber(d)
    if not validDay(y, m, d) then return nil, "no such date: " .. s end
    return string.format("%04d-%02d-%02d", y, m, d)
  end
  d, m = s:match("^(%d%d?)%.(%d%d?)%.?$")
  if d then
    m, d = tonumber(m), tonumber(d)
    if not validDay(2024, m, d) then return nil, "no such date: " .. s end -- 2024: leap year
    return string.format("%02d-%02d", m, d)
  end
  return nil, "use DD.MM.YYYY, or DD.MM. for every year"
end

-- The start (local midnight) of the day a stored date ("YYYY-MM-DD", or
-- "MM-DD" for every year) refers to at `now`. A yearly date is this year's
-- until that day is over, then next year's (29 Feb: the next leap year).
function M.occurrence(date, now)
  local fixed = M.parseDate(date)
  if fixed then return fixed end
  local m, d = (date or ""):match("^(%d%d)-(%d%d)$")
  if not m then return nil end
  m, d = tonumber(m), tonumber(d)
  local year = os.date("*t", now).year
  for y = year, year + 8 do
    if validDay(y, m, d) then
      local t = midnight(y, m, d)
      if addDays(t, 1) > now then return t end
    end
  end
  return nil
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

  local days = wholeDays(anchor, target)
  local rest = target - addDays(anchor, days)

  r.years, r.months, r.days = months // 12, months % 12, days
  r.hours, r.mins, r.secs = rest // 3600, rest % 3600 // 60, rest % 60
  r.totalDays = wholeDays(now, target)
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

-- The two text lines shown for a countdown to `target` (a day's start):
-- years/months/days left (zero units left out) and the time of day left plus
-- the total day count; "Today!" during the target day; "Passed" after it.
function M.lines(now, target)
  if now >= target then
    if addDays(target, 1) > now then return "Today!", "" end
    return "Passed", plural(wholeDays(addDays(target, 1), now) + 1, "day") .. " ago"
  end
  local r = M.remaining(now, target)
  local parts = {}
  if r.years > 0 then parts[#parts + 1] = plural(r.years, "year") end
  if r.months > 0 then parts[#parts + 1] = plural(r.months, "month") end
  if r.days > 0 or #parts == 0 then parts[#parts + 1] = plural(r.days, "day") end
  local small = string.format("%d h %02d min %02d sec · %s", r.hours, r.mins, r.secs, plural(r.totalDays, "day"))
  return table.concat(parts, " "), small
end

return M
