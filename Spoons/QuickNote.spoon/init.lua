--- === QuickNote ===
---
--- A one-line text box for jotting a note into an inbox file. Enter adds it as a
--- timestamped list item ("- 2026-10-27 15:02:11 text") at the end of the
--- inbox's Uncategorised section; Esc cancels. Clicking elsewhere closes the box
--- but keeps what you typed for next time.

local insert = dofile(hs.spoons.resourcePath("insert.lua"))

local obj = {
    name    = "QuickNote",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- QuickNote.file
--- Variable
--- The inbox file notes are added to.
obj.file = os.getenv("HOME") .. "/markdown/running_notes/inbx.md"

--- QuickNote.section
--- Variable
--- Notes go at the end of the section whose heading contains this text; if
--- there is none, at the end of the file.
obj.section = "Uncategorised"

--- QuickNote.timeFormat
--- Variable
--- os.date format of the timestamp in front of each note.
obj.timeFormat = "%Y-%m-%d %H:%M:%S"

local PANEL_W, PANEL_H = 640, 64

local html = [==[
<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden;
    font: 14px -apple-system, BlinkMacSystemFont, sans-serif; }
  #panel { box-sizing: border-box; height: 100%; display: flex; align-items: center;
    background: rgba(24, 24, 27, 0.86); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px; padding: 0 12px; }
  #q { flex: 1; padding: 10px 12px; font: inherit; font-size: 17px; color: #fff;
    background: rgba(255, 255, 255, 0.07); border: none; border-radius: 8px; outline: none; }
  #q::placeholder { color: rgba(255, 255, 255, 0.35); }
</style></head><body>
<div id="panel"><input id="q" placeholder="Note to inbox · Enter saves · Esc cancels" autocomplete="off" spellcheck="false"></div>
<script>
  const q = document.getElementById('q');
  const post = m => webkit.messageHandlers.quicknote.postMessage(m);
  function open() { q.focus(); q.select(); }
  function clear() { q.value = ''; }
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { post({ type: 'save', text: q.value }); e.preventDefault(); }
    else if (e.key === 'Escape') { clear(); post({ type: 'close' }); e.preventDefault(); }
  });
  window.addEventListener('blur', () => post({ type: 'close' }));
</script></body></html>
]==]

local panel = nil
local ready = false      -- page finished loading
local pending = nil      -- JS to run once it has

local function runJS(js)
    if ready then panel:evaluateJavaScript(js) else pending = js end
end

-- Adds text to the inbox; returns true if it was saved
local function save(text)
    local line = insert.line(text, os.date(obj.timeFormat))
    if not line then return false end
    local f, err = io.open(obj.file, "r")
    if not f then
        hs.alert.show("QuickNote: can't read " .. obj.file .. ": " .. tostring(err))
        return false
    end
    local content = f:read("a")
    f:close()
    local updated, found = insert.into(content, obj.section, line)
    -- write a temporary file and rename it over the inbox, so a failed write
    -- can't leave the inbox half-written
    local tmp = obj.file .. ".quicknote-tmp"
    f, err = io.open(tmp, "w")
    if not f then
        hs.alert.show("QuickNote: can't write " .. tmp .. ": " .. tostring(err))
        return false
    end
    f:write(updated)
    f:close()
    local ok, renameErr = os.rename(tmp, obj.file)
    if not ok then
        os.remove(tmp)
        hs.alert.show("QuickNote: can't save to " .. obj.file .. ": " .. tostring(renameErr))
        return false
    end
    if found then
        hs.alert.show("Added to inbox", 1)
    else
        hs.alert.show("No " .. obj.section .. " section; added to the end of the inbox", 3)
    end
    return true
end

local function onMessage(msg)
    local body = msg.body or {}
    if body.type == "save" then
        obj:hide()
        if save(body.text) then runJS("clear()") end
    elseif body.type == "close" then
        obj:hide()
    end
end

local function getPanel()
    if not panel then
        local uc = hs.webview.usercontent.new("quicknote"):setCallback(onMessage)
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

--- QuickNote:show()
--- Method
--- Opens the note box on the main screen.
function obj:show()
    local p = getPanel()
    local screen = hs.screen.mainScreen():frame()
    p:topLeft({ x = screen.x + (screen.w - PANEL_W) / 2, y = screen.y + screen.h * 0.25 })
    p:show()
    runJS("open()")
    return self
end

--- QuickNote:hide()
--- Method
--- Closes the note box, keeping any text typed so far.
function obj:hide()
    if panel and panel:isVisible() then panel:hide() end
    return self
end

--- QuickNote:toggle()
--- Method
--- Opens the note box, or closes it if already open.
function obj:toggle()
    if panel and panel:isVisible() then return self:hide() end
    return self:show()
end

-- A box left open across a config reload is orphaned on screen, out of reach
-- of the reloaded config. Close it first.
local previousShutdown = hs.shutdownCallback
hs.shutdownCallback = function()
    if panel then panel:hide() panel:delete() end
    if previousShutdown then previousShutdown() end
end

return obj
