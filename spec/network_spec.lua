-- The module only touches hs inside its functions; wifiTitle reads hs.wifi and
-- hs.location, which each test stubs
_G.hs = _G.hs or {}
local network = require("modules.network")

-- Stubs hs.wifi and hs.location for one test: power (Wi-Fi on/off), ssid (nil
-- when macOS hides it or there's no network) and auth (Location permission)
local function stub(opts)
  hs.wifi = {
    interfaceDetails = function() return opts.details or { power = opts.power } end,
    currentNetwork = function() return opts.ssid end,
  }
  hs.location = {
    authorizationStatus = function() return opts.auth end,
  }
end

describe("network.wifiTitle", function()
  it("shows the SSID when connected", function()
    stub({ power = true, ssid = "STAYONRHODES", auth = "authorized" })
    assert.are.equal("STAYONRHODES", network.wifiTitle())
  end)

  it("says Wi-Fi is off when the interface has no power", function()
    stub({ power = false, ssid = nil, auth = "authorized" })
    assert.are.equal("Wi-Fi off", network.wifiTitle())
  end)

  it("says Wi-Fi is off when there's no Wi-Fi interface", function()
    stub({ details = {}, ssid = nil, auth = "authorized" })
    assert.are.equal("Wi-Fi off", network.wifiTitle())
  end)

  it("treats a nil interfaceDetails as Wi-Fi off", function()
    stub({ power = true, auth = "authorized" })
    hs.wifi.interfaceDetails = function() return nil end
    assert.are.equal("Wi-Fi off", network.wifiTitle())
  end)

  it("asks for Location access when the SSID is hidden for lack of it", function()
    stub({ power = true, ssid = nil, auth = "undefined" })
    assert.are.equal("Wi-Fi: allow Location", network.wifiTitle())
  end)

  it("keeps asking when Location access was denied", function()
    stub({ power = true, ssid = nil, auth = "denied" })
    assert.are.equal("Wi-Fi: allow Location", network.wifiTitle())
  end)

  it("says not connected when it has Location access but no network", function()
    stub({ power = true, ssid = nil, auth = "authorized" })
    assert.are.equal("Wi-Fi: not connected", network.wifiTitle())
  end)

  it("shows the SSID even without Location access, if macOS gives it", function()
    stub({ power = true, ssid = "Cafe", auth = "undefined" })
    assert.are.equal("Cafe", network.wifiTitle())
  end)

  it("says Wi-Fi is off before checking the SSID or Location access", function()
    stub({ power = false, ssid = "Stale", auth = "undefined" })
    assert.are.equal("Wi-Fi off", network.wifiTitle())
  end)
end)

-- Stubs hs.host and hs.styledtext: style is what hs.host.interfaceStyle()
-- returns ("Dark", or nil in light mode); styled text comes back as a plain
-- table so the font and colour can be checked
local function stubStyle(style)
  hs.host = { interfaceStyle = function() return style end }
  hs.styledtext = { new = function(text, attrs) return { text = text, attrs = attrs } end }
end

describe("network.styledWifiTitle", function()
  it("leaves short titles as plain strings, in the menu bar's own font", function()
    stubStyle("Dark")
    assert.are.equal("STAYONRHODES", network.styledWifiTitle("STAYONRHODES"))
  end)

  it("leaves a title of exactly 16 characters as a plain string", function()
    stubStyle("Dark")
    assert.are.equal("0123456789abcdef", network.styledWifiTitle("0123456789abcdef"))
  end)

  it("counts characters, not bytes, so umlauts don't make a title long", function()
    stubStyle("Dark")
    -- 15 characters, 17 bytes
    assert.are.equal("Café-Gäste-WLAN", network.styledWifiTitle("Café-Gäste-WLAN"))
  end)

  it("still shrinks titles over 16 characters that contain umlauts", function()
    stubStyle("Dark")
    assert.are.equal(10, network.styledWifiTitle("Café-Gäste-WLAN-5G").attrs.font.size)
  end)

  it("draws longer titles in a 10 pt font", function()
    stubStyle("Dark")
    local styled = network.styledWifiTitle("0123456789abcdefg")
    assert.are.equal("0123456789abcdefg", styled.text)
    assert.are.equal(10, styled.attrs.font.size)
  end)

  it("uses white text in dark mode", function()
    stubStyle("Dark")
    assert.are.equal("#FFFFFF", network.styledWifiTitle("A-Very-Long-Network-Name").attrs.color.hex)
  end)

  it("uses black text in light mode", function()
    stubStyle(nil)
    assert.are.equal("#000000", network.styledWifiTitle("A-Very-Long-Network-Name").attrs.color.hex)
  end)

  it("shrinks long status titles too, not just SSIDs", function()
    stubStyle("Dark")
    assert.are.equal(10, network.styledWifiTitle("Wi-Fi: allow Location").attrs.font.size)
  end)
end)
