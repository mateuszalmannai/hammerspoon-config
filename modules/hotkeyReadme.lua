---@diagnostic disable: undefined-global
-- Writes the README's hotkey tables from the cheatsheet's rows, so the README
-- and ⌘⌥H can't disagree. Run `make readme` (Hammerspoon must be running with
-- the current config): it replaces everything between the
-- <!-- hotkeys:start --> and <!-- hotkeys:end --> lines in README.md.
-- Everything except write() is plain Lua; see spec/hotkey_readme_spec.lua.

local hotkeyReadme = {}

local START = "<!-- hotkeys:start -->"
local END = "<!-- hotkeys:end -->"

local modifierSymbols = { ["⌘"] = true, ["⌃"] = true, ["⌥"] = true, ["⇧"] = true, ["✧"] = true }
local keyNames = { UP = "↑", DOWN = "↓", LEFT = "←", RIGHT = "→", SPACE = "Space" }

-- "⌘⌃⌥UP" -> "⌘⌃⌥", "UP"
local function splitModifiers(s)
  local rest = 1
  for pos, code in utf8.codes(s) do
    if not modifierSymbols[utf8.char(code)] then rest = pos break end
    rest = pos + #utf8.char(code)
  end
  return s:sub(1, rest - 1), s:sub(rest)
end

local function readableHotkey(s)
  local mods, key = splitModifiers(s)
  key = keyNames[key] or key
  if mods == "⌘⌃⌥" then return "Hyper+" .. key end
  if mods == "✧" then return "Hyper+⇧" .. key end
  return mods .. key
end

-- A key pressed after the hotkey, as typed: "S" -> "s", "⇧D" stays
local function readableStep(s)
  local mods, key = splitModifiers(s)
  if mods == "" then key = keyNames[key] or key:lower() end
  return mods .. key
end

--- hotkeyReadme.readableCombo(combo) -> string
--- A cheatsheet combo as the README writes it: "⌘⌃⌥L" -> "Hyper+L",
--- "✧N" -> "Hyper+⇧N", "⌘⌃⌥UP" -> "Hyper+↑", and key sequences with arrows,
--- "⌘⌃⌥SPACE S L" -> "Hyper+Space → s → l". Other combos are kept ("⌘⌥H").
function hotkeyReadme.readableCombo(combo)
  local parts = {}
  for part in combo:gmatch("%S+") do parts[#parts + 1] = part end
  local out = { readableHotkey(parts[1] or "") }
  for i = 2, #parts do out[#out + 1] = readableStep(parts[i]) end
  return table.concat(out, " → ")
end

--- hotkeyReadme.markdown(rows) -> string
--- A "### Group" heading and a two-column table per section, from rows
--- ({text, combo, group}) already in section order (hotkeyCheatsheet.rows).
function hotkeyReadme.markdown(rows)
  local lines, group = {}, nil
  for _, row in ipairs(rows) do
    if row.group ~= group then
      if group then lines[#lines + 1] = "" end
      group = row.group
      lines[#lines + 1] = "### " .. group
      lines[#lines + 1] = ""
      lines[#lines + 1] = "| Hotkey | Action |"
      lines[#lines + 1] = "|---|---|"
    end
    local text = row.text:gsub("|", "\\|")
    lines[#lines + 1] = "| " .. hotkeyReadme.readableCombo(row.combo) .. " | " .. text .. " |"
  end
  return table.concat(lines, "\n")
end

--- hotkeyReadme.splice(text, block) -> string or nil, error
--- text with the lines between the start and end markers replaced by block.
function hotkeyReadme.splice(text, block)
  local s = text:find(START, 1, true)
  local e = text:find(END, 1, true)
  if not s or not e or e < s then
    return nil, "README needs the lines " .. START .. " and " .. END
  end
  local before = text:sub(1, s + #START - 1)
  local after = text:sub(e)
  return before .. "\n\n" .. block .. "\n\n" .. after
end

--- hotkeyReadme.write([path]) -> string
--- Rewrites the hotkey tables in README.md (or path) from the live cheatsheet.
--- Returns a one-line summary for `make readme` to print; errors if the
--- markers are missing.
function hotkeyReadme.write(path)
  path = path or (hs.configdir .. "/README.md")
  local rows = require('modules.hotkeyCheatsheet').rows(true)
  local f = assert(io.open(path, "r"))
  local text = f:read("a")
  f:close()
  local new = assert(hotkeyReadme.splice(text, hotkeyReadme.markdown(rows)))
  if new == text then return "README hotkeys already up to date (" .. #rows .. " rows)" end
  f = assert(io.open(path, "w"))
  f:write(new)
  f:close()
  return "README hotkeys updated (" .. #rows .. " rows)"
end

return hotkeyReadme
