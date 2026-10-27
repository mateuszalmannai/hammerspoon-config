-- Calendar-day helpers for Cherry's stats. Plain Lua (no hs.*), so they can be
-- tested outside Hammerspoon; see spec/cherry_days_spec.lua.

local days = {}

-- Local calendar date `offset` days from `now` (default: the current time), as a
-- time value at noon (safe across DST changes).
function days.dayTime(offset, now)
  local t = os.date("*t", now)
  t.day = t.day + offset
  t.hour, t.min, t.sec = 12, 0, 0
  return os.time(t)
end

-- Local calendar date `offset` days from `now`, as "YYYY-MM-DD".
function days.dayKey(offset, now)
  return os.date("%Y-%m-%d", days.dayTime(offset, now))
end

-- Consecutive days with a completed pomodoro, ending today, or yesterday if today
-- has none yet. `completedDays` lists distinct "YYYY-MM-DD" dates, newest first.
function days.streak(completedDays, now)
  local streak = 0
  local expected = completedDays[1] == days.dayKey(0, now) and 0 or -1
  for _, day in ipairs(completedDays) do
    if day ~= days.dayKey(expected, now) then break end
    streak = streak + 1
    expected = expected - 1
  end
  return streak
end

return days
