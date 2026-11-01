-- Plain-Lua helpers for DecisionTools (no hs.*), so they can be tested outside
-- Hammerspoon; see spec/decision_tools_files_spec.lua.

local files = {}

-- The file under web/ that a request path refers to, or nil if it isn't one
-- the panel may serve: anything that would leave web/ (..), hidden files
-- (.git) and odd characters are refused. "/" is the panel itself.
function files.resolve(urlPath)
    local path = (urlPath or ""):gsub("[?#].*$", "")
    path = path:gsub("%%(%x%x)", function(hex) return string.char(tonumber(hex, 16)) end)
    if path == "" or path == "/" then return "panel.html" end
    if path:find("[%z\\]") then return nil end
    path = path:gsub("^/", "")
    for segment in (path .. "/"):gmatch("(.-)/") do
        if segment == "" or segment:sub(1, 1) == "." then return nil end
    end
    return path
end

local types = {
    html = "text/html; charset=utf-8",
    css = "text/css; charset=utf-8",
    js = "text/javascript; charset=utf-8",
    json = "application/json; charset=utf-8",
    svg = "image/svg+xml",
    png = "image/png",
    ico = "image/x-icon",
}

function files.mimeType(path)
    local ext = path:match("%.([^./]+)$")
    return types[ext and ext:lower()] or "application/octet-stream"
end

-- A download's suggested name, reduced to a plain file name that is safe to
-- create in the downloads folder.
function files.safeName(name)
    name = tostring(name or ""):match("[^/\\]*$"):gsub("[^%w%.%-_ ()]", "_")
    if name == "" then return "export" end
    if name:sub(1, 1) == "." then name = "_" .. name:sub(2) end
    return name
end

-- dir/name, or "name (1).ext", "name (2).ext", ... if that is taken, as
-- browsers do. `exists(path)` says whether a path is taken.
function files.uniquePath(dir, name, exists)
    local candidate = dir .. "/" .. name
    if not exists(candidate) then return candidate end
    local stem, ext = name:match("^(.+)(%.[^.]+)$")
    if not stem then stem, ext = name, "" end
    for n = 1, 9999 do
        candidate = ("%s/%s (%d)%s"):format(dir, stem, n, ext)
        if not exists(candidate) then return candidate end
    end
    return candidate
end

return files
