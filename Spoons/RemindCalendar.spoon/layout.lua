-- Text and sizing helpers for the RemindCalendar popup. Plain Lua (no hs.*), so
-- they can be tested outside Hammerspoon; see spec/remind_calendar_layout_spec.lua.

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

return layout
