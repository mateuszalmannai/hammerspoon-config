local status = dofile("Spoons/VPNStatus.spoon/status.lua")

describe("status.runningTunnels", function()
  it("finds vpn-switch openvpn processes by profile id", function()
    local ps = table.concat({
      "/Library/Frameworks/OpenVPNConnect.framework/Versions/Current/usr/sbin/ovpnagent",
      "/usr/local/libexec/vpn-switch/openvpn --config /usr/local/etc/vpn-switch/profiles/work-office.conf",
      "/usr/local/libexec/vpn-switch/openvpn --config /usr/local/etc/vpn-switch/profiles/work-prod.conf",
      "grep vpn-switch/openvpn",
    }, "\n")
    assert.are.same({ ["work-office"] = true, ["work-prod"] = true },
      status.runningTunnels(ps))
  end)

  it("handles empty output", function()
    assert.are.same({}, status.runningTunnels(""))
    assert.are.same({}, status.runningTunnels(nil))
  end)
end)

describe("status.splitProbe", function()
  it("splits host and port", function()
    local host, port = status.splitProbe("git.example.internal:22")
    assert.are.equal("git.example.internal", host)
    assert.are.equal(22, port)
    assert.is_nil(status.splitProbe("nohost"))
  end)
end)

describe("status.row", function()
  local dev = { label = "dev", target = "Git server", probe = "git.example.internal:22" }

  it("is ok when the tunnel is up and the target answers", function()
    assert.are.same({ label = "dev", detail = "Git server ✓", state = "ok" }, status.row(dev, true, true))
  end)

  it("warns when the tunnel is up but the target doesn't answer or isn't checked yet", function()
    assert.are.same({ label = "dev", detail = "Git server unreachable", state = "warn" }, status.row(dev, true, false))
    assert.are.equal("warn", status.row(dev, true, nil).state)
  end)

  it("is down when the tunnel isn't running, noting a target reachable anyway", function()
    assert.are.same({ label = "dev", detail = "down", state = "down" }, status.row(dev, false, false))
    assert.are.equal("down (Git server reachable)", status.row(dev, false, true).detail)
  end)

  it("shows onDemand tunnels that are down as off, and probes them when up", function()
    local prod = { label = "prod", target = "Kibana", probe = "logs.example.internal:443", onDemand = true }
    assert.are.same({ label = "prod", detail = "off", state = "off" }, status.row(prod, false, false))
    assert.are.same({ label = "prod", detail = "Kibana ✓", state = "ok" }, status.row(prod, true, true))
    assert.are.equal("warn", status.row(prod, true, false).state)
  end)

  it("hides optional tunnels that are down", function()
    local prod = { label = "prod", optional = true }
    assert.is_nil(status.row(prod, false, nil))
    assert.are.same({ label = "prod", detail = "up", state = "ok" }, status.row(prod, true, nil))
  end)
end)
