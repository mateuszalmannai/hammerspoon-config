-- Where a quick note goes in the inbox file. Plain Lua (no hs.*), so it can be
-- tested outside Hammerspoon; see spec/quicknote_insert_spec.lua.

local insert = {}

local function splitLines(content)
    local lines = {}
    for line in content:gmatch("([^\n]*)\n") do lines[#lines + 1] = line end
    local rest = content:match("[^\n]*$")
    if rest ~= "" then lines[#lines + 1] = rest end
    return lines
end

local function isHeading(line) return line:match("^#+%s") ~= nil end
local function isRule(line) return line:match("^%-%-%-+%s*$") ~= nil end
local function isBlank(line) return line:match("^%s*$") ~= nil end

--- insert.line(text, time) -> string or nil
--- The list item for a note: "- 2026-10-27 15:02:11 text". Line breaks and runs
--- of whitespace become single spaces; nil if there is no text.
function insert.line(text, time)
    text = (text or ""):gsub("%s+", " "):match("^%s*(.-)%s*$")
    if text == "" then return nil end
    return "- " .. time .. " " .. text
end

--- insert.into(content, section, line) -> string, boolean
--- content with line added at the end of the section whose heading mentions
--- `section` (after its last entry, before the blank lines and `---` or next
--- heading that close it). If there is no such heading, line is appended to the
--- end instead. Returns the new content and whether the section was found.
function insert.into(content, section, line)
    local lines = splitLines(content)
    local heading
    for i, l in ipairs(lines) do
        if isHeading(l) and l:find(section, 1, true) then heading = i break end
    end
    if not heading then
        local sep = (content == "" or content:sub(-1) == "\n") and "" or "\n"
        return content .. sep .. line .. "\n", false
    end
    local stop = #lines + 1
    for i = heading + 1, #lines do
        if isRule(lines[i]) or isHeading(lines[i]) then stop = i break end
    end
    local at = stop - 1
    while at > heading and isBlank(lines[at]) do at = at - 1 end
    table.insert(lines, at + 1, line)
    return table.concat(lines, "\n") .. "\n", true
end

--- insert.expandHome(path, home) -> string
--- path with a leading ~ replaced by home ("~/notes.md" -> "/Users/me/notes.md").
function insert.expandHome(path, home)
    if path == "~" or path:sub(1, 2) == "~/" then return home .. path:sub(2) end
    return path
end

--- insert.shortenHome(path, home) -> string
--- path with a leading home replaced by ~, for messages.
function insert.shortenHome(path, home)
    if path == home or path:sub(1, #home + 1) == home .. "/" then return "~" .. path:sub(#home + 1) end
    return path
end

return insert
