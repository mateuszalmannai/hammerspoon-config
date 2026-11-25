-- Run with `make test` (pins TZ to Europe/Berlin so the DST cases are deterministic).

local countdown = dofile("Spoons/PensionCountdown.spoon/countdown.lua")

local function at(date, hour, min, sec)
  local y, m, d = date:match("(%d+)-(%d+)-(%d+)")
  return os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d),
                   hour = hour or 0, min = min or 0, sec = sec or 0 })
end

local target = countdown.parseDate("2041-04-01")

describe("countdown.parseDate", function()
  it("gives local midnight, or nil for anything else", function()
    assert.are.equal(at("2041-04-01"), target)
    assert.is_nil(countdown.parseDate("01.04.2041"))
    assert.is_nil(countdown.parseDate(nil))
  end)
end)

describe("countdown.remaining", function()
  it("splits into calendar years, months, days and time of day", function()
    local r = countdown.remaining(at("2026-11-25", 9, 30, 15), target)
    assert.are.same({ 14, 4, 6, 14, 29, 45 }, { r.years, r.months, r.days, r.hours, r.mins, r.secs })
    assert.are.equal(5240, r.totalDays)
  end)

  it("counts whole days across DST changes", function()
    -- 2026-03-29 has 23 hours, 2026-10-25 has 25
    local r = countdown.remaining(at("2026-03-28", 12), at("2026-03-30", 12))
    assert.are.same({ 0, 0, 2, 0, 0 }, { r.years, r.months, r.days, r.hours, r.totalDays - 2 })
    r = countdown.remaining(at("2026-10-24", 12), at("2026-10-26", 12))
    assert.are.same({ 2, 0, 2 }, { r.days, r.hours, r.totalDays })
  end)

  it("clamps month ends (31 Jan to 1 Mar is 1 month 1 day)", function()
    local r = countdown.remaining(at("2027-01-31"), at("2027-03-01"))
    assert.are.same({ 0, 1, 1 }, { r.years, r.months, r.days })
  end)

  it("has less than a day left on the eve", function()
    local r = countdown.remaining(at("2041-03-31", 23, 59, 59), target)
    assert.are.same({ 0, 0, 0, 0, 0, 1, 0 }, { r.years, r.months, r.days, r.hours, r.mins, r.secs, r.totalDays })
  end)

  it("is done from the target on", function()
    assert.is_true(countdown.remaining(target, target).done)
    assert.are.equal("Retired!", (countdown.lines(countdown.remaining(target + 5, target))))
  end)
end)

describe("countdown.lines", function()
  it("formats with singulars", function()
    local big, small = countdown.lines({ years = 1, months = 0, days = 1, hours = 3, mins = 4, secs = 5, totalDays = 366 })
    assert.are.equal("1 year 0 months 1 day", big)
    assert.are.equal("3 h 04 min 05 sec · 366 days", small)
  end)
end)

describe("countdown.progress", function()
  it("is clamped between 0 and 1", function()
    local start = at("2001-04-01")
    assert.are.equal(0, countdown.progress(start - 1, start, target))
    assert.are.equal(1, countdown.progress(target + 1, start, target))
    assert.is_true(math.abs(countdown.progress(at("2021-04-01"), start, target) - 0.5) < 0.001)
  end)
end)
