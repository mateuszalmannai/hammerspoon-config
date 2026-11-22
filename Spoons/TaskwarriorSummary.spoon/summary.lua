-- Plain-Lua part of TaskwarriorSummary (no hs.*), so it can be unit-tested:
-- turns decoded `task export` output into the rows the widget draws.

local M = {}

-- Days since 1970-01-01 for a civil date (Howard Hinnant's algorithm), so
-- UTC timestamps convert without depending on the local time zone.
local function daysFromCivil(y, m, d)
  if m <= 2 then y = y - 1 end
  local era = (y >= 0 and y or y - 399) // 400
  local yoe = y - era * 400
  local mp = (m + 9) % 12
  local doy = (153 * mp + 2) // 5 + d - 1
  local doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
  return era * 146097 + doe - 719468
end

-- Epoch seconds for a taskwarrior timestamp ("20260924T220000Z"), or nil.
function M.parseTime(s)
  local y, mo, d, h, mi, se = (s or ""):match("^(%d%d%d%d)(%d%d)(%d%d)T(%d%d)(%d%d)(%d%d)Z$")
  if not y then return nil end
  return daysFromCivil(tonumber(y), tonumber(mo), tonumber(d)) * 86400
    + tonumber(h) * 3600 + tonumber(mi) * 60 + tonumber(se)
end

-- The task arguments that restrict export to the active context, whose read
-- filter `task export` doesn't apply by itself.
function M.contextFilter(readFilter)
  readFilter = (readFilter or ""):gsub("^%s+", ""):gsub("%s+$", "")
  if readFilter == "" then return {} end
  return { "( " .. readFilter .. " )" }
end

-- Shortens s to at most n characters (UTF-8 aware), ending in "…" if cut.
local function truncate(s, n)
  if utf8.len(s) <= n then return s end
  return s:sub(1, utf8.offset(s, n) - 1) .. "…"
end

local function pad(s, n)
  return s .. string.rep(" ", n - utf8.len(s))
end

-- Short due label relative to now ("3d late", "today", "tomorrow", "in 5d").
-- `todayEnd` and `tomorrowEnd` are the epoch seconds of the next two midnights.
local function dueLabel(due, now, todayEnd, tomorrowEnd)
  if due < now then
    local days = (now - due) // 86400
    return days == 0 and "late" or (days .. "d late"), "late"
  end
  if due < todayEnd then return "today", "soon" end
  if due < tomorrowEnd then return "tomorrow", "soon" end
  return "in " .. ((due - todayEnd) // 86400 + 1) .. "d", nil
end

-- Builds the widget's rows. `tasks` is the decoded `task export next` array
-- (already filtered to pending tasks in the context, in urgency order).
--   opts.now          epoch seconds
--   opts.todayEnd     epoch seconds of the coming midnight
--   opts.tomorrowEnd  epoch seconds of the midnight after
--   opts.context      active context name, or "" for none
--   opts.limit        tasks listed (default 5)
--   opts.width        max characters for a description (default 34)
-- Each row is { text = ..., style = ... } with style one of "header",
-- "stats", "statsAlert" (something is overdue), "late", "soon", "normal",
-- "empty".
function M.rows(tasks, opts)
  local limit, width = opts.limit or 5, opts.width or 34
  local now, todayEnd, tomorrowEnd = opts.now, opts.todayEnd, opts.tomorrowEnd
  local out = {}
  local ctx = (opts.context and opts.context ~= "") and opts.context or "no context"
  out[#out + 1] = { text = "Tasks · " .. ctx, style = "header" }

  local overdue, dueToday = 0, 0
  for _, t in ipairs(tasks) do
    local due = M.parseTime(t.due)
    if due then
      if due < now then overdue = overdue + 1
      elseif due < todayEnd then dueToday = dueToday + 1 end
    end
  end
  out[#out + 1] = {
    text = overdue .. " overdue · " .. dueToday .. " due today · " .. #tasks .. " pending",
    style = overdue > 0 and "statsAlert" or "stats",
  }

  if #tasks == 0 then
    out[#out + 1] = { text = "nothing pending", style = "empty" }
    return out
  end

  local shown = {}
  for i = 1, math.min(limit, #tasks) do shown[i] = tasks[i] end
  local projectWidth = 0
  for _, t in ipairs(shown) do
    projectWidth = math.max(projectWidth, utf8.len(t.project or ""))
  end
  projectWidth = math.min(projectWidth, 10)

  for _, t in ipairs(shown) do
    local project = truncate(t.project or "", projectWidth)
    local text = truncate(t.description or "", width)
    if projectWidth > 0 then text = pad(project, projectWidth) .. "  " .. text end
    local style = "normal"
    local due = M.parseTime(t.due)
    if due then
      local label, dueStyle = dueLabel(due, now, todayEnd, tomorrowEnd)
      text = text .. "  " .. label
      style = dueStyle or style
    end
    out[#out + 1] = { text = text, style = style }
  end
  return out
end

return M
