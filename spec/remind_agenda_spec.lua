local agenda = dofile("Spoons/RemindAgenda.spoon/agenda.lua")

local sample = table.concat({
  "2026/11/20 * * 30 600 10:00-10:30 Standup",
  "2026/11/20 * * * 840 14:00 Pick up the Neng",
  "2026/11/20 * * * * Weekly Review",
  "2026/11/20 SHADE * * * 255 255 0",
  "2026/11/20 COLOR * * 1080 255 0 0 18:00 Red thing",
  "2026/11/21 * * 75 960 16:00-17:15 DLRG Schwimmen",
}, "\n")

local function texts(rows)
  local out = {}
  for _, r in ipairs(rows) do out[#out + 1] = r.style .. ": " .. r.text end
  return out
end

describe("agenda.parse", function()
  it("reads timed and all-day reminders, dropping remind's time prefix", function()
    local events = agenda.parse(sample)
    assert.are.same({ date = "2026/11/20", start = 600, duration = 30, text = "Standup" }, events[1])
    assert.are.same({ date = "2026/11/20", start = 840, text = "Pick up the Neng" }, events[2])
    assert.are.same({ date = "2026/11/20", text = "Weekly Review" }, events[3])
  end)

  it("skips specials but keeps COLOR reminders without their colour", function()
    local events = agenda.parse(sample)
    assert.are.equal(5, #events)
    assert.are.same({ date = "2026/11/20", start = 1080, text = "Red thing" }, events[4])
  end)

  it("keeps an all-day body that starts with digits", function()
    local events = agenda.parse("2026/11/20 * * * * 10:00 is not a time here")
    assert.are.equal("10:00 is not a time here", events[1].text)
  end)
end)

describe("agenda.countdown", function()
  it("formats minutes and hours", function()
    assert.are.equal("in 5 min", agenda.countdown(5))
    assert.are.equal("in 2 h", agenda.countdown(120))
    assert.are.equal("in 1 h 5 min", agenda.countdown(65))
  end)
end)

describe("agenda.rows", function()
  local events = agenda.parse(sample)

  it("lists today and tomorrow, all-day first, marking past, now and next", function()
    local now = { year = 2026, month = 11, day = 20, hour = 10, min = 15 }
    assert.are.same({
      "header: Today · Fri 20 Nov",
      "normal: all day      Weekly Review",
      "now: 10:00–10:30  Standup  (now)",
      "next: 14:00        Pick up the Neng  in 3 h 45 min",
      "normal: 18:00        Red thing",
      "header: Tomorrow · Sat 21 Nov",
      "normal: 16:00–17:15  DLRG Schwimmen",
    }, texts(agenda.rows(events, now)))
  end)

  it("marks ended events as past, an event without duration once its minute is over", function()
    local now = { year = 2026, month = 11, day = 20, hour = 14, min = 1 }
    local rows = agenda.rows(events, now)
    assert.are.equal("past", rows[3].style)
    assert.are.equal("past", rows[4].style)
    assert.are.equal("next", rows[5].style)
  end)

  it("says when a day is empty and crosses month ends", function()
    local now = { year = 2026, month = 11, day = 30, hour = 9, min = 0 }
    assert.are.same({
      "header: Today · Mon 30 Nov",
      "empty: nothing scheduled",
      "header: Tomorrow · Tue 01 Dec",
      "empty: nothing scheduled",
    }, texts(agenda.rows(events, now)))
  end)

  it("caps the events per day", function()
    local now = { year = 2026, month = 11, day = 20, hour = 8, min = 0 }
    local rows = agenda.rows(events, now, 2)
    assert.are.equal("empty: +2 more", texts(rows)[4])
  end)
end)
