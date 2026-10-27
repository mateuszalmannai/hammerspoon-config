local fuzzy = require("modules.fuzzy")

describe("fuzzy.score", function()
  it("matches characters in order, with gaps", function()
    assert.is_not_nil(fuzzy.score("rcal", "Remind calendar popup"))
    assert.is_not_nil(fuzzy.score("tgcn", "Toggle Hammerspoon Console"))
  end)

  it("doesn't match characters out of order or missing", function()
    assert.is_nil(fuzzy.score("lac", "Remind calendar"))
    assert.is_nil(fuzzy.score("xyz", "Remind calendar"))
    assert.is_nil(fuzzy.score("calendars", "calendar"))
  end)

  it("ignores case", function()
    assert.are.equal(fuzzy.score("lock", "Lock screen"), fuzzy.score("LOCK", "lock screen"))
  end)

  it("ignores spaces in the query", function()
    assert.are.equal(fuzzy.score("lockscreen", "Lock screen"), fuzzy.score("lock screen", "Lock screen"))
  end)

  it("matches everything with an empty or blank query", function()
    assert.are.equal(0, fuzzy.score("", "anything"))
    assert.are.equal(0, fuzzy.score("  ", "anything"))
    assert.are.equal(0, fuzzy.score(nil, "anything"))
  end)

  it("treats modifier symbols as single characters", function()
    assert.is_not_nil(fuzzy.score("✧w", "✧W"))
    assert.is_not_nil(fuzzy.score("⌘⌥h", "⌘⌥H"))
    assert.is_nil(fuzzy.score("⌘⌥h", "✧H"))
    assert.is_nil(fuzzy.score("⇧", "⌘⌥H"))
  end)

  it("ranks consecutive characters above scattered ones", function()
    assert.is_true(fuzzy.score("cal", "calendar") > fuzzy.score("cal", "copy all"))
  end)

  it("ranks word starts above mid-word matches", function()
    assert.is_true(fuzzy.score("ts", "Take Screenshot") > fuzzy.score("ts", "Toggle mounts"))
  end)

  it("counts camelCase humps as word starts", function()
    assert.is_true(fuzzy.score("st", "showTime") > fuzzy.score("st", "shortcut"))
  end)

  it("finds the best placement, not just the first", function()
    -- the first "c" is mid-word in "Lock"; matching from the "c" of "calendar"
    -- scores as well as "calendar" on its own
    assert.are.equal(fuzzy.score("cal", "calendar"), fuzzy.score("cal", "Lock calendar"))
  end)
end)

describe("fuzzy.filter", function()
  local entries = {
    { text = "Toggle Hammerspoon Console", subText = "✧Y" },
    { text = "Remind calendar popup", subText = "✧W" },
    { text = "Copy date to clipboard", subText = "⌘⌥D" },
    { text = "Lock screen", subText = "✧L" },
    { text = "Pomodoro stats overlay", subText = "⌘⌃⌥⇧P" },
  }
  local fields = function(e) return { e.text, e.subText } end
  local function texts(list)
    local out = {}
    for i, e in ipairs(list) do out[i] = e.text end
    return out
  end

  it("returns everything in the original order for an empty query", function()
    assert.are.same(texts(entries), texts(fuzzy.filter("", entries, fields)))
  end)

  it("drops items that don't match", function()
    assert.are.same({ "Remind calendar popup" }, texts(fuzzy.filter("rcal", entries, fields)))
  end)

  it("searches the shortcut as well as the description", function()
    assert.are.same({ "Copy date to clipboard" }, texts(fuzzy.filter("⌘⌥d", entries, fields)))
    assert.are.same({ "Toggle Hammerspoon Console", "Remind calendar popup", "Lock screen" },
      texts(fuzzy.filter("✧", entries, fields)))
  end)

  it("puts the best match first", function()
    -- "Lock" starts with "lo"; the others only have a scattered l...o, so they
    -- tie and keep their original order
    assert.are.same({ "Lock screen", "Toggle Hammerspoon Console", "Remind calendar popup",
                      "Copy date to clipboard" },
      texts(fuzzy.filter("lo", entries, fields)))
  end)

  it("keeps the original order between equal scores", function()
    local same = { { text = "a one" }, { text = "a two" }, { text = "a three" } }
    local result = fuzzy.filter("a", same, function(e) return { e.text } end)
    assert.are.same({ "a one", "a two", "a three" }, texts(result))
  end)

  it("returns an empty list when nothing matches", function()
    assert.are.same({}, fuzzy.filter("qqq", entries, fields))
  end)
end)
