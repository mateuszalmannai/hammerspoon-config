---@diagnostic disable: undefined-global
local hotkeyCheatsheet = {}

local css = [[
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
                 Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    background: rgba(0,0,0,0.85);
    color: white;
    padding: 20px;
  }
  h1 {
    font-size: 24pt;
    margin-bottom: 10px;
    text-align: center;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    padding: 8px 12px;
    border-bottom: 1px solid #444;
    text-align: left;
    vertical-align: top;
  }
  th {
    background-color: #222;
  }
  code {
    font-size: 14pt;
  }
]]

local view = nil

-- Table to store all bound hotkeys info:
local hotkeysInfo = {}

-- Helper to escape HTML
local function escapeHTML(s)
  s = s or ""
  s = s:gsub("&", "&amp;")
  s = s:gsub("<", "&lt;")
  s = s:gsub(">", "&gt;")
  s = s:gsub('"', "&quot;")
  s = s:gsub("'", "&#39;")
  return s
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

-- Generate HTML from every currently enabled hotkey
local function generateHTML()
  local rows = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    rows[#rows + 1] = string.format(
      '<tr><td><code>%s</code></td><td>%s</td></tr>',
      escapeHTML(e[1]),
      escapeHTML(e[2])
    )
  end

  table.sort(rows)

  local html = [[
<!DOCTYPE html>
<html lang="en">
<head><style>]] .. css .. [[</style></head>
<body>
<h1>Current Hammerspoon Hotkeys</h1>
<table>
<tr><th>Shortcut</th><th>Description</th></tr>
]] .. table.concat(rows, "\n") .. [[
</table>
</body>
</html>
]]
  return html
end

function hotkeyCheatsheet.show()
  if view then
    view:delete()
    view = nil
  end

  if #hs.hotkey.getHotkeys() == 0 then
    hs.alert.show("No hotkeys bound!")
    return
  end

  local screen = hs.screen.mainScreen()
  local frame = screen:frame()
  local rect = hs.geometry.rect(frame.x + frame.w * 0.1, frame.y + frame.h * 0.1, frame.w * 0.8, frame.h * 0.6)

  local html = generateHTML()

  view = hs.webview.new(rect, {developerExtrasEnabled=false})
        :windowStyle(hs.webview.windowMasks.utility | hs.webview.windowMasks.titled)
        :level(hs.drawing.windowLevels.floating)
        :html(html)
        :show()
end

function hotkeyCheatsheet.hide()
  if view then
    view:delete()
    view = nil
  end
end

function hotkeyCheatsheet.toggle()
  if view then
    hotkeyCheatsheet.hide()
  else
    hotkeyCheatsheet.show()
  end
end

return hotkeyCheatsheet

