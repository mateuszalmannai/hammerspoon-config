-- Run with `make test` (pins TZ to Europe/Berlin so the DST cases are deterministic).

local days = dofile("Spoons/Cherry.spoon/days.lua")

local function at(date, hour, min)
  local y, m, d = date:match("(%d+)-(%d+)-(%d+)")
  return os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d),
                   hour = hour or 12, min = min or 0, sec = 0 })
end

describe("days.dayKey", function()
  it("gives today's and earlier local dates", function()
    local now = at("2026-10-27")
    assert.are.equal("2026-10-27", days.dayKey(0, now))
    assert.are.equal("2026-10-26", days.dayKey(-1, now))
    assert.are.equal("2026-10-13", days.dayKey(-14, now))
  end)

  it("uses the local date just after midnight", function()
    assert.are.equal("2026-10-27", days.dayKey(0, at("2026-10-27", 0, 15)))
    assert.are.equal("2026-10-26", days.dayKey(-1, at("2026-10-27", 0, 15)))
  end)

  it("uses the local date just before midnight", function()
    assert.are.equal("2026-10-27", days.dayKey(0, at("2026-10-27", 23, 45)))
  end)

  it("steps back over the end of DST (25 Oct 2026 has 25 hours)", function()
    local now = at("2026-10-26", 0, 30)
    assert.are.equal("2026-10-25", days.dayKey(-1, now))
    assert.are.equal("2026-10-24", days.dayKey(-2, now))
  end)

  it("steps back over the start of DST (29 Mar 2026 has 23 hours)", function()
    local now = at("2026-03-30", 23, 30)
    assert.are.equal("2026-03-29", days.dayKey(-1, now))
    assert.are.equal("2026-03-28", days.dayKey(-2, now))
  end)

  it("crosses month and year boundaries", function()
    assert.are.equal("2026-10-31", days.dayKey(-1, at("2026-11-01")))
    assert.are.equal("2025-12-31", days.dayKey(-1, at("2026-01-01")))
    assert.are.equal("2024-02-29", days.dayKey(-1, at("2024-03-01")))
  end)
end)

describe("days.streak", function()
  local now = at("2026-10-27", 9)

  it("is 0 with no completed pomodoros", function()
    assert.are.equal(0, days.streak({}, now))
  end)

  it("counts today on its own", function()
    assert.are.equal(1, days.streak({ "2026-10-27" }, now))
  end)

  it("still counts a streak ending yesterday when today has none yet", function()
    assert.are.equal(2, days.streak({ "2026-10-26", "2026-10-25" }, now))
  end)

  it("is 0 when the last completed day was before yesterday", function()
    assert.are.equal(0, days.streak({ "2026-10-25", "2026-10-24" }, now))
  end)

  it("counts consecutive days ending today", function()
    assert.are.equal(3, days.streak({ "2026-10-27", "2026-10-26", "2026-10-25" }, now))
  end)

  it("stops at the first gap", function()
    assert.are.equal(2, days.streak({ "2026-10-27", "2026-10-26", "2026-10-24", "2026-10-23" }, now))
  end)

  it("doesn't let a missing today break a streak, but a missing yesterday does", function()
    assert.are.equal(1, days.streak({ "2026-10-27", "2026-10-25" }, now))
  end)

  it("runs across the end of DST", function()
    local days4 = { "2026-10-26", "2026-10-25", "2026-10-24", "2026-10-23" }
    assert.are.equal(4, days.streak(days4, at("2026-10-26", 0, 30)))
    assert.are.equal(4, days.streak(days4, at("2026-10-26", 23, 30)))
  end)

  it("runs across the start of DST", function()
    local days3 = { "2026-03-30", "2026-03-29", "2026-03-28" }
    assert.are.equal(3, days.streak(days3, at("2026-03-30", 0, 30)))
  end)

  it("runs across month and year boundaries", function()
    assert.are.equal(3, days.streak({ "2026-11-01", "2026-10-31", "2026-10-30" }, at("2026-11-01")))
    assert.are.equal(2, days.streak({ "2026-01-01", "2025-12-31" }, at("2026-01-01")))
  end)
end)
