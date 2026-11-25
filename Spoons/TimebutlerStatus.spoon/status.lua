-- Plain-Lua part of TimebutlerStatus (no hs.*), tested in spec/timebutler_status_spec.lua.
-- Works on the JSON of `util tb status --json` and `util tb balance --json`.
local M = {}

-- "5h 48m" for a number of seconds (rounded down to the minute)
function M.duration(seconds)
    local minutes = math.floor(math.max(0, seconds or 0) / 60)
    return string.format("%dh %02dm", minutes // 60, minutes % 60)
end

-- The clock's state: "running", "paused" or "stopped" (anything else
-- Timebutler reports, or no clock at all, counts as stopped)
function M.state(data)
    local s = data and type(data.clock) == "table" and data.clock.status
    if s == "running" or s == "paused" then return s end
    return "stopped"
end

-- Seconds worked today: the saved entries plus the session on the clock.
-- `today.workedMinutes` leaves the running session out, so it's added from
-- the clock; while running, it keeps counting from `fetchedAt` to `now`
-- (both in seconds) so the widget can tick between API calls.
function M.workedSeconds(data, fetchedAt, now)
    if type(data) ~= "table" then return 0 end
    local today = type(data.today) == "table" and data.today or {}
    local total = (tonumber(today.workedMinutes) or 0) * 60
    local state = M.state(data)
    if state ~= "stopped" then
        total = total + (tonumber(data.clock.workTimeElapsedSeconds) or 0)
        if state == "running" and fetchedAt and now and now > fetchedAt then
            total = total + (now - fetchedAt)
        end
    end
    return total
end

-- Seconds the clock has been paused (0 unless paused). Counted from
-- pauseTimestamp (milliseconds) when there is one, so it ticks between API
-- calls; otherwise breakElapsedSeconds as last read.
function M.pauseSeconds(data, now)
    if M.state(data) ~= "paused" then return 0 end
    local since = tonumber(data.clock.pauseTimestamp)
    if since and now then return math.max(0, now - since // 1000) end
    return tonumber(data.clock.breakElapsedSeconds) or 0
end

-- Seconds of break today: breaks in saved entries, earlier pauses of the
-- session on the clock, and the current pause
function M.breakSeconds(data, now)
    if type(data) ~= "table" then return 0 end
    local today = type(data.today) == "table" and data.today or {}
    local total = (tonumber(today.breakMinutes) or 0) * 60
    if M.state(data) ~= "stopped" then
        total = total + (tonumber(data.clock.accumulatedBreakSeconds) or 0) + M.pauseSeconds(data, now)
    end
    return total
end

-- The break a day of `worked` seconds needs under German working-time law
-- (ArbZG §4): 30 minutes, 45 once the work goes past 9 hours
function M.breakTarget(worked)
    return (worked or 0) > 9 * 3600 and 45 * 60 or 30 * 60
end

-- What a click on the widget does in each state
function M.clickAction(state)
    if state == "running" then return "pause" end
    if state == "paused" then return "resume" end
    return "start"
end

-- True when `util tb stop` stopped at Timebutler's break-rule question
-- instead of saving (it then needs --break apply|ignore)
function M.needsBreakDecision(output)
    return type(output) == "string" and output:find("[a]pply the correction", 1, true) ~= nil
end

-- The output without the break-rule question line, for showing in a dialog
function M.withoutPrompt(output)
    local lines = {}
    for line in ((output or "") .. "\n"):gmatch("(.-)\n") do
        if not line:find("[a]pply the correction", 1, true) then lines[#lines + 1] = line end
    end
    return (table.concat(lines, "\n"):gsub("%s+$", ""))
end

-- The last `n` entry lines and the total line of `util tb entries`
function M.recentEntries(output, n)
    local header, entries, total = nil, {}, nil
    for line in (output or ""):gmatch("[^\n]+") do
        if not header then
            header = line
        elseif line:match("^Total:") then
            total = line
        else
            entries[#entries + 1] = line
        end
    end
    local out = { header }
    for i = math.max(1, #entries - (n or 5) + 1), #entries do out[#out + 1] = entries[i] end
    if total then out[#out + 1] = total end
    return table.concat(out, "\n")
end

-- Rows for the widget: { text =, style = } with style one of header,
-- running, paused, stopped, normal, dim, error; and { style = "bar",
-- fraction = } rows (drawn as TimeFlow-style bars) for today's progress, the
-- vacation days used and, while paused, the break taken against the break
-- needed.
-- opts: now and fetchedAt (seconds), error (message or nil)
function M.rows(data, balance, opts)
    opts = opts or {}
    local rows = { { text = "Timebutler", style = "header" } }
    if opts.error then
        rows[#rows + 1] = { text = opts.error, style = "error" }
        return rows
    end
    if not data then
        rows[#rows + 1] = { text = "loading…", style = "dim" }
        return rows
    end

    local state = M.state(data)
    local clock = data.clock or {}
    if state == "running" then
        local since = tonumber(clock.startTimestamp)
        rows[#rows + 1] = { text = "running" .. (since and os.date(" since %H:%M", since // 1000) or ""), style = "running" }
    elseif state == "paused" then
        local since = tonumber(clock.pauseTimestamp)
        rows[#rows + 1] = { text = "paused" .. (since and os.date(" since %H:%M", since // 1000) or "")
            .. " · " .. M.duration(M.pauseSeconds(data, opts.now)), style = "paused" }
        local taken = M.breakSeconds(data, opts.now)
        local needed = M.breakTarget(M.workedSeconds(data, opts.fetchedAt, opts.now))
        rows[#rows + 1] = { text = string.format("break  %s of %s  %d%%",
            M.duration(taken), M.duration(needed), math.floor(taken / needed * 100)), style = "normal" }
        rows[#rows + 1] = { style = "bar", fraction = math.min(1, taken / needed) }
    else
        rows[#rows + 1] = { text = "stopped", style = "stopped" }
    end

    local worked = M.workedSeconds(data, opts.fetchedAt, opts.now)
    local target = (tonumber(type(data.today) == "table" and data.today.commitmentMinutes) or 0) * 60
    if target > 0 then
        local fraction = worked / target
        rows[#rows + 1] = { text = string.format("today  %s of %s  %d%%",
            M.duration(worked), M.duration(target), math.floor(fraction * 100)), style = "normal" }
        rows[#rows + 1] = { style = "bar", fraction = math.min(1, math.max(0, fraction)) }
    else
        rows[#rows + 1] = { text = "today  " .. M.duration(worked), style = "normal" }
    end

    -- used = approved and pending, i.e. everything not left (days can be halves)
    local left = type(balance) == "table" and tonumber(balance.vacationDaysRemaining)
    local total = type(balance) == "table" and tonumber(balance.vacationDaysTotal)
    if left and total and total > 0 then
        local fraction = (total - left) / total
        rows[#rows + 1] = { text = string.format("vacation  %g of %g days  %d%%", total - left, total,
                                                 math.floor(fraction * 100)), style = "normal" }
        rows[#rows + 1] = { style = "bar", fraction = math.min(1, math.max(0, fraction)) }
    elseif left then
        rows[#rows + 1] = { text = string.format("vacation  %g days left", left), style = "normal" }
    end
    return rows
end

return M
