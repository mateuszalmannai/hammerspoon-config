---@diagnostic disable: undefined-global
local hotkeyCheatsheet = {}

local searchPanel = require('modules.searchPanel')

-- Table to store all bound hotkeys info:
local hotkeysInfo = {}

-- Create a string representing modifiers using symbols, in the same order
-- hs.hotkey uses for its idx field (⌘⌃⌥⇧), so combos match getHotkeys().
-- Like hs.hotkey, all four modifiers together are shown as ✧ (hyper).
local function modifiersToString(mods)
  local present = {}
  if type(mods) == "table" then
    for _, m in ipairs(mods) do
      if type(m) == "string" then present[m:lower()] = true end
    end
  end
  if present.cmd and present.ctrl and present.alt and present.shift then return '✧' end
  local out = ''
  if present.cmd then out = out .. '⌘' end
  if present.ctrl then out = out .. '⌃' end
  if present.alt then out = out .. '⌥' end
  if present.shift then out = out .. '⇧' end
  return out
end

local function comboString(mods, key)
  return modifiersToString(mods) .. tostring(key):upper()
end

local symbolMods = {
  ["✧"] = { "cmd", "ctrl", "alt", "shift" },
  ["⌘"] = { "cmd" }, ["⌃"] = { "ctrl" }, ["⌥"] = { "alt" }, ["⇧"] = { "shift" },
}

-- Turns a combo string as shown by hs.hotkey ("⌘⌃⌥UP", "✧P", "⌃/") back into
-- modifiers and a key name for hs.eventtap.keyStroke ({"cmd","ctrl","alt"}, "up")
function hotkeyCheatsheet.parseCombo(combo)
  local mods, rest = {}, 1
  for pos, code in utf8.codes(combo) do
    local m = symbolMods[utf8.char(code)]
    if not m then rest = pos break end
    for _, name in ipairs(m) do mods[#mods + 1] = name end
    rest = pos + #utf8.char(code)
  end
  return mods, combo:sub(rest):lower()
end

-- Attach a description to a hotkey bound elsewhere (e.g. by a Spoon)
function hotkeyCheatsheet.describe(mods, key, description)
  hotkeysInfo[comboString(mods, key)] = description
end

-- Wrapper to bind hotkeys and store combo + description manually
function hotkeyCheatsheet.bindHotkey(mods, key, fn, description)
  local hk = hs.hotkey.bind(mods, key, fn)
  if hk then
    hotkeysInfo[comboString(mods, key)] = description or "No description"
    return hk
  else
    hs.alert.show(string.format("Failed to bind hotkey: %s + %s", table.concat(mods, "+"), key))
    return nil
  end
end

-- Binds the hotkey that opens the cheatsheet itself; it's left out of the list,
-- since running it from there would only reopen the list
local ownCombo = nil
function hotkeyCheatsheet.bindToggle(mods, key, description)
  ownCombo = comboString(mods, key)
  return hotkeyCheatsheet.bindHotkey(mods, key, hotkeyCheatsheet.toggle, description)
end

-- Every currently enabled hotkey as {combo, description} pairs
function hotkeyCheatsheet.entries()
  local list = {}
  for _, hk in ipairs(hs.hotkey.getHotkeys()) do
    list[#list + 1] = {hk.idx, hotkeysInfo[hk.idx] or "(no description)"}
  end
  return list
end

-- Panel listing every enabled hotkey, filtered by fuzzy search on the
-- description and the shortcut (so "⌘⌃⌥" lists the Hyper bindings).
-- Enter (or a click) runs the selected hotkey; see modules/searchPanel.lua.
local panel = searchPanel.new({
  placeholder = "Search hotkeys",
  emptyText = "No matching hotkeys",
  onRun = function(item)
    local mods, key = hotkeyCheatsheet.parseCombo(item.combo)
    -- give focus a moment to return to the previous app, so window hotkeys
    -- act on its window
    hs.timer.doAfter(0.2, function() hs.eventtap.keyStroke(mods, key) end)
  end,
})

local function choices()
  local list = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    if e[1] ~= ownCombo then
      list[#list + 1] = { text = e[2], combo = e[1] }
    end
  end
  table.sort(list, function(a, b) return a.combo < b.combo end)
  return list
end

function hotkeyCheatsheet.isVisible()
  return panel:isVisible()
end

function hotkeyCheatsheet.show()
  if #hs.hotkey.getHotkeys() == 0 then
    hs.alert.show("No hotkeys bound!")
    return
  end
  panel:show(choices())
end

function hotkeyCheatsheet.hide()
  panel:hide()
end

function hotkeyCheatsheet.toggle()
  if hotkeyCheatsheet.isVisible() then
    hotkeyCheatsheet.hide()
  else
    hotkeyCheatsheet.show()
  end
end

return hotkeyCheatsheet
