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
