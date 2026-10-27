local layout = dofile("Spoons/RemindCalendar.spoon/layout.lua")

local LRM = "\u{200E}"

describe("layout.clean", function()
  it("removes remind's left-to-right marks", function()
    local line = "|" .. LRM .. "27 Oct" .. LRM .. "    |" .. LRM .. "28 Oct" .. LRM .. "    |"
    assert.are.equal("|27 Oct    |28 Oct    |", layout.clean(line))
  end)

  it("drops trailing blank lines but keeps blank lines inside the calendar", function()
    assert.are.equal("+---+\n\n|   |\n+---+", layout.clean("+---+\n\n|   |\n+---+\n\n\n"))
  end)

  it("leaves text without marks or trailing newlines unchanged", function()
    assert.are.equal("Monday | Tuesday", layout.clean("Monday | Tuesday"))
  end)

  it("keeps other non-ASCII text intact", function()
    assert.are.equal("Kinder- und Jugendturnen 🌕 Größe",
      layout.clean("Kinder- und Jugendturnen " .. LRM .. "🌕 Größe\n"))
  end)

  it("returns only the text, not gsub's match count", function()
    assert.are.equal(1, select("#", layout.clean("x" .. LRM .. "\n")))
  end)
end)

describe("layout.fitFontSize", function()
  -- Rough monospace metrics: each character 0.6em wide, each line 1.2em tall.
  -- Records the sizes it was asked about.
  local function measurer(cols, lines)
    local calls = {}
    local measure = function(fontSize)
      table.insert(calls, fontSize)
      return { w = cols * 0.6 * fontSize, h = lines * 1.2 * fontSize }
    end
    return measure, calls
  end

  it("keeps the largest size when the text fits", function()
    local measure, calls = measurer(100, 24)   -- one-week view
    local fontSize, size = layout.fitFontSize(measure, 1800, 1100, 14, 9)
    assert.are.equal(14, fontSize)
    assert.is_near(840, size.w, 1e-9)
    assert.is_near(403.2, size.h, 1e-9)
    assert.are.same({ 14 }, calls)
  end)

  it("shrinks until the height fits", function()
    -- 86 lines: 14pt is 1444.8 tall ... 10pt is 1032, the first under 1100
    local measure, calls = measurer(160, 86)
    assert.are.equal(10, (layout.fitFontSize(measure, 1800, 1100, 14, 9)))
    assert.are.same({ 14, 13, 12, 11, 10 }, calls)
  end)

  it("shrinks until the width fits", function()
    -- 200 columns: 14pt is 1680 wide, 12pt is 1440, the first under 1500
    local measure = measurer(200, 10)
    assert.are.equal(12, (layout.fitFontSize(measure, 1500, 1100, 14, 9)))
  end)

  it("counts a size that fits exactly", function()
    local measure = measurer(100, 10)          -- 12pt is exactly 720 x 144
    assert.are.equal(12, (layout.fitFontSize(measure, 720, 144, 14, 9)))
  end)

  it("falls back to the smallest size when nothing fits, and returns its measurement", function()
    local measure = measurer(160, 200)
    local fontSize, size = layout.fitFontSize(measure, 1800, 1100, 14, 9)
    assert.are.equal(9, fontSize)
    assert.is_near(864, size.w, 1e-9)
    assert.is_near(2160, size.h, 1e-9)
  end)

  it("uses the font size as-is when it's already below the minimum", function()
    local measure = measurer(100, 24)
    assert.are.equal(8, (layout.fitFontSize(measure, 1800, 1100, 8, 9)))
  end)
end)
