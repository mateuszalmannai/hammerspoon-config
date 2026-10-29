---@diagnostic disable: undefined-global
-- Dark, rounded, translucent search-as-you-type list, shared by the hotkey
-- cheatsheet (⌘⌥H) and the app shortcuts list (Hyper+/). Each row shows a
-- description and a shortcut; typing fuzzy-filters on both. Enter (or a click)
-- runs the selected item; Esc or clicking elsewhere closes.
-- Drawn with hs.webview rather than hs.chooser, so it can be dark, slightly
-- transparent and rounded.
--
--   local p = searchPanel.new({
--     placeholder = "Search hotkeys",
--     emptyText = "No matching hotkeys",
--     onRun = function(item) ... end,   -- the panel is already hidden
--   })
--   p:show(items)       -- items: { {text = "...", combo = "⌘K", ...}, ... }
--   p:show(nil)         -- open now showing "Loading…", then p:setItems(items)
--
-- Items may have a `group`: while the search box is empty, a heading is shown
-- before each run of items with the same group (so pass them sorted by group).

local fuzzy = require('modules.fuzzy')

local searchPanel = {}
searchPanel.__index = searchPanel

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
  .section { padding: 12px 10px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: rgba(255, 255, 255, 0.4); }
  .section:first-child { padding-top: 2px; }
</style></head><body>
<div id="panel"><input id="q" autocomplete="off" spellcheck="false"><div id="list"></div></div>
<script>
  const q = document.getElementById('q'), list = document.getElementById('list');
  let items = [], sel = 0, empty = '';
  const post = m => webkit.messageHandlers.panel.postMessage(m);
  function draw() {
    list.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.textContent = empty; list.appendChild(e); return;
    }
    const rows = [];
    let group = null;
    items.forEach((it, i) => {
      if (it.group && it.group !== group) {
        const h = document.createElement('div'); h.className = 'section';
        h.textContent = it.group; list.appendChild(h); group = it.group;
      }
      const r = document.createElement('div'); r.className = 'row' + (i === sel ? ' sel' : '');
      const d = document.createElement('span'); d.className = 'desc'; d.textContent = it.text;
      const c = document.createElement('span'); c.className = 'combo'; c.textContent = it.combo;
      r.append(d, c);
      r.onmousemove = () => { if (sel !== i) { sel = i; draw(); } };
      r.onclick = () => post({ type: 'run', id: it.id });
      list.appendChild(r); rows.push(r);
    });
    // at the top, show the first section's heading too
    if (sel === 0) list.scrollTop = 0; else rows[sel].scrollIntoView({ block: 'nearest' });
  }
  function render(data) {
    items = Array.isArray(data.items) ? data.items : []; empty = data.empty || ''; sel = 0; draw();
  }
  function open(data) { q.value = ''; q.placeholder = data.placeholder || ''; render(data); q.focus(); }
  function move(d) { if (items.length) { sel = (sel + d + items.length) % items.length; draw(); } }
  q.addEventListener('input', () => post({ type: 'query', query: q.value }));
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { move(1); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) { move(-1); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[sel]) post({ type: 'run', id: items[sel].id }); e.preventDefault(); }
    else if (e.key === 'Escape') { post({ type: 'close' }); e.preventDefault(); }
  });
  window.addEventListener('blur', () => post({ type: 'close' }));
  document.addEventListener('mousedown', e => { if (e.target !== q) e.preventDefault(); });
</script></body></html>
]==]

-- A panel left open across a config reload is orphaned on screen, out of reach
-- of the reloaded config. Close them all first.
local allPanels = {}
if hs then
  local previousShutdown = hs.shutdownCallback
  hs.shutdownCallback = function()
    for _, p in ipairs(allPanels) do
      if p.view then p.view:hide() p.view:delete() end
    end
    if previousShutdown then previousShutdown() end
  end
end

-- Only creates the Lua object; the webview is made on first show, so this is
-- safe to call when a module loads (and outside Hammerspoon, in the specs).
function searchPanel.new(opts)
  local self = setmetatable({
    width = opts.width or 640,
    height = opts.height or 460,
    placeholder = opts.placeholder or "Search",
    emptyText = opts.emptyText or "No matches",
    onRun = opts.onRun,
    items = nil,        -- nil while loading
    query = "",
    ready = false,      -- page finished loading
    pending = {},       -- JS to run once it has, in order
  }, searchPanel)
  allPanels[#allPanels + 1] = self
  return self
end

-- What the page gets for the current items and query
function searchPanel:payload(placeholder)
  local shown, empty = {}, self.emptyText
  if self.items == nil then
    empty = "Loading…"
  else
    local matches = fuzzy.filter(self.query, self.items, function(it) return { it.text, it.combo } end)
    -- rows with a group are shown in sections until something is typed, then
    -- as one list ranked by how well they match
    local sections = not self.query:find("%S")
    for i, it in ipairs(matches) do
      shown[i] = { text = it.text, combo = it.combo, id = it.id, group = sections and it.group or nil }
    end
  end
  return { items = shown, empty = empty, placeholder = placeholder }
end

function searchPanel:runJS(fnName, data)
  local js = fnName .. "(" .. hs.json.encode(data) .. ")"
  if self.ready then self.view:evaluateJavaScript(js) else table.insert(self.pending, js) end
end

function searchPanel:onMessage(msg)
  local body = msg.body or {}
  if body.type == "query" then
    self.query = body.query or ""
    self:runJS("render", self:payload())
  elseif body.type == "run" then
    local item = self.items and self.items[body.id]
    self:hide()
    if item and self.onRun then self.onRun(item) end
  elseif body.type == "close" then
    self:hide()
  end
end

function searchPanel:getView()
  if not self.view then
    local uc = hs.webview.usercontent.new("panel"):setCallback(function(msg) self:onMessage(msg) end)
    self.view = hs.webview.new({ x = 0, y = 0, w = self.width, h = self.height }, {}, uc)
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
          self.ready = true
          for _, js in ipairs(self.pending) do self.view:evaluateJavaScript(js) end
          self.pending = {}
        end
      end)
      :html(html)
  end
  return self.view
end

-- items is a list of {text, combo, ...}; nil shows "Loading…" until setItems.
-- opts.placeholder overrides the search box's placeholder for this opening.
function searchPanel:show(items, opts)
  self:setItemsQuietly(items)
  self.query = ""
  local view = self:getView()
  local screen = hs.screen.mainScreen():frame()
  view:topLeft({ x = screen.x + (screen.w - self.width) / 2, y = screen.y + screen.h * 0.18 })
  view:show()
  self:runJS("open", self:payload((opts and opts.placeholder) or self.placeholder))
end

function searchPanel:setItemsQuietly(items)
  if items then
    for i, it in ipairs(items) do it.id = i end
  end
  self.items = items
end

-- Replace the items while open, keeping what has been typed
function searchPanel:setItems(items)
  self:setItemsQuietly(items)
  if self:isVisible() then self:runJS("render", self:payload()) end
end

function searchPanel:isVisible()
  return self.view ~= nil and self.view:isVisible()
end

function searchPanel:hide()
  if self:isVisible() then self.view:hide() end
end

return searchPanel
