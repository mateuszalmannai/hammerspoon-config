--- === DecisionTools ===
---
--- Decision-making tools (PMI, Eisenhower matrix, paired comparison, decision
--- matrix, Pareto, risk analysis, cost-benefit, history) in one popup panel,
--- with a bar to switch between them (⌘1–⌘8). Esc or clicking elsewhere hides
--- the panel; what you entered stays, in the panel's local storage.
---
--- The tools are a plain HTML/JS web app in web/ (copied from the "Decision-
--- Making Tools Framework"). They're served from a small web server on
--- localhost, so they all share one origin and their saved data survives
--- reloads. Exports are written to ~/Downloads; imports open a file dialog.

local files = dofile(hs.spoons.resourcePath("files.lua"))

local obj = {
    name    = "DecisionTools",
    version = "0.1",
    license = "MIT - https://opensource.org/licenses/MIT",
}
obj.__index = obj

--- DecisionTools.port
--- Variable
--- Port of the local web server. The tools' saved data belongs to this port,
--- so changing it starts them empty (the old data comes back with the old port).
obj.port = 47823

--- DecisionTools.downloadDir
--- Variable
--- Where exports are saved; a leading ~ means your home folder.
obj.downloadDir = "~/Downloads"

local MAX_IMPORT_BYTES = 5 * 1024 * 1024

local webRoot = hs.spoons.resourcePath("web")
local server, panel = nil, nil
local ready, pending = false, {}
local inDialog = false       -- a file dialog is open: don't hide on clicks
local clickWatcher = nil     -- hides the panel on a click outside it

local function runJS(fnName, data)
    local js = fnName .. "(" .. (data ~= nil and hs.json.encode(data) or "") .. ")"
    if ready then panel:evaluateJavaScript(js) else table.insert(pending, js) end
end

local function readFile(path)
    local f = io.open(path, "rb")
    if not f then return nil end
    local data = f:read("a")
    f:close()
    return data
end

local function startServer()
    if server then return end
    server = hs.httpserver.new(false, false)
        :setInterface("localhost")
        :setPort(obj.port)
        :setCallback(function(method, path)
            if method ~= "GET" and method ~= "HEAD" then return "", 405, {} end
            local rel = files.resolve(path)
            local body = rel and readFile(webRoot .. "/" .. rel)
            if not body then return "Not found", 404, { ["Content-Type"] = "text/plain" } end
            return body, 200, {
                ["Content-Type"] = files.mimeType(rel),
                ["Cache-Control"] = "no-store",
            }
        end)
        :start()
end

local function home(path)
    return (path:gsub("^~", os.getenv("HOME")))
end

local function saveDownload(name, text)
    local dir = home(obj.downloadDir)
    local path = files.uniquePath(dir, files.safeName(name), function(p)
        return hs.fs.attributes(p) ~= nil
    end)
    local f, err = io.open(path, "wb")
    if not f then
        hs.alert.show("Decision tools: can't save " .. path .. ": " .. tostring(err))
        return
    end
    f:write(text)
    f:close()
    hs.alert.show("Saved " .. path:match("[^/]+$") .. " to " .. obj.downloadDir, 2)
end

-- extensions from an accept attribute like ".json,.csv,application/json"
local function acceptedTypes(accept)
    local types = {}
    for ext in (accept or ""):gmatch("%.(%w+)") do types[#types + 1] = ext end
    return #types > 0 and types or nil
end

local function pickImport(accept)
    inDialog = true
    local chosen = hs.dialog.chooseFileOrFolder("Import into the decision tool",
        home(obj.downloadDir), true, false, false, acceptedTypes(accept))
    inDialog = false
    obj:show()
    local path = chosen and chosen["1"]
    if not path then return end
    local attrs = hs.fs.attributes(path)
    if attrs and attrs.size > MAX_IMPORT_BYTES then
        hs.alert.show("Decision tools: " .. path:match("[^/]+$") .. " is too large to import")
        return
    end
    local text = readFile(path)
    if not text or not utf8.len(text) then
        hs.alert.show("Decision tools: can't read " .. path:match("[^/]+$") .. " as text")
        return
    end
    local name = path:match("[^/]+$")
    local ext = name:match("%.(%w+)$")
    runJS("deliverFile", {
        name = name,
        text = text,
        type = ext == "json" and "application/json" or ext == "csv" and "text/csv" or "",
    })
end

local function onMessage(msg)
    local body = msg.body or {}
    if body.type == "close" then
        obj:hide()
    elseif body.type == "save" then
        saveDownload(body.name, body.text or "")
    elseif body.type == "open" then
        -- not from inside the message callback, which the page is waiting on
        hs.timer.doAfter(0, function() pickImport(body.accept) end)
    elseif body.type == "error" then
        hs.alert.show("Decision tools: " .. tostring(body.message))
    end
end

local function frameFor(screen)
    local f = screen:frame()
    local w = math.min(1240, math.floor(f.w * 0.8))
    local h = math.floor(f.h * 0.86)
    return { x = f.x + (f.w - w) / 2, y = f.y + (f.h - h) / 2, w = w, h = h }
end

local function getPanel()
    if not panel then
        startServer()
        local uc = hs.webview.usercontent.new("decisiontools"):setCallback(onMessage)
        panel = hs.webview.new(frameFor(hs.screen.mainScreen()), {}, uc)
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
                    for _, js in ipairs(pending) do panel:evaluateJavaScript(js) end
                    pending = {}
                elseif action == "didFailProvisionalNavigation" then
                    hs.alert.show("Decision tools: can't load from port " .. obj.port .. " (in use?)")
                end
            end)
            :url("http://localhost:" .. obj.port .. "/")
    end
    return panel
end

--- DecisionTools:show()
--- Method
--- Shows the panel on the main screen, on the tool used last.
function obj:show()
    local p = getPanel()
    p:frame(frameFor(hs.screen.mainScreen()))
    p:show()
    p:hswindow():focus()
    runJS("focusTool")
    -- the page gets no blur event when you click another app (the panel never
    -- makes Hammerspoon active), so watch for clicks outside it instead
    if not clickWatcher then
        local mouseDowns = { hs.eventtap.event.types.leftMouseDown, hs.eventtap.event.types.rightMouseDown }
        clickWatcher = hs.eventtap.new(mouseDowns, function(event)
            if not inDialog and not hs.geometry.point(event:location()):inside(panel:frame()) then
                -- after this event, so the click still reaches what was clicked
                hs.timer.doAfter(0, function() obj:hide() end)
            end
            return false
        end)
    end
    clickWatcher:start()
    return self
end

--- DecisionTools:hide()
--- Method
--- Hides the panel, keeping everything as it is for next time.
function obj:hide()
    if clickWatcher then clickWatcher:stop() end
    if panel and panel:isVisible() then panel:hide() end
    return self
end

--- DecisionTools:toggle()
--- Method
--- Shows the panel, or hides it if it's showing.
function obj:toggle()
    if panel and panel:isVisible() then return self:hide() end
    return self:show()
end

-- A panel left open across a config reload is orphaned on screen, out of reach
-- of the reloaded config; and the server would keep the port. Close both first.
local previousShutdown = hs.shutdownCallback
hs.shutdownCallback = function()
    if clickWatcher then clickWatcher:stop() end
    if panel then panel:hide() panel:delete() end
    if server then server:stop() end
    if previousShutdown then previousShutdown() end
end

return obj
