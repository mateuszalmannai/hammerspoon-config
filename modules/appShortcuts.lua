---@diagnostic disable: undefined-global
-- Hyper+/: the frontmost app's menu shortcuts in the same searchable panel as
-- the hotkey cheatsheet (replaces the KSheet spoon). Each row is the menu path
-- ("Edit › Find › Find Next") and its shortcut; Enter or a click picks that
-- menu item. The menus are read in the background, since big apps (Xcode,
-- Office) can take a second, so the panel opens on "Loading…".

local searchPanel = require('modules.searchPanel')

local appShortcuts = {}

-- Modifier symbols in the order macOS menus show them
local modifierOrder = { { "ctrl", "⌃" }, { "alt", "⌥" }, { "shift", "⇧" }, { "cmd", "⌘" } }

local function modifiersToString(mods)
  local present = {}
  for _, m in ipairs(mods or {}) do present[m] = true end
  local out = ""
  for _, pair in ipairs(modifierOrder) do
    if present[pair[1]] then out = out .. pair[2] end
  end
  return out
end

local function walk(items, path, glyphs, out)
  for _, item in ipairs(items or {}) do
    local title = item.AXTitle
    local children = type(item.AXChildren) == "table" and item.AXChildren[1] or nil
    if type(title) == "string" and title ~= "" then
      local here = {}
      for i, p in ipairs(path) do here[i] = p end
      here[#here + 1] = title
      if children then
        walk(children, here, glyphs, out)
      else
        local char = item.AXMenuItemCmdChar or ""
        local glyph = glyphs[item.AXMenuItemCmdGlyph] or ""
        if char ~= "" or glyph ~= "" then
          out[#out + 1] = {
            text = table.concat(here, " › "),
            combo = modifiersToString(item.AXMenuItemCmdModifiers) .. char .. glyph,
            path = here,
          }
        end
      end
    end
  end
  return out
end

--- appShortcuts.collect(menuTree, glyphs) -> list
--- Every menu item with a keyboard shortcut in an hs.application:getMenuItems()
--- tree, as {text = "Edit › Copy", combo = "⌘C", path = {"Edit", "Copy"}}, in
--- menu order. glyphs maps AXMenuItemCmdGlyph numbers to symbols
--- (hs.application.menuGlyphs). Plain Lua; see spec/app_shortcuts_spec.lua.
function appShortcuts.collect(menuTree, glyphs)
  return walk(menuTree, {}, glyphs or {}, {})
end

local currentApp = nil
local generation = 0   -- ignores menus that arrive after the panel was closed or reopened

local panel = searchPanel.new({
  emptyText = "No matching shortcuts",
  onRun = function(item)
    local app = currentApp
    -- give focus a moment to settle back on the app before picking the item
    hs.timer.doAfter(0.1, function()
      if app and not app:selectMenuItem(item.path) then
        hs.alert.show("Couldn't select " .. item.text)
      end
    end)
  end,
})

function appShortcuts.isVisible()
  return panel:isVisible()
end

function appShortcuts.show()
  local app = hs.application.frontmostApplication()
  if not app then return end
  currentApp = app
  generation = generation + 1
  local mine = generation
  panel:show(nil, { placeholder = "Search " .. (app:title() or "app") .. " shortcuts" })
  app:getMenuItems(function(tree)
    if mine ~= generation or not panel:isVisible() then return end
    panel:setItems(appShortcuts.collect(tree, hs.application.menuGlyphs))
  end)
end

function appShortcuts.hide()
  panel:hide()
end

function appShortcuts.toggle()
  if appShortcuts.isVisible() then
    appShortcuts.hide()
  else
    appShortcuts.show()
  end
end

return appShortcuts
