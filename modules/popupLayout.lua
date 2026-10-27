-- Text and sizing helpers for the text popups (RemindCalendar, TaskwarriorViews).
-- Plain Lua (no hs.*), so they can be tested outside Hammerspoon; see
-- spec/popup_layout_spec.lua.

local layout = {}

-- remind's calendar output, ready to draw: remind wraps each cell in
-- left-to-right marks (U+200E), which render as gaps in Menlo, and ends with
-- blank lines that would pad the popup.
function layout.clean(text)
    return (text:gsub("\u{200E}", ""):gsub("\n+$", ""))
end

-- Largest whole font size from maxSize down to minSize at which the text fits
-- within maxW x maxH, or the smallest size if none does. `measure(fontSize)`
-- returns the text's size at that font size as { w = ..., h = ... }.
-- Returns the font size and the measured size.
function layout.fitFontSize(measure, maxW, maxH, maxSize, minSize)
    minSize = math.min(minSize, maxSize)
    for fontSize = maxSize, minSize + 1, -1 do
        local size = measure(fontSize)
        if size.w <= maxW and size.h <= maxH then return fontSize, size end
    end
    return minSize, measure(minSize)
end

-- The popup's first line: the current view's name, an optional dim subtitle,
-- then each view's key and label, the current one bright and the others dim:
--   "week      1 week  2 two weeks  m month"
-- `views` is a list of { name, key, label }; label defaults to name. Returns
-- { text, bold, dim } segments ending in a blank line, for the popup to style.
function layout.header(views, current, subtitle)
    local title = current
    for _, view in ipairs(views) do
        if view.name == current then title = view.label or view.name end
    end
    local segments = { { text = title, bold = true } }
    if subtitle then segments[#segments + 1] = { text = " · " .. subtitle, dim = true } end
    segments[#segments + 1] = { text = "      " }
    for i, view in ipairs(views) do
        local dim = view.name ~= current
        segments[#segments + 1] = { text = view.key, bold = true, dim = dim }
        segments[#segments + 1] = { text = " " .. (view.label or view.name) .. (i < #views and "  " or ""), dim = dim }
    end
    segments[#segments + 1] = { text = "\n\n" }
    return segments
end

return layout
