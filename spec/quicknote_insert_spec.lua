local insert = dofile("Spoons/QuickNote.spoon/insert.lua")

describe("insert.line", function()
  it("makes a timestamped list item", function()
    assert.are.equal("- 2026-10-27 15:02:11 Call the plumber",
      insert.line("Call the plumber", "2026-10-27 15:02:11"))
  end)

  it("trims and collapses whitespace, including pasted line breaks", function()
    assert.are.equal("- T a b c", insert.line("  a\n  b\t\tc  ", "T"))
  end)

  it("returns nil for empty or blank text", function()
    assert.is_nil(insert.line("", "T"))
    assert.is_nil(insert.line("   \n ", "T"))
    assert.is_nil(insert.line(nil, "T"))
  end)
end)

describe("insert.into", function()
  local inbox = table.concat({
    "tags: #inbox",
    "",
    "### <span style=\"color: red;\">Work</span>",
    "",
    "---",
    "",
    "### <span style=\"color: grey;\">Uncategorised</span>",
    "",
    "---",
    "",
    "### Schule",
    "- 2026-09-20 07:15:05 # [Schule] GEÄNDERT · x",
    "",
  }, "\n")

  it("puts the first note right under the section heading, before the blank line and ---", function()
    local out, found = insert.into(inbox, "Uncategorised", "- N1")
    assert.is_true(found)
    assert.truthy(out:find("Uncategorised</span>\n- N1\n\n---\n\n### Schule", 1, true))
  end)

  it("adds later notes after the earlier ones, oldest first", function()
    local out = insert.into(insert.into(inbox, "Uncategorised", "- N1"), "Uncategorised", "- N2")
    assert.truthy(out:find("Uncategorised</span>\n- N1\n- N2\n\n---", 1, true))
  end)

  it("leaves the rest of the file untouched", function()
    local out = insert.into(inbox, "Uncategorised", "- N1")
    assert.are.equal(inbox, (out:gsub("%- N1\n", "", 1)))
  end)

  it("matches a word in the heading, not a list item mentioning it", function()
    local text = "- see Uncategorised\n### Uncategorised\n---\n"
    assert.are.equal("- see Uncategorised\n### Uncategorised\n- N\n---\n",
      (insert.into(text, "Uncategorised", "- N")))
  end)

  it("stops at the next heading when the section has no ---", function()
    local text = "### Uncategorised\n- old\n\n### Schule\n- s\n"
    assert.are.equal("### Uncategorised\n- old\n- N\n\n### Schule\n- s\n",
      (insert.into(text, "Uncategorised", "- N")))
  end)

  it("adds to the end of a section that ends the file, keeping the trailing blank line", function()
    assert.are.equal("### Uncategorised\n- old\n- N\n\n",
      (insert.into("### Uncategorised\n- old\n\n", "Uncategorised", "- N")))
  end)

  it("appends to the end of the file when the section is missing", function()
    local out, found = insert.into("# Notes\n- a\n", "Uncategorised", "- N")
    assert.is_false(found)
    assert.are.equal("# Notes\n- a\n- N\n", out)
  end)

  it("adds the missing final newline before appending", function()
    assert.are.equal("- a\n- N\n", (insert.into("- a", "Uncategorised", "- N")))
  end)

  it("handles an empty file", function()
    assert.are.equal("- N\n", (insert.into("", "Uncategorised", "- N")))
  end)
end)
