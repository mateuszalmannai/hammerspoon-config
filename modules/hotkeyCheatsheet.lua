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

-- Rows for actions reached through a key sequence rather than a hotkey of
-- their own (the leader menu, the keys inside popups), as {text, combo, fn}
local sequenceEntries = {}

local function capitalize(s)
  return (s:gsub("^%l", string.upper))
end

--- hotkeyCheatsheet.describeKeymap(mods, key, keymap) -> list
--- Every action in a RecursiveBinder keymap (keys are {mods, key, name}, values
--- are functions or nested keymaps) as {text = "System › Lock screen",
--- combo = "⌘⌃⌥SPACE S L", fn = action}, sorted by combo. The rows appear in
--- the cheatsheet, and picking one runs fn. Group names' trailing "+" (as in
--- "system+") is dropped. Plain Lua; see spec/hotkey_cheatsheet_spec.lua.
function hotkeyCheatsheet.describeKeymap(mods, key, keymap)
  local list = {}
  local function walk(map, names, combo)
    for k, v in pairs(map) do
      local name = capitalize((k[3] or "?"):gsub("%+$", ""))
      local here = {}
      for i, n in ipairs(names) do here[i] = n end
      here[#here + 1] = name
      local step = combo .. " " .. modifiersToString(k[1]) .. tostring(k[2]):upper()
      if type(v) == "table" then
        walk(v, here, step)
      else
        list[#list + 1] = { text = table.concat(here, " › "), combo = step, fn = v }
      end
    end
  end
  walk(keymap, {}, comboString(mods, key))
  table.sort(list, function(a, b) return a.combo < b.combo end)
  for _, e in ipairs(list) do sequenceEntries[#sequenceEntries + 1] = e end
  return list
end

--- hotkeyCheatsheet.describeSequence(mods, key, steps) -> list
--- Rows for keys pressed after a hotkey, such as the keys inside a popup it
--- opens. steps is a list of {key = "2", text = "...", fn = action}; each
--- becomes {text, combo = "⌘⌃⌥W 2", fn} in the cheatsheet, and picking it runs
--- fn. Plain Lua; see spec/hotkey_cheatsheet_spec.lua.
function hotkeyCheatsheet.describeSequence(mods, key, steps)
  local list = {}
  for _, step in ipairs(steps) do
    list[#list + 1] = {
      text = step.text,
      combo = comboString(mods, key) .. " " .. tostring(step.key):upper(),
      fn = step.fn,
    }
  end
  for _, e in ipairs(list) do sequenceEntries[#sequenceEntries + 1] = e end
  return list
end

--- hotkeyCheatsheet.describeViews(mods, key, title, popup) -> list
--- describeSequence for a popup with switchable views, like RemindCalendar and
--- TaskwarriorViews: popup.views is a list of {name, key, label} and
--- popup:show(name) opens the popup on that view. Each view becomes a row such
--- as "Remind calendar › Two weeks" (⌘⌃⌥W 2) that opens the popup on it.
function hotkeyCheatsheet.describeViews(mods, key, title, popup)
  local steps = {}
  for _, view in ipairs(popup.views) do
    steps[#steps + 1] = {
      key = view.key,
      text = title .. " › " .. capitalize(view.label or view.name),
      fn = function() popup:show(view.name) end,
    }
  end
  return hotkeyCheatsheet.describeSequence(mods, key, steps)
end

-- Every currently enabled hotkey as {combo, description} pairs
function hotkeyCheatsheet.entries()
  local list = {}
  for _, hk in ipairs(hs.hotkey.getHotkeys()) do
    list[#list + 1] = {hk.idx, hotkeysInfo[hk.idx] or "(no description)"}
  end
  return list
end

-- Panel listing every enabled hotkey, leader action and popup key, filtered by fuzzy search on the
-- description and the shortcut (so "⌘⌃⌥" lists the Hyper bindings).
-- Enter (or a click) runs the selected hotkey; see modules/searchPanel.lua.
local panel = searchPanel.new({
  placeholder = "Search hotkeys",
  emptyText = "No matching hotkeys",
  onRun = function(item)
    -- give focus a moment to return to the previous app, so window hotkeys
    -- act on its window
    if item.fn then
      hs.timer.doAfter(0.2, item.fn)
    else
      local mods, key = hotkeyCheatsheet.parseCombo(item.combo)
      hs.timer.doAfter(0.2, function() hs.eventtap.keyStroke(mods, key) end)
    end
  end,
})

local function choices()
  local list = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    if e[1] ~= ownCombo then
      list[#list + 1] = { text = e[2], combo = e[1] }
    end
  end
  for _, e in ipairs(sequenceEntries) do
    -- running the cheatsheet from itself would only reopen it
    if e.fn ~= hotkeyCheatsheet.toggle then
      list[#list + 1] = { text = e.text, combo = e.combo, fn = e.fn }
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
