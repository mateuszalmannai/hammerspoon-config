-- Run with `make test` (pins TZ to Europe/Berlin so the DST cases are deterministic).

local countdown = dofile("Spoons/Countdown.spoon/countdown.lua")

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
    assert.is_nil(countdown.parseDate("2041-02-30"))
    assert.is_nil(countdown.parseDate(nil))
  end)
end)

describe("countdown.parseInput", function()
  it("reads one-off dates", function()
    assert.are.equal("2026-12-24", countdown.parseInput("24.12.2026"))
    assert.are.equal("2027-01-05", countdown.parseInput(" 5.1.2027 "))
    assert.are.equal("2026-12-24", countdown.parseInput("2026-12-24"))
  end)

  it("reads yearly dates", function()
    assert.are.equal("12-24", countdown.parseInput("24.12."))
    assert.are.equal("12-24", countdown.parseInput("24.12"))
    assert.are.equal("02-29", countdown.parseInput("29.2."))
  end)

  it("rejects impossible or unreadable dates", function()
    assert.is_nil(countdown.parseInput("31.11."))
    assert.is_nil(countdown.parseInput("29.02.2027"))
    assert.is_nil(countdown.parseInput("Christmas"))
    local _, err = countdown.parseInput("")
    assert.matches("DD.MM", err)
  end)
end)

describe("countdown.formatInput", function()
  it("turns stored dates back into what parseInput reads", function()
    assert.are.equal("24.12.2026", countdown.formatInput("2026-12-24"))
    assert.are.equal("24.12.", countdown.formatInput("12-24"))
    for _, date in ipairs({ "2026-12-24", "12-24", "02-29", "2027-01-05" }) do
      assert.are.equal(date, countdown.parseInput(countdown.formatInput(date)))
    end
  end)

  it("leaves anything else unchanged", function()
    assert.are.equal("Christmas", countdown.formatInput("Christmas"))
    assert.are.equal("", countdown.formatInput(nil))
  end)
end)

describe("countdown.occurrence", function()
  it("passes fixed dates through", function()
    assert.are.equal(target, countdown.occurrence("2041-04-01", at("2026-11-25")))
  end)

  it("gives this year's yearly date until that day is over", function()
    assert.are.equal(at("2026-12-24"), countdown.occurrence("12-24", at("2026-11-25")))
    assert.are.equal(at("2026-12-24"), countdown.occurrence("12-24", at("2026-12-24", 23, 59)))
    assert.are.equal(at("2027-12-24"), countdown.occurrence("12-24", at("2026-12-25")))
  end)

  it("moves 29 Feb to the next leap year", function()
    assert.are.equal(at("2028-02-29"), countdown.occurrence("02-29", at("2026-11-25")))
  end)

  it("is nil for anything else", function()
    assert.is_nil(countdown.occurrence("Christmas", at("2026-11-25")))
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
    assert.are.same({ 0, 0, 2, 0, 2 }, { r.years, r.months, r.days, r.hours, r.totalDays })
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
  end)
end)

describe("countdown.lines", function()
  it("leaves out zero units and uses singulars", function()
    local big, small = countdown.lines(at("2026-11-25", 9, 30, 15), at("2026-12-24"))
    assert.are.equal("28 days", big)
    assert.are.equal("14 h 29 min 45 sec · 28 days", small)
    big = countdown.lines(at("2026-11-25"), at("2027-12-26"))
    assert.are.equal("1 year 1 month 1 day", big)
    big = countdown.lines(at("2026-11-25"), at("2028-11-25"))
    assert.are.equal("2 years", big)
  end)

  it("shows 0 days on the eve", function()
    local big, small = countdown.lines(at("2026-12-23", 23), at("2026-12-24"))
    assert.are.equal("0 days", big)
    assert.are.equal("1 h 00 min 00 sec · 0 days", small)
  end)

  it("says Today! during the day and Passed after it", function()
    assert.are.equal("Today!", (countdown.lines(at("2026-12-24", 18), at("2026-12-24"))))
    local big, small = countdown.lines(at("2026-12-25", 10), at("2026-12-24"))
    assert.are.same({ "Passed", "1 day ago" }, { big, small })
    big, small = countdown.lines(at("2026-12-27", 0), at("2026-12-24"))
    assert.are.same({ "Passed", "3 days ago" }, { big, small })
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
