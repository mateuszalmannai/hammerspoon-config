-- Copy to vpn_tunnels.lua (which is git-ignored) and fill in your tunnels.
-- One entry per tunnel to show, in order:
--   id        vpn-switch tunnel id (from ~/.vpn-switch/config.json)
--   label     short name shown in the widget
--   target    name of the service behind the tunnel (optional)
--   probe     "host:port" that should answer while the tunnel works (optional)
--   onDemand  true for a tunnel normally off: grey "off" when down, not red
--   optional  true to show the row only while the tunnel is up
return {
  { id = "work-dev",    label = "dev",    target = "Git server", probe = "git.example.internal:22" },
  { id = "work-office", label = "office", target = "deploy VM",  probe = "deploy.example.internal:22" },
  { id = "work-prod",   label = "prod",   target = "Kibana",     probe = "logs.example.internal:443", onDemand = true },
  { id = "work-spare",  label = "spare",  optional = true },
}
