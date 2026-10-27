---@diagnostic disable: undefined-global
local hotkeyCheatsheet = {}

local fuzzy = require('modules.fuzzy')

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

-- Every currently enabled hotkey as {combo, description} pairs
function hotkeyCheatsheet.entries()
  local list = {}
  for _, hk in ipairs(hs.hotkey.getHotkeys()) do
    list[#list + 1] = {hk.idx, hotkeysInfo[hk.idx] or "(no description)"}
  end
  return list
end

-- Chooser listing every enabled hotkey, filtered by fuzzy search on the
-- description and the shortcut (so "⌘⌃⌥" lists the Hyper bindings)
local chooser = nil
local choices = {}

local function refreshChoices()
  choices = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    choices[#choices + 1] = { text = e[2], subText = e[1] }
  end
  table.sort(choices, function(a, b) return a.subText < b.subText end)
end

local function getChooser()
  if not chooser then
    chooser = hs.chooser.new(function() end)
    chooser:placeholderText("Search hotkeys")
    chooser:queryChangedCallback(function(query)
      chooser:choices(fuzzy.filter(query, choices, function(c) return { c.text, c.subText } end))
    end)
  end
  return chooser
end

function hotkeyCheatsheet.show()
  if #hs.hotkey.getHotkeys() == 0 then
    hs.alert.show("No hotkeys bound!")
    return
  end
  refreshChoices()
  local c = getChooser()
  c:query("")
  c:choices(choices)
  c:show()
end

function hotkeyCheatsheet.hide()
  if chooser then chooser:hide() end
end

function hotkeyCheatsheet.toggle()
  if chooser and chooser:isVisible() then
    hotkeyCheatsheet.hide()
  else
    hotkeyCheatsheet.show()
  end
end

return hotkeyCheatsheet
