---@diagnostic disable: undefined-global
local hotkeyCheatsheet = {}

local searchPanel = require('modules.searchPanel')

-- Table to store all bound hotkeys info:
local hotkeysInfo = {}
-- and the group each one was bound in, by combo
local hotkeyGroups = {}

--- hotkeyCheatsheet.groupOrder
--- The order of the sections the cheatsheet shows while the search box is
--- empty. Groups not listed come after these, in alphabetical order.
hotkeyCheatsheet.groupOrder = { "Windows", "Apps", "Tools", "Clipboard", "System", "Hammerspoon", "Leader menu" }

-- Group for the hotkeys and rows described from now on; see hotkeyCheatsheet.group
local currentGroup = nil

--- hotkeyCheatsheet.group(name)
--- Puts the hotkeys bound or described after this call in the section `name`,
--- until the next call. Rows bound before any call go under "Other".
function hotkeyCheatsheet.group(name)
  currentGroup = name
end

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
  hotkeyGroups[comboString(mods, key)] = currentGroup
end

-- Wrapper to bind hotkeys and store combo + description manually
function hotkeyCheatsheet.bindHotkey(mods, key, fn, description)
  local hk = hs.hotkey.bind(mods, key, fn)
  if hk then
    hotkeysInfo[comboString(mods, key)] = description or "No description"
    hotkeyGroups[comboString(mods, key)] = currentGroup
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
        list[#list + 1] = { text = table.concat(here, " › "), combo = step, fn = v, group = currentGroup }
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
      group = currentGroup,
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

-- Every currently enabled hotkey as {combo, description, group}
function hotkeyCheatsheet.entries()
  local list = {}
  for _, hk in ipairs(hs.hotkey.getHotkeys()) do
    list[#list + 1] = {hk.idx, hotkeysInfo[hk.idx] or "(no description)", hotkeyGroups[hk.idx]}
  end
  return list
end

--- hotkeyCheatsheet.orderRows(rows, order) -> rows
--- Sorts rows ({text, combo, group}) in place by section, in the order of the
--- group names in `order` (unlisted groups next, alphabetically, then rows with
--- no group as "Other"), and by combo within a section. A combo sorts before
--- its key sequences, so "⌘⌃⌥W 1" follows "⌘⌃⌥W". Sets a missing group to
--- "Other". Plain Lua; see spec/hotkey_cheatsheet_spec.lua.
function hotkeyCheatsheet.orderRows(rows, order)
  local rank = {}
  for i, name in ipairs(order) do rank[name] = i end
  local function key(row)
    if row.group == "Other" then return math.huge, "" end
    return rank[row.group] or #order + 1, row.group
  end
  for _, row in ipairs(rows) do row.group = row.group or "Other" end
  table.sort(rows, function(a, b)
    local ra, ga = key(a)
    local rb, gb = key(b)
    if ra ~= rb then return ra < rb end
    if ga ~= gb then return ga < gb end
    return a.combo < b.combo
  end)
  return rows
end

-- Panel listing every enabled hotkey, leader action and popup key, filtered by fuzzy search on the
-- description and the shortcut (so "⌘⌃⌥" lists the Hyper bindings).
-- With the search box empty, rows are shown in sections (hotkeyCheatsheet.group).
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

--- hotkeyCheatsheet.rows([all]) -> list
--- Every row of the cheatsheet ({text, combo, group, fn}), in section order.
--- Leaves out the rows that only reopen the cheatsheet, unless `all` is true
--- (the README lists them).
function hotkeyCheatsheet.rows(all)
  local list = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    if all or e[1] ~= ownCombo then
      list[#list + 1] = { text = e[2], combo = e[1], group = e[3] }
    end
  end
  for _, e in ipairs(sequenceEntries) do
    -- running the cheatsheet from itself would only reopen it
    if all or e.fn ~= hotkeyCheatsheet.toggle then
      list[#list + 1] = { text = e.text, combo = e.combo, fn = e.fn, group = e.group }
    end
  end
  return hotkeyCheatsheet.orderRows(list, hotkeyCheatsheet.groupOrder)
end

function hotkeyCheatsheet.isVisible()
  return panel:isVisible()
end

function hotkeyCheatsheet.show()
  if #hs.hotkey.getHotkeys() == 0 then
    hs.alert.show("No hotkeys bound!")
    return
  end
  panel:show(hotkeyCheatsheet.rows())
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
