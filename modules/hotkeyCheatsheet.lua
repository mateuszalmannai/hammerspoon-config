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

-- Panel listing every enabled hotkey, filtered by fuzzy search on the
-- description and the shortcut (so "⌘⌃⌥" lists the Hyper bindings).
-- Enter (or a click) runs the selected hotkey; Esc or clicking elsewhere closes.
-- Drawn with hs.webview rather than hs.chooser, so it can be dark, slightly
-- transparent and rounded.
local PANEL_W, PANEL_H = 640, 460

local html = [==[
<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden;
    font: 14px -apple-system, BlinkMacSystemFont, sans-serif; color: #eee;
    -webkit-user-select: none; cursor: default; }
  #panel { box-sizing: border-box; height: 100%; display: flex; flex-direction: column;
    background: rgba(24, 24, 27, 0.86); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px; overflow: hidden; }
  #q { flex: none; margin: 12px; padding: 10px 12px; font: inherit; font-size: 17px;
    color: #fff; background: rgba(255, 255, 255, 0.07); border: none; border-radius: 8px;
    outline: none; }
  #q::placeholder { color: rgba(255, 255, 255, 0.35); }
  #list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
  #list::-webkit-scrollbar { display: none; }
  .row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 7px; }
  .row.sel { background: rgba(10, 132, 255, 0.55); }
  .desc { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .combo { flex: none; font-size: 13px; padding: 2px 7px; border-radius: 5px;
    background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); }
  .empty { padding: 14px 10px; color: rgba(255, 255, 255, 0.4); }
</style></head><body>
<div id="panel"><input id="q" placeholder="Search hotkeys" autocomplete="off" spellcheck="false"><div id="list"></div></div>
<script>
  const q = document.getElementById('q'), list = document.getElementById('list');
  let items = [], sel = 0;
  const post = m => webkit.messageHandlers.cheatsheet.postMessage(m);
  function draw() {
    list.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.textContent = 'No matching hotkeys'; list.appendChild(e); return;
    }
    items.forEach((it, i) => {
      const r = document.createElement('div'); r.className = 'row' + (i === sel ? ' sel' : '');
      const d = document.createElement('span'); d.className = 'desc'; d.textContent = it.text;
      const c = document.createElement('span'); c.className = 'combo'; c.textContent = it.combo;
      r.append(d, c);
      r.onmousemove = () => { if (sel !== i) { sel = i; draw(); } };
      r.onclick = () => post({ type: 'run', combo: it.combo });
      list.appendChild(r);
    });
    list.children[sel].scrollIntoView({ block: 'nearest' });
  }
  function render(data) { items = Array.isArray(data.items) ? data.items : []; sel = 0; draw(); }
  function open(data) { q.value = ''; render(data); q.focus(); }
  function move(d) { if (items.length) { sel = (sel + d + items.length) % items.length; draw(); } }
  q.addEventListener('input', () => post({ type: 'query', query: q.value }));
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { move(1); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) { move(-1); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[sel]) post({ type: 'run', combo: items[sel].combo }); e.preventDefault(); }
    else if (e.key === 'Escape') { post({ type: 'close' }); e.preventDefault(); }
  });
  window.addEventListener('blur', () => post({ type: 'close' }));
  document.addEventListener('mousedown', e => { if (e.target !== q) e.preventDefault(); });
</script></body></html>
]==]

local panel = nil
local ready = false      -- page finished loading
local pending = nil      -- JS to run once it has
local choices = {}

-- A panel left open across a config reload is orphaned on screen, out of reach
-- of the reloaded config. Close it first.
local previousShutdown = hs.shutdownCallback
hs.shutdownCallback = function()
  if panel then panel:hide() panel:delete() end
  if previousShutdown then previousShutdown() end
end

local function refreshChoices()
  choices = {}
  for _, e in ipairs(hotkeyCheatsheet.entries()) do
    if e[1] ~= ownCombo then
      choices[#choices + 1] = { text = e[2], combo = e[1] }
    end
  end
  table.sort(choices, function(a, b) return a.combo < b.combo end)
end

local function runJS(fnName, list)
  local js = fnName .. "(" .. hs.json.encode({ items = list }) .. ")"
  if ready then panel:evaluateJavaScript(js) else pending = js end
end

local function onMessage(msg)
  local body = msg.body or {}
  if body.type == "query" then
    runJS("render", fuzzy.filter(body.query, choices, function(c) return { c.text, c.combo } end))
  elseif body.type == "run" then
    hotkeyCheatsheet.hide()
    local mods, key = hotkeyCheatsheet.parseCombo(body.combo)
    -- give focus a moment to return to the previous app, so window hotkeys
    -- act on its window
    hs.timer.doAfter(0.2, function() hs.eventtap.keyStroke(mods, key) end)
  elseif body.type == "close" then
    hotkeyCheatsheet.hide()
  end
end

local function getPanel()
  if not panel then
    local uc = hs.webview.usercontent.new("cheatsheet"):setCallback(onMessage)
    panel = hs.webview.new({ x = 0, y = 0, w = PANEL_W, h = PANEL_H }, {}, uc)
      -- nonactivating: takes keyboard input without bringing Hammerspoon (and
      -- its console) to the front, so the previous app keeps focus throughout
      :windowStyle({ "borderless", "nonactivating" })
      :allowTextEntry(true)
      :transparent(true)
      :shadow(true)
      :closeOnEscape(false)
      :deleteOnClose(false)
      :level(hs.drawing.windowLevels.modalPanel)
      :behaviorAsLabels({ "moveToActiveSpace", "transient" })
      :navigationCallback(function(action)
        if action == "didFinishNavigation" then
          ready = true
          if pending then panel:evaluateJavaScript(pending) pending = nil end
        end
      end)
      :html(html)
  end
  return panel
end

function hotkeyCheatsheet.isVisible()
  return panel ~= nil and panel:isVisible()
end

function hotkeyCheatsheet.show()
  if #hs.hotkey.getHotkeys() == 0 then
    hs.alert.show("No hotkeys bound!")
    return
  end
  refreshChoices()
  local p = getPanel()
  local screen = hs.screen.mainScreen():frame()
  p:topLeft({ x = screen.x + (screen.w - PANEL_W) / 2, y = screen.y + screen.h * 0.18 })
  p:show()
  runJS("open", choices)
end

function hotkeyCheatsheet.hide()
  if not hotkeyCheatsheet.isVisible() then return end
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
