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
