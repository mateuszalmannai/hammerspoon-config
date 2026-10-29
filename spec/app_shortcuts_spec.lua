-- The module only touches hs at load time to install its reload hook
_G.hs = _G.hs or {}
local appShortcuts = require("modules.appShortcuts")

-- Shaped like hs.application:getMenuItems(): menu bar items, each with
-- AXChildren[1] holding the menu's items; submenus nest the same way
local function menu(title, items) return { AXTitle = title, AXChildren = { items } } end
local function item(title, char, mods, glyph)
  return { AXTitle = title, AXMenuItemCmdChar = char or "", AXMenuItemCmdModifiers = mods or {},
    AXMenuItemCmdGlyph = glyph or "" }
end

describe("appShortcuts.collect", function()
  it("lists items with shortcuts by menu path, in menu order", function()
    local tree = {
      menu("File", { item("New", "N", { "cmd" }), item("Open…", "O", { "cmd" }) }),
      menu("Edit", { item("Copy", "C", { "cmd" }) }),
    }
    assert.are.same({
      { text = "File › New", combo = "⌘N", path = { "File", "New" } },
      { text = "File › Open…", combo = "⌘O", path = { "File", "Open…" } },
      { text = "Edit › Copy", combo = "⌘C", path = { "Edit", "Copy" } },
    }, appShortcuts.collect(tree, {}))
  end)

  it("skips items without a shortcut and separators", function()
    local tree = { menu("File", { item("Share"), item(""), item("Close", "W", { "cmd" }) }) }
    local got = appShortcuts.collect(tree, {})
    assert.are.equal(1, #got)
    assert.are.equal("File › Close", got[1].text)
  end)

  it("follows submenus", function()
    local tree = { menu("Edit", { menu("Find", { item("Find Next", "G", { "cmd" }) }) }) }
    assert.are.same({ "Edit", "Find", "Find Next" }, appShortcuts.collect(tree, {})[1].path)
    assert.are.equal("Edit › Find › Find Next", appShortcuts.collect(tree, {})[1].text)
  end)

  it("orders modifiers like macOS menus (⌃⌥⇧⌘)", function()
    local tree = { menu("View", { item("Full Screen", "F", { "cmd", "ctrl" }), item("X", "Z", { "cmd", "shift", "alt" }) }) }
    local got = appShortcuts.collect(tree, {})
    assert.are.equal("⌃⌘F", got[1].combo)
    assert.are.equal("⌥⇧⌘Z", got[2].combo)
  end)

  it("uses glyphs for keys without a character", function()
    local tree = { menu("Go", { item("Back", "", { "cmd" }, 100) }) }
    assert.are.equal("⌘←", appShortcuts.collect(tree, { [100] = "←" })[1].combo)
  end)

  it("copes with an empty or missing tree", function()
    assert.are.same({}, appShortcuts.collect({}, {}))
    assert.are.same({}, appShortcuts.collect(nil, {}))
  end)
end)
