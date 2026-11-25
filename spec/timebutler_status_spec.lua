local status = dofile("Spoons/TimebutlerStatus.spoon/status.lua")

-- 2026-11-25 08:48 in Berlin (UTC+1), in milliseconds as the API sends it
local startMs = os.time({ year = 2026, month = 11, day = 25, hour = 8, min = 48 }) * 1000

local function statusJson(clockStatus, elapsed, workedMinutes)
  return {
    clock = { status = clockStatus, startTimestamp = startMs, pauseTimestamp = startMs + 3600 * 1000,
              workTimeElapsedSeconds = elapsed },
    today = { commitmentMinutes = 480, workedMinutes = workedMinutes or 0 },
  }
end

local function texts(rows)
  local out = {}
  for _, r in ipairs(rows) do
    out[#out + 1] = r.style .. ": " .. (r.text or string.format("%.2f", r.fraction))
  end
  return out
end

describe("status.duration", function()
  it("formats hours and minutes, rounding down", function()
    assert.are.equal("5h 43m", status.duration(20586))
    assert.are.equal("0h 00m", status.duration(59))
    assert.are.equal("0h 00m", status.duration(nil))
    assert.are.equal("0h 00m", status.duration(-5))
  end)
end)

describe("status.state", function()
  it("treats anything but running or paused as stopped", function()
    assert.are.equal("running", status.state(statusJson("running", 0)))
    assert.are.equal("paused", status.state(statusJson("paused", 0)))
    assert.are.equal("stopped", status.state(statusJson("idle", 0)))
    assert.are.equal("stopped", status.state({ clock = nil }))
    assert.are.equal("stopped", status.state(nil))
  end)
end)

describe("status.workedSeconds", function()
  it("adds the running session, which today.workedMinutes leaves out", function()
    assert.are.equal(20586, status.workedSeconds(statusJson("running", 20586, 0)))
    assert.are.equal(60 * 60 + 100, status.workedSeconds(statusJson("running", 100, 60)))
  end)

  it("keeps counting a running clock since it was read", function()
    assert.are.equal(1000 + 90, status.workedSeconds(statusJson("running", 1000), 500, 590))
  end)

  it("does not count on while paused", function()
    assert.are.equal(1000, status.workedSeconds(statusJson("paused", 1000), 500, 590))
  end)

  it("ignores the clock when stopped", function()
    assert.are.equal(8 * 3600, status.workedSeconds(statusJson("idle", 999, 480), 500, 590))
    assert.are.equal(0, status.workedSeconds(nil))
  end)
end)

describe("pause and break", function()
  local pausedAt = startMs // 1000 + 3600  -- paused at 09:48

  local function paused(accumulated, savedBreak, elapsed)
    local d = statusJson("paused", elapsed or 3600)
    d.clock.accumulatedBreakSeconds = accumulated or 0
    d.clock.breakElapsedSeconds = 300
    d.today.breakMinutes = savedBreak or 0
    return d
  end

  it("counts the pause from its timestamp, so it ticks", function()
    assert.are.equal(720, status.pauseSeconds(paused(), pausedAt + 720))
  end)

  it("falls back to breakElapsedSeconds without a timestamp", function()
    local d = paused()
    d.clock.pauseTimestamp = nil
    assert.are.equal(300, status.pauseSeconds(d, pausedAt + 720))
  end)

  it("is zero unless paused", function()
    assert.are.equal(0, status.pauseSeconds(statusJson("running", 100), pausedAt + 720))
    assert.are.equal(0, status.pauseSeconds(nil, pausedAt))
  end)

  it("adds saved breaks, earlier pauses and the current pause", function()
    assert.are.equal(10 * 60 + 300 + 720, status.breakSeconds(paused(300, 10), pausedAt + 720))
    local stopped = statusJson("idle", 0)
    stopped.today.breakMinutes = 15
    assert.are.equal(15 * 60, status.breakSeconds(stopped, pausedAt + 720))
  end)

  it("needs 30 minutes, 45 past 9 hours of work", function()
    assert.are.equal(30 * 60, status.breakTarget(5 * 3600))
    assert.are.equal(30 * 60, status.breakTarget(9 * 3600))
    assert.are.equal(45 * 60, status.breakTarget(9 * 3600 + 60))
  end)

  it("shows the pause counter and a break bar", function()
    assert.are.same({
      "header: Timebutler",
      "paused: paused since 09:48 · 0h 12m",
      "normal: break  0h 17m of 0h 30m  56%",
      "bar: 0.57",
      "normal: today  1h 00m of 8h 00m  12%",
      "bar: 0.12",
    }, texts(status.rows(paused(300), nil, { now = pausedAt + 720, fetchedAt = pausedAt })))
  end)

  it("caps the break bar once the break is long enough", function()
    local rows = texts(status.rows(paused(0, 0, 10 * 3600), nil, { now = pausedAt + 50 * 60 }))
    assert.are.equal("normal: break  0h 50m of 0h 45m  111%", rows[3])
    assert.are.equal("bar: 1.00", rows[4])
  end)
end)

describe("status.clickAction", function()
  it("pauses a running clock, resumes a paused one, starts otherwise", function()
    assert.are.equal("pause", status.clickAction("running"))
    assert.are.equal("resume", status.clickAction("paused"))
    assert.are.equal("start", status.clickAction("stopped"))
  end)
end)

describe("break-rule output", function()
  local out = "Session 08:48-17:00, 8h 12m worked, no break\n"
    .. "Timebutler would deduct a 30m break.\n"
    .. "[a]pply the correction, [i]gnore it, or anything else to keep the clock running: \n"

  it("is recognised by its question", function()
    assert.is_true(status.needsBreakDecision(out))
    assert.is_false(status.needsBreakDecision("Stopped: 8h 12m saved"))
    assert.is_false(status.needsBreakDecision(nil))
  end)

  it("is shown without the question", function()
    assert.are.equal("Session 08:48-17:00, 8h 12m worked, no break\nTimebutler would deduct a 30m break.",
      status.withoutPrompt(out))
  end)
end)

describe("status.recentEntries", function()
  it("keeps the header, the last n entries and the total", function()
    local out = table.concat({
      "ID  DATE  WORKED", "1  Mon  8h", "2  Tue  7h", "3  Wed  8h", "Total: 23h 00m in 3 entries", "",
    }, "\n")
    assert.are.equal("ID  DATE  WORKED\n2  Tue  7h\n3  Wed  8h\nTotal: 23h 00m in 3 entries",
      status.recentEntries(out, 2))
    assert.are.equal("ID  DATE  WORKED\n1  Mon  8h\n2  Tue  7h\n3  Wed  8h\nTotal: 23h 00m in 3 entries",
      status.recentEntries(out, 5))
  end)
end)

describe("status.rows", function()
  local balance = { vacationDaysRemaining = 2, vacationDaysTotal = 35 }

  it("shows a running clock, today's progress and the vacation left", function()
    assert.are.same({
      "header: Timebutler",
      "running: running since 08:48",
      "normal: today  4h 00m of 8h 00m  50%",
      "bar: 0.50",
      "normal: vacation  33 of 35 days  94%",
      "bar: 0.94",
    }, texts(status.rows(statusJson("running", 4 * 3600), balance)))
  end)

  it("shows half days, and only the days left without a total", function()
    local rows = texts(status.rows(statusJson("running", 0), { vacationDaysRemaining = 4.5, vacationDaysTotal = 30 }))
    assert.are.equal("normal: vacation  25.5 of 30 days  85%", rows[5])
    assert.are.equal("bar: 0.85", rows[6])
    rows = texts(status.rows(statusJson("running", 0), { vacationDaysRemaining = 2 }))
    assert.are.equal("normal: vacation  2 days left", rows[5])
    assert.are.equal(5, #rows)
  end)

  it("shows when a paused clock was paused", function()
    local rows = status.rows(statusJson("paused", 3600), nil, { now = startMs // 1000 + 3600 + 300 })
    assert.are.equal("paused: paused since 09:48 · 0h 05m", texts(rows)[2])
    assert.are.equal(6, #rows)
  end)

  it("caps the bar at full once the target is reached", function()
    local rows = texts(status.rows(statusJson("idle", 0, 510), nil))
    assert.are.equal("stopped: stopped", rows[2])
    assert.are.equal("normal: today  8h 30m of 8h 00m  106%", rows[3])
    assert.are.equal("bar: 1.00", rows[4])
  end)

  it("shows loading and errors", function()
    assert.are.same({ "header: Timebutler", "dim: loading…" }, texts(status.rows(nil, nil)))
    assert.are.same({ "header: Timebutler", "error: util tb failed" },
      texts(status.rows(statusJson("running", 0), balance, { error = "util tb failed" })))
  end)
end)
