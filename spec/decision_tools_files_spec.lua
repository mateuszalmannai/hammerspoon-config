local files = dofile("Spoons/DecisionTools.spoon/files.lua")

describe("files.resolve", function()
  it("maps a URL path to a path relative to the web folder", function()
    assert.are.equal("tools/pmi-tool.html", files.resolve("/tools/pmi-tool.html"))
    assert.are.equal("styles/styles.css", files.resolve("/styles/styles.css"))
  end)

  it("serves the panel for the root", function()
    assert.are.equal("panel.html", files.resolve("/"))
    assert.are.equal("panel.html", files.resolve(""))
  end)

  it("ignores the query string and fragment", function()
    assert.are.equal("tools/pmi-tool.html", files.resolve("/tools/pmi-tool.html?x=1#top"))
  end)

  it("decodes percent escapes", function()
    assert.are.equal("tools/a b.html", files.resolve("/tools/a%20b.html"))
  end)

  it("refuses paths that leave the web folder", function()
    assert.is_nil(files.resolve("/../init.lua"))
    assert.is_nil(files.resolve("/tools/../../init.lua"))
    assert.is_nil(files.resolve("/tools/%2e%2e/%2e%2e/init.lua"))
    assert.is_nil(files.resolve("/tools/..\\init.lua"))
  end)

  it("refuses hidden files and empty segments", function()
    assert.is_nil(files.resolve("/.git/config"))
    assert.is_nil(files.resolve("//etc/passwd"))
    assert.is_nil(files.resolve("/tools/\0.html"))
  end)
end)

describe("files.mimeType", function()
  it("knows the types the tools use", function()
    assert.are.equal("text/html; charset=utf-8", files.mimeType("tools/pmi-tool.html"))
    assert.are.equal("text/css; charset=utf-8", files.mimeType("styles/styles.css"))
    assert.are.equal("text/javascript; charset=utf-8", files.mimeType("utils/logger.js"))
    assert.are.equal("image/svg+xml", files.mimeType("x/Y.SVG"))
  end)

  it("falls back to binary", function()
    assert.are.equal("application/octet-stream", files.mimeType("README"))
  end)
end)

describe("files.safeName", function()
  it("keeps ordinary export names", function()
    assert.are.equal("pmi-analysis-2026-10-31.json", files.safeName("pmi-analysis-2026-10-31.json"))
  end)

  it("drops folders and unsafe characters", function()
    assert.are.equal("passwd", files.safeName("../../etc/passwd"))
    assert.are.equal("a_b_.csv", files.safeName("a:b?.csv"))
  end)

  it("never returns an empty or hidden name", function()
    assert.are.equal("export", files.safeName(""))
    assert.are.equal("export", files.safeName(nil))
    assert.are.equal("_hidden", files.safeName(".hidden"))
  end)
end)

describe("files.uniquePath", function()
  it("returns the plain name when it is free", function()
    assert.are.equal("/d/x.json", files.uniquePath("/d", "x.json", function() return false end))
  end)

  it("numbers the name like a browser download", function()
    local taken = { ["/d/x.json"] = true, ["/d/x (1).json"] = true }
    assert.are.equal("/d/x (2).json", files.uniquePath("/d", "x.json", function(p) return taken[p] end))
  end)

  it("handles names without an extension", function()
    local taken = { ["/d/x"] = true }
    assert.are.equal("/d/x (1)", files.uniquePath("/d", "x", function(p) return taken[p] end))
  end)
end)
