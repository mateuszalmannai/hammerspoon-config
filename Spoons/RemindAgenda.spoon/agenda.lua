-- Plain-Lua part of RemindAgenda (no hs.*), so it can be unit-tested:
-- parses `remind -s` output and turns it into the rows the widget draws.

local M = {}

-- Parses the output of `remind -s` (one reminder per line:
-- "date special tag duration time body", with "*" for an empty field) into a
-- list of events { date = "YYYY/MM/DD", start = minutes or nil,
-- duration = minutes or nil, text = string }. Lines with a special other
-- than COLOR (shading, moon phases, PostScript, ...) are skipped.
function M.parse(output)
  local events = {}
  for line in (output or ""):gmatch("[^\n]+") do
    local date, special, _, duration, start, body =
      line:match("^(%d+/%d+/%d+) (%S+) (%S+) (%S+) (%S+) ?(.*)$")
    if date and (special == "*" or special == "COLOR" or special == "COLOUR") then
      if special ~= "*" then
        body = body:gsub("^%d+ %d+ %d+ ?", "") -- drop the "r g b" colour
      end
      start = tonumber(start)
      if start then
        -- remind writes the time into the body ("10:00-10:30 Standup");
        -- the widget formats times itself
        body = body:gsub("^%d+[:.]%d+%S*%s+", "")
      end
      events[#events + 1] = { date = date, start = start, duration = tonumber(duration), text = body }
    end
  end
  return events
end

local function clock(minutes)
  return string.format("%02d:%02d", minutes // 60 % 24, minutes % 60)
end

-- "in 12 min", "in 2 h", "in 1 h 5 min"
function M.countdown(minutes)
  if minutes < 60 then return "in " .. minutes .. " min" end
  local h, m = minutes // 60, minutes % 60
  if m == 0 then return "in " .. h .. " h" end
  return "in " .. h .. " h " .. m .. " min"
end

local function dateKey(t)
  return os.date("%Y/%m/%d", os.time(t))
end

local function sorted(events, key)
  local day = {}
  for _, e in ipairs(events) do
    if e.date == key then day[#day + 1] = e end
  end
  -- all-day reminders first, then by start time, keeping remind's order on ties
  for i, e in ipairs(day) do e._i = i end
  table.sort(day, function(a, b)
    local sa, sb = a.start or -1, b.start or -1
    if sa ~= sb then return sa < sb end
    return a._i < b._i
  end)
  return day
end

local timeWidth = 11 -- "10:00–10:30"

local function timeLabel(e)
  if not e.start then return "all day" end
  if e.duration and e.duration > 0 then
    return clock(e.start) .. "–" .. clock(e.start + e.duration)
  end
  return clock(e.start)
end

local function pad(s, width)
  -- utf8.len, because the en dash is one column but three bytes
  return s .. string.rep(" ", width - utf8.len(s))
end

-- Builds the widget's rows for today and tomorrow from parsed events.
-- `now` is an os.date("*t") table. Each row is { text = ..., style = ... }
-- with style one of:
--   "header"  day heading
--   "past"    today's event that has ended
--   "now"     today's event in progress
--   "next"    today's next event (its text carries the countdown)
--   "normal"  any other event
--   "empty"   "nothing scheduled" / "+N more"
-- At most `maxPerDay` events are listed per day (default 8).
function M.rows(events, now, maxPerDay)
  maxPerDay = maxPerDay or 8
  local nowMin = now.hour * 60 + now.min
  local today = { year = now.year, month = now.month, day = now.day, hour = 12 }
  local tomorrow = { year = now.year, month = now.month, day = now.day + 1, hour = 12 }
  local out = {}

  local function addDay(label, t, isToday)
    out[#out + 1] = { text = label .. " · " .. os.date("%a %d %b", os.time(t)), style = "header" }
    local day = sorted(events, dateKey(t))
    if #day == 0 then
      out[#out + 1] = { text = "nothing scheduled", style = "empty" }
      return
    end
    local nextFound = false
    for i, e in ipairs(day) do
      if i > maxPerDay then
        out[#out + 1] = { text = "+" .. (#day - maxPerDay) .. " more", style = "empty" }
        break
      end
      local text = pad(timeLabel(e), timeWidth) .. "  " .. e.text
      local style = "normal"
      if isToday and e.start then
        local finish = e.start + math.max(e.duration or 0, 1)
        if finish <= nowMin then
          style = "past"
        elseif e.start <= nowMin then
          style = "now"
          text = text .. "  (now)"
        elseif not nextFound then
          style = "next"
          nextFound = true
          text = text .. "  " .. M.countdown(e.start - nowMin)
        end
      end
      out[#out + 1] = { text = text, style = style }
    end
  end

  addDay("Today", today, true)
  addDay("Tomorrow", tomorrow, false)
  return out
end

return M
