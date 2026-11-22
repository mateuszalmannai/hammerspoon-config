local summary = dofile("Spoons/TaskwarriorSummary.spoon/summary.lua")

local function texts(rows)
  local out = {}
  for _, r in ipairs(rows) do out[#out + 1] = r.style .. ": " .. r.text end
  return out
end

-- Saturday 2026-11-21 18:00 in Berlin (UTC+1)
local now = summary.parseTime("20261121T170000Z")
local todayEnd = summary.parseTime("20261121T230000Z")
local tomorrowEnd = summary.parseTime("20261122T230000Z")
local opts = { now = now, todayEnd = todayEnd, tomorrowEnd = tomorrowEnd, context = "work" }

describe("summary.parseTime", function()
  it("reads UTC timestamps independent of the local time zone", function()
    assert.are.equal(0, summary.parseTime("19700101T000000Z"))
    assert.are.equal(os.time({ year = 2026, month = 11, day = 21, hour = 18, min = 0, sec = 0 }), now)
    assert.is_nil(summary.parseTime("tomorrow"))
    assert.is_nil(summary.parseTime(nil))
  end)
end)

describe("summary.contextFilter", function()
  it("wraps the context's read filter in parentheses", function()
    assert.are.same({ "( +work or project:Home )" }, summary.contextFilter("+work or project:Home\n"))
    assert.are.same({}, summary.contextFilter(""))
    assert.are.same({}, summary.contextFilter(nil))
  end)
end)

describe("summary.rows", function()
  local tasks = {
    { description = "Draft the proposal", project = "Alpha", due = "20261118T230000Z" },
    { description = "Renew certificates", project = "Beta", due = "20261121T200000Z" },
    { description = "Call back", due = "20261122T100000Z" },
    { description = "Write the long description that does not fit", project = "VeryLongProjectName" },
    { description = "Later", project = "Beta", due = "20261125T230000Z" },
    { description = "Not shown", project = "Beta" },
  }

  it("counts overdue and due-today tasks and lists the top ones with due labels", function()
    assert.are.same({
      "header: Tasks · work",
      "statsAlert: 1 overdue · 1 due today · 6 pending",
      "late: Alpha       Draft the proposal  2d late",
      "soon: Beta        Renew certificates  today",
      "soon:             Call back  tomorrow",
      "normal: VeryLongP…  Write the long description that d…",
      "normal: Beta        Later  in 5d",
    }, texts(summary.rows(tasks, opts)))
  end)

  it("isn't alarming when nothing is overdue, and handles no context", function()
    local rows = summary.rows({ tasks[3] }, { now = now, todayEnd = todayEnd, tomorrowEnd = tomorrowEnd, context = "" })
    assert.are.equal("header: Tasks · no context", texts(rows)[1])
    assert.are.equal("stats: 0 overdue · 0 due today · 1 pending", texts(rows)[2])
    assert.are.equal("soon: Call back  tomorrow", texts(rows)[3])
  end)

  it("says when nothing is pending", function()
    assert.are.same({
      "header: Tasks · work",
      "stats: 0 overdue · 0 due today · 0 pending",
      "empty: nothing pending",
    }, texts(summary.rows({}, opts)))
  end)

  it("labels a task due earlier today as late", function()
    local rows = summary.rows({ { description = "Missed", due = "20261121T150000Z" } }, opts)
    assert.are.equal("late: Missed  late", texts(rows)[3])
  end)
end)
