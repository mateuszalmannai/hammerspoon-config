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
