page: ({tag, url}) -> div do
  h1 tag.name
  p url
  ul tag.templates.map (entry) -> li a {href: entry.url}, entry.title
