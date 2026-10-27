-- Fuzzy matching for search-as-you-type lists: the query's characters must
-- appear in the text in order, with matches at word starts and runs of
-- consecutive characters ranking higher. Plain Lua (no hs.*), so it can be
-- tested outside Hammerspoon; see spec/fuzzy_spec.lua.

local fuzzy = {}

local CONSECUTIVE_BONUS = 3
local WORD_START_BONUS = 2

-- Characters of s (UTF-8 aware, so ⌘ / ✧ count as one) and their lowercase forms
local function chars(s)
  local list, lower = {}, {}
  for _, code in utf8.codes(s) do
    local c = utf8.char(code)
    list[#list + 1] = c
    lower[#lower + 1] = c:lower()
  end
  return list, lower
end

local function isWordStart(list, i)
  if i == 1 then return true end
  local prev, cur = list[i - 1], list[i]
  if not prev:match("%w") then return true end
  -- camelCase: "showTime" starts a word at T
  return prev:match("%l") ~= nil and cur:match("%u") ~= nil
end

-- Score for matching query against text greedily from text position `from`, or nil.
local function scoreFrom(q, list, lower, from)
  local score, prev = 0, nil
  local pos = from
  for qi = 1, #q do
    while pos <= #lower and lower[pos] ~= q[qi] do pos = pos + 1 end
    if pos > #lower then return nil end
    score = score + 1
    if prev and pos == prev + 1 then score = score + CONSECUTIVE_BONUS end
    if isWordStart(list, pos) then score = score + WORD_START_BONUS end
    prev = pos
    pos = pos + 1
  end
  return score
end

--- fuzzy.score(query, text) -> number or nil
--- How well `query` matches `text` (higher is better), or nil if it doesn't.
--- Case-insensitive; spaces in the query are ignored. An empty query matches
--- everything with score 0.
function fuzzy.score(query, text)
  local q = select(2, chars((query or ""):gsub("%s+", "")))
  if #q == 0 then return 0 end
  local list, lower = chars(text or "")
  -- try every place the first character occurs and keep the best
  local best
  for start = 1, #lower do
    if lower[start] == q[1] then
      local s = scoreFrom(q, list, lower, start)
      if s and (not best or s > best) then best = s end
    end
  end
  return best
end

--- fuzzy.filter(query, items, fields) -> list
--- The items matching `query`, best first. `fields(item)` returns the strings to
--- search; an item's score is its best field's. Ties keep their original order.
function fuzzy.filter(query, items, fields)
  local scored = {}
  for i, item in ipairs(items) do
    local best
    for _, text in ipairs(fields(item)) do
      local s = fuzzy.score(query, text)
      if s and (not best or s > best) then best = s end
    end
    if best then scored[#scored + 1] = { item = item, score = best, index = i } end
  end
  table.sort(scored, function(a, b)
    if a.score ~= b.score then return a.score > b.score end
    return a.index < b.index
  end)
  local out = {}
  for i, s in ipairs(scored) do out[i] = s.item end
  return out
end

return fuzzy
