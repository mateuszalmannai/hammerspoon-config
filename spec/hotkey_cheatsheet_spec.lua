-- The module only touches hs at load time to install its reload hook
_G.hs = _G.hs or {}
local hotkeyCheatsheet = require("modules.hotkeyCheatsheet")

describe("hotkeyCheatsheet.parseCombo", function()
  local function parse(combo)
    local mods, key = hotkeyCheatsheet.parseCombo(combo)
    return { mods = mods, key = key }
  end

  it("splits modifiers from a letter key and lowercases it", function()
    assert.are.same({ mods = { "cmd", "alt" }, key = "h" }, parse("⌘⌥H"))
  end)

  it("handles Hyper (⌘⌃⌥)", function()
    assert.are.same({ mods = { "cmd", "ctrl", "alt" }, key = "w" }, parse("⌘⌃⌥W"))
  end)

  it("expands ✧ to all four modifiers", function()
    assert.are.same({ mods = { "cmd", "ctrl", "alt", "shift" }, key = "p" }, parse("✧P"))
  end)

  it("keeps named keys as hs.keycodes names", function()
    assert.are.same({ mods = { "cmd", "ctrl", "alt" }, key = "space" }, parse("⌘⌃⌥SPACE"))
    assert.are.same({ mods = { "cmd", "ctrl", "alt" }, key = "left" }, parse("⌘⌃⌥LEFT"))
  end)

  it("handles punctuation and digit keys", function()
    assert.are.same({ mods = { "ctrl" }, key = "/" }, parse("⌃/"))
    assert.are.same({ mods = { "cmd", "alt" }, key = "1" }, parse("⌘⌥1"))
  end)

  it("handles shift with other modifiers", function()
    assert.are.same({ mods = { "alt", "shift" }, key = "t" }, parse("⌥⇧T"))
    assert.are.same({ mods = { "cmd", "shift" }, key = "b" }, parse("⌘⇧B"))
  end)

  it("handles a key with no modifiers", function()
    assert.are.same({ mods = {}, key = "f13" }, parse("F13"))
  end)
end)

describe("hotkeyCheatsheet.describeKeymap", function()
  -- keys shaped like RecursiveBinder.singleKey: {mods, key, name}
  local function key(k, name, mods) return { mods or {}, k, name } end
  local lock, sleep, brave, copyDate = function() end, function() end, function() end, function() end

  local rows = hotkeyCheatsheet.describeKeymap({ "ctrl", "alt", "cmd" }, "space", {
    [key("s", "system+")] = {
      [key("l", "lock screen")] = lock,
      [key("z", "sleep")] = sleep,
    },
    [key("a", "apps+")] = { [key("b", "Brave")] = brave },
    [key("d", "copy date", { "shift" })] = copyDate,
  })

  it("lists every action with its path and key sequence, sorted by combo (byte order, so ⇧ comes last)", function()
    assert.are.same({
      { text = "Apps › Brave", combo = "⌘⌃⌥SPACE A B", fn = brave },
      { text = "System › Lock screen", combo = "⌘⌃⌥SPACE S L", fn = lock },
      { text = "System › Sleep", combo = "⌘⌃⌥SPACE S Z", fn = sleep },
      { text = "Copy date", combo = "⌘⌃⌥SPACE ⇧D", fn = copyDate },
    }, rows)
  end)
end)

describe("hotkeyCheatsheet.describeSequence", function()
  it("turns keys pressed after a hotkey into rows", function()
    local dates = function() end
    assert.are.same({
      { text = "HSearch › Dates", combo = "⌘⌃⌥G D", fn = dates },
    }, hotkeyCheatsheet.describeSequence({ "ctrl", "alt", "cmd" }, "g", {
      { key = "d", text = "HSearch › Dates", fn = dates },
    }))
  end)
end)

describe("hotkeyCheatsheet.describeViews", function()
  local shown
  local popup = {
    views = { { name = "week", key = "1", label = "week" }, { name = "burndown", key = "b" } },
    show = function(_, name) shown = name end,
  }
  local rows = hotkeyCheatsheet.describeViews({ "ctrl", "alt", "cmd" }, "w", "Remind calendar", popup)

  it("makes a row per view, using the label (or the name) capitalised", function()
    assert.are.equal("Remind calendar › Week", rows[1].text)
    assert.are.equal("⌘⌃⌥W 1", rows[1].combo)
    assert.are.equal("Remind calendar › Burndown", rows[2].text)
    assert.are.equal("⌘⌃⌥W B", rows[2].combo)
  end)

  it("opens the popup on that view when run", function()
    rows[2].fn()
    assert.are.equal("burndown", shown)
  end)
end)

describe("hotkeyCheatsheet.orderRows", function()
  local function row(combo, group) return { text = combo, combo = combo, group = group } end
  local function combos(rows)
    local out = {}
    for i, r in ipairs(rows) do out[i] = r.group .. " " .. r.combo end
    return out
  end

  it("orders by the listed groups, then unlisted ones alphabetically, then Other", function()
    local rows = hotkeyCheatsheet.orderRows({
      row("⌘⌥1", "Windows"), row("⌘⇧B", "Apps"), row("✧N", nil),
      row("⌘⌃⌥W", "Zebra"), row("⌘⌃⌥C", "Desk"), row("⌘⌃⌥UP", "Windows"),
    }, { "Apps", "Windows" })
    assert.are.same({
      "Apps ⌘⇧B", "Windows ⌘⌃⌥UP", "Windows ⌘⌥1", "Desk ⌘⌃⌥C", "Zebra ⌘⌃⌥W", "Other ✧N",
    }, combos(rows))
  end)

  it("puts a popup's keys right after the hotkey that opens it", function()
    local rows = hotkeyCheatsheet.orderRows({
      row("⌘⌃⌥W 2", "Tools"), row("⌘⌃⌥T", "Tools"), row("⌘⌃⌥W", "Tools"), row("⌘⌃⌥W 1", "Tools"),
    }, { "Tools" })
    assert.are.same({ "Tools ⌘⌃⌥T", "Tools ⌘⌃⌥W", "Tools ⌘⌃⌥W 1", "Tools ⌘⌃⌥W 2" }, combos(rows))
  end)
end)
