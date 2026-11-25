---@diagnostic disable: undefined-global
-- Dark, rounded, translucent one-line prompt in the style of searchPanel (the
-- ⌘⌥H cheatsheet) and QuickNote: a title, a text box and a hint line below it.
-- Enter submits, Esc or clicking elsewhere cancels. Used instead of
-- hs.dialog's grey system dialogs so all popups look alike.
--
--   local p = promptPanel.new()
--   p:ask({
--     title = "New countdown",
--     placeholder = "Topic",
--     hint = "Enter continues · Esc cancels",
--     value = "",            -- optional starting text
--     input = false,         -- optional: no text box, just Enter / Esc (a confirmation)
--     onSubmit = function(text)
--       return "message"     -- keep the prompt open, showing the message in red
--       -- or return nothing to close it, or call p:ask(...) again for a next step
--     end,
--     onCancel = function() end,  -- optional
--   })

local promptPanel = {}
promptPanel.__index = promptPanel

local WIDTH, HEIGHT, CONFIRM_HEIGHT = 640, 132, 84

local html = [==[
<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden;
    font: 14px -apple-system, BlinkMacSystemFont, sans-serif; color: #eee;
    -webkit-user-select: none; cursor: default; }
  #panel { box-sizing: border-box; height: 100%; display: flex; flex-direction: column;
    justify-content: center; gap: 8px; padding: 12px;
    background: rgba(24, 24, 27, 0.86); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px; overflow: hidden; }
  #title { padding: 0 4px; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.85);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #q { padding: 10px 12px; font: inherit; font-size: 17px; color: #fff;
    background: rgba(255, 255, 255, 0.07); border: none; border-radius: 8px; outline: none; }
  #q::placeholder { color: rgba(255, 255, 255, 0.35); }
  /* a confirmation has no text box, but the hidden one still takes the keys */
  #panel.confirm #q { position: absolute; opacity: 0; height: 0; padding: 0; }
  #panel.confirm #title { font-size: 17px; font-weight: 500; color: #fff; }
  #hint { padding: 0 4px; font-size: 12px; color: rgba(255, 255, 255, 0.4); }
  #hint.error { color: #FF7878; }
</style></head><body>
<div id="panel"><div id="title"></div>
<input id="q" autocomplete="off" spellcheck="false"><div id="hint"></div></div>
<script>
  const panel = document.getElementById('panel'), q = document.getElementById('q');
  const title = document.getElementById('title'), hint = document.getElementById('hint');
  const post = m => webkit.messageHandlers.prompt.postMessage(m);
  let token = 0;
  function open(d) {
    token = d.token;
    panel.className = d.input === false ? 'confirm' : '';
    title.textContent = d.title || '';
    q.placeholder = d.placeholder || '';
    q.value = d.value || '';
    hint.textContent = d.hint || ''; hint.className = '';
    q.focus(); q.select();
  }
  function error(msg) { hint.textContent = msg; hint.className = 'error'; q.focus(); }
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { post({ type: 'submit', text: q.value, token }); e.preventDefault(); }
    else if (e.key === 'Escape') { post({ type: 'cancel', token }); e.preventDefault(); }
  });
  window.addEventListener('blur', () => post({ type: 'cancel', token }));
  document.addEventListener('mousedown', e => { if (e.target !== q) e.preventDefault(); });
</script></body></html>
]==]

-- A prompt left open across a config reload is orphaned on screen, out of
-- reach of the reloaded config. Close them all first.
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

-- Only creates the Lua object; the webview is made on first ask.
function promptPanel.new()
  local self = setmetatable({ ready = false, pending = {}, token = 0, current = nil }, promptPanel)
  allPanels[#allPanels + 1] = self
  return self
end

function promptPanel:runJS(fnName, data)
  -- hs.json.encode only takes tables: encode a one-item list and unwrap it
  local js = fnName .. "(" .. hs.json.encode({ data }):match("^%[%s*(.-)%s*%]$") .. ")"
  if self.ready then self.view:evaluateJavaScript(js) else table.insert(self.pending, js) end
end

function promptPanel:onMessage(msg)
  local body = msg.body or {}
  local current = self.current
  -- ignore messages from an earlier question (e.g. the blur as it closed)
  if not current or body.token ~= self.token then return end
  if body.type == "submit" then
    local err = current.onSubmit and current.onSubmit(body.text or "")
    if err then
      self:runJS("error", err)
    elseif self.current == current then
      -- not followed by another ask(): done
      self:hide()
    end
  elseif body.type == "cancel" then
    self:hide()
    if current.onCancel then current.onCancel() end
  end
end

function promptPanel:getView()
  if not self.view then
    local uc = hs.webview.usercontent.new("prompt"):setCallback(function(msg) self:onMessage(msg) end)
    self.view = hs.webview.new({ x = 0, y = 0, w = WIDTH, h = HEIGHT }, {}, uc)
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

-- Shows the prompt (or replaces the question in the open one); see the top.
function promptPanel:ask(opts)
  self.token = self.token + 1
  self.current = opts
  local view = self:getView()
  -- a confirmation has no text box, so it needs less height
  local height = opts.input == false and CONFIRM_HEIGHT or HEIGHT
  if view:isVisible() then
    local f = view:frame()
    view:frame({ x = f.x, y = f.y, w = WIDTH, h = height })
  else
    local screen = hs.screen.mainScreen():frame()
    view:frame({ x = screen.x + (screen.w - WIDTH) / 2, y = screen.y + screen.h * 0.18, w = WIDTH, h = height })
    view:show()
  end
  self:runJS("open", { token = self.token, title = opts.title, placeholder = opts.placeholder,
                       hint = opts.hint, value = opts.value, input = opts.input })
end

function promptPanel:isVisible()
  return self.view ~= nil and self.view:isVisible()
end

function promptPanel:hide()
  self.current = nil
  if self:isVisible() then self.view:hide() end
end

return promptPanel
