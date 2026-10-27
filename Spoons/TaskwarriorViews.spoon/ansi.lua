-- Turns taskwarrior's terminal colour codes (ANSI SGR escapes) into styled
-- segments the popup can draw. Plain Lua (no hs.*), so it can be tested outside
-- Hammerspoon; see spec/taskwarrior_ansi_spec.lua.

local ansi = {}

-- Applies one escape's parameters ("1;38;5;1;48;5;234") to a style
local function apply(style, params)
    local codes = {}
    for p in (params .. ";"):gmatch("([^;]*);") do codes[#codes + 1] = tonumber(p) or 0 end
    local i = 1
    while i <= #codes do
        local c = codes[i]
        if c == 0 then
            style.fg, style.bg, style.bold, style.underline = nil, nil, false, false
        elseif c == 1 then style.bold = true
        elseif c == 22 then style.bold = false
        elseif c == 4 then style.underline = true
        elseif c == 24 then style.underline = false
        elseif c >= 30 and c <= 37 then style.fg = c - 30
        elseif c >= 90 and c <= 97 then style.fg = c - 90 + 8
        elseif c == 39 then style.fg = nil
        elseif c >= 40 and c <= 47 then style.bg = c - 40
        elseif c >= 100 and c <= 107 then style.bg = c - 100 + 8
        elseif c == 49 then style.bg = nil
        elseif (c == 38 or c == 48) and codes[i + 1] == 5 then
            -- 256-colour: 38;5;N / 48;5;N
            if c == 38 then style.fg = codes[i + 2] else style.bg = codes[i + 2] end
            i = i + 2
        elseif (c == 38 or c == 48) and codes[i + 1] == 2 then
            i = i + 4   -- 24-bit colour; taskwarrior doesn't emit it, so skip it
        end
        i = i + 1
    end
end

local function sameStyle(a, b)
    return a.fg == b.fg and a.bg == b.bg and a.bold == b.bold and a.underline == b.underline
end

--- ansi.parse(text) -> list
--- Splits text into { text, fg, bg, bold, underline } segments, where fg and bg
--- are xterm colour numbers (0-255) or nil for the default. Neighbouring
--- segments with the same style are merged; other escape sequences are dropped.
function ansi.parse(text)
    local segments = {}
    local style = { bold = false, underline = false }
    local function add(s)
        if s == "" then return end
        local last = segments[#segments]
        if last and sameStyle(last, style) then
            last.text = last.text .. s
        else
            segments[#segments + 1] = { text = s, fg = style.fg, bg = style.bg,
                                        bold = style.bold, underline = style.underline }
        end
    end
    local pos = 1
    while true do
        local s, e, params, final = text:find("\27%[([%d;]*)([%a])", pos)
        if not s then break end
        add(text:sub(pos, s - 1))
        if final == "m" then apply(style, params) end
        pos = e + 1
    end
    add(text:sub(pos))
    return segments
end

-- xterm's default colours 0-15
local basic = {
    { 0, 0, 0 }, { 205, 0, 0 }, { 0, 205, 0 }, { 205, 205, 0 },
    { 0, 0, 238 }, { 205, 0, 205 }, { 0, 205, 205 }, { 229, 229, 229 },
    { 127, 127, 127 }, { 255, 0, 0 }, { 0, 255, 0 }, { 255, 255, 0 },
    { 92, 92, 255 }, { 255, 0, 255 }, { 0, 255, 255 }, { 255, 255, 255 },
}
local cubeLevels = { 0, 95, 135, 175, 215, 255 }

--- ansi.rgb(n) -> table
--- xterm colour number n (0-255) as { red, green, blue } in 0-1, the form
--- hs.drawing.color takes.
function ansi.rgb(n)
    local r, g, b
    if n < 16 then
        r, g, b = table.unpack(basic[n + 1])
    elseif n < 232 then
        local i = n - 16
        r = cubeLevels[i // 36 + 1]
        g = cubeLevels[(i // 6) % 6 + 1]
        b = cubeLevels[i % 6 + 1]
    else
        r = 8 + (n - 232) * 10
        g, b = r, r
    end
    return { red = r / 255, green = g / 255, blue = b / 255 }
end

return ansi
