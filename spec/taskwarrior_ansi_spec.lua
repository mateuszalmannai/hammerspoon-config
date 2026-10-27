local ansi = dofile("Spoons/TaskwarriorViews.spoon/ansi.lua")

local ESC = "\27"

describe("ansi.parse", function()
  local function seg(text, fg, bg, bold, underline)
    return { text = text, fg = fg, bg = bg, bold = bold or false, underline = underline or false }
  end

  it("returns plain text as one unstyled segment", function()
    assert.are.same({ seg("Weekly Burndown") }, ansi.parse("Weekly Burndown"))
  end)

  it("reads 256-colour foreground and background with bold", function()
    assert.are.same({ seg(" 6", 1, 234, true) }, ansi.parse(ESC .. "[1;38;5;1;48;5;234m 6" .. ESC .. "[0m"))
  end)

  it("resets after [0m", function()
    assert.are.same({ seg("ID", nil, nil, false, true), seg(" ") },
      ansi.parse(ESC .. "[4mID" .. ESC .. "[0m "))
  end)

  it("merges neighbouring segments with the same style", function()
    -- taskwarrior colours every cell of a row separately
    local row = ESC .. "[38;5;1m 3" .. ESC .. "[0m" .. ESC .. "[38;5;1m " .. ESC .. "[0m"
             .. ESC .. "[38;5;1mdemo" .. ESC .. "[0m"
    assert.are.same({ seg(" 3 demo", 1) }, ansi.parse(row))
  end)

  it("keeps newlines and unstyled gaps between bars", function()
    local text = "  |  " .. ESC .. "[48;5;22m  " .. ESC .. "[0m\n4 |"
    assert.are.same({ seg("  |  "), seg("  ", nil, 22), seg("\n4 |") }, ansi.parse(text))
  end)

  it("reads the basic and bright colour codes", function()
    assert.are.same({ seg("a", 2, 4), seg("b", 9, 12) },
      ansi.parse(ESC .. "[32;44ma" .. ESC .. "[91;104mb"))
  end)

  it("clears only foreground, background, bold or underline when asked", function()
    local text = ESC .. "[1;4;31;42mx" .. ESC .. "[39my" .. ESC .. "[49;22;24mz"
    assert.are.same({ seg("x", 1, 2, true, true), seg("y", nil, 2, true, true), seg("z") },
      ansi.parse(text))
  end)

  it("treats an empty escape as a reset", function()
    assert.are.same({ seg("a", 1), seg("b") }, ansi.parse(ESC .. "[31ma" .. ESC .. "[mb"))
  end)

  it("skips 24-bit colour without misreading its numbers", function()
    assert.are.same({ seg("a", nil, nil, true) }, ansi.parse(ESC .. "[38;2;10;20;30;1ma"))
  end)

  it("drops escapes that aren't colours", function()
    assert.are.same({ seg("ab") }, ansi.parse("a" .. ESC .. "[2Kb"))
  end)

  it("keeps non-ASCII text intact", function()
    assert.are.same({ seg("Größe ✓", 3) }, ansi.parse(ESC .. "[38;5;3mGröße ✓" .. ESC .. "[0m"))
  end)

  it("returns nothing for empty text", function()
    assert.are.same({}, ansi.parse(""))
  end)
end)

describe("ansi.rgb", function()
  local function rgb255(n)
    local c = ansi.rgb(n)
    return { math.floor(c.red * 255 + 0.5), math.floor(c.green * 255 + 0.5), math.floor(c.blue * 255 + 0.5) }
  end

  it("uses xterm's basic colours for 0-15", function()
    assert.are.same({ 0, 0, 0 }, rgb255(0))
    assert.are.same({ 205, 0, 0 }, rgb255(1))
    assert.are.same({ 255, 255, 255 }, rgb255(15))
  end)

  it("maps 16-231 onto the 6x6x6 colour cube", function()
    assert.are.same({ 0, 0, 0 }, rgb255(16))
    assert.are.same({ 0, 95, 0 }, rgb255(22))      -- burndown "done"
    assert.are.same({ 255, 0, 0 }, rgb255(196))    -- ghistory "added"
    assert.are.same({ 255, 95, 0 }, rgb255(202))
    assert.are.same({ 255, 255, 255 }, rgb255(231))
  end)

  it("maps 232-255 onto the grey ramp", function()
    assert.are.same({ 8, 8, 8 }, rgb255(232))
    assert.are.same({ 28, 28, 28 }, rgb255(234))   -- taskwarrior's row striping
    assert.are.same({ 238, 238, 238 }, rgb255(255))
  end)

  it("returns components between 0 and 1", function()
    local c = ansi.rgb(208)
    for _, v in pairs(c) do assert.is_true(v >= 0 and v <= 1) end
  end)
end)
