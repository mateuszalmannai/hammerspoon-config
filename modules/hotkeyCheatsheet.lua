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

-- Chooser listing every enabled hotkey, filtered by fuzzy search on the
-- description and the shortcut (so "⌘⌃⌥" lists the Hyper bindings).
-- Enter runs the selected hotkey; Esc closes.
local chooser = nil
local choices = {}

-- A list left open across a config reload is orphaned on screen, out of reach
-- of the reloaded config. Close it first: delete() alone doesn't take the window
-- down before the old Lua state is gone, hide() does.
local previousShutdown = hs.shutdownCallback
hs.shutdownCallback = function()
  if chooser then chooser:hide() chooser:delete() end
  if previousShutdown then previousShutdown() end
end

local function refreshChoices()
  choices = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    if e[1] ~= ownCombo then
      choices[#choices + 1] = { text = e[2], subText = e[1] }
    end
  end
  table.sort(choices, function(a, b) return a.subText < b.subText end)
end

local function getChooser()
  if not chooser then
    chooser = hs.chooser.new(function(choice)
      if not choice then return end   -- Esc
      local mods, key = hotkeyCheatsheet.parseCombo(choice.subText)
      -- give focus a moment to return to the previous app, so window hotkeys
      -- act on its window
      hs.timer.doAfter(0.2, function() hs.eventtap.keyStroke(mods, key) end)
    end)
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
