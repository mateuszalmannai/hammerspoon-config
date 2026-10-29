local hotkeyReadme = require("modules.hotkeyReadme")

describe("hotkeyReadme.readableCombo", function()
  local r = hotkeyReadme.readableCombo

  it("writes ⌘⌃⌥ as Hyper and ✧ as Hyper+⇧", function()
    assert.are.equal("Hyper+L", r("⌘⌃⌥L"))
    assert.are.equal("Hyper+⇧N", r("✧N"))
  end)

  it("names arrow keys and Space", function()
    assert.are.equal("Hyper+↑", r("⌘⌃⌥UP"))
    assert.are.equal("Hyper+Space", r("⌘⌃⌥SPACE"))
  end)

  it("keeps other combos as they are", function()
    assert.are.equal("⌘⌥H", r("⌘⌥H"))
    assert.are.equal("⌃/", r("⌃/"))
    assert.are.equal("⌥⇧T", r("⌥⇧T"))
  end)

  it("writes key sequences with arrows and the later keys as typed", function()
    assert.are.equal("Hyper+Space → s → l", r("⌘⌃⌥SPACE S L"))
    assert.are.equal("Hyper+W → 2", r("⌘⌃⌥W 2"))
    assert.are.equal("Hyper+Space → ⇧D", r("⌘⌃⌥SPACE ⇧D"))
  end)
end)

describe("hotkeyReadme.markdown", function()
  it("makes a heading and table per section and escapes pipes", function()
    local md = hotkeyReadme.markdown({
      { text = "Snap up", combo = "⌘⌃⌥UP", group = "Windows" },
      { text = "Move to display 1", combo = "⌘⌥1", group = "Windows" },
      { text = "a | b", combo = "⌘⇧B", group = "Apps" },
    })
    assert.are.equal(table.concat({
      "### Windows", "", "| Hotkey | Action |", "|---|---|",
      "| Hyper+↑ | Snap up |", "| ⌘⌥1 | Move to display 1 |", "",
      "### Apps", "", "| Hotkey | Action |", "|---|---|",
      "| ⌘⇧B | a \\| b |",
    }, "\n"), md)
  end)
end)

describe("hotkeyReadme.splice", function()
  it("replaces what's between the markers and keeps the rest", function()
    local text = "intro\n<!-- hotkeys:start -->\nold\n<!-- hotkeys:end -->\nafter\n"
    assert.are.equal("intro\n<!-- hotkeys:start -->\n\nNEW\n\n<!-- hotkeys:end -->\nafter\n",
      hotkeyReadme.splice(text, "NEW"))
  end)

  it("gives the same text when run twice", function()
    local once = hotkeyReadme.splice("<!-- hotkeys:start -->\n<!-- hotkeys:end -->\n", "X")
    assert.are.equal(once, hotkeyReadme.splice(once, "X"))
  end)

  it("fails without the markers", function()
    local ok, err = hotkeyReadme.splice("no markers here", "X")
    assert.is_nil(ok)
    assert.matches("hotkeys:start", err)
  end)
end)
