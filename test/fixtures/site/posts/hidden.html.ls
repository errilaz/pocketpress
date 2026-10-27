{
  title: "Unlisted entry"
  date: "2023-01-15"
  author: "Alice"
  tags: ["private"]
  feed: false
  map: false
  page: (meta) -> pre raw JSON.stringify do
    previous: meta.previous?.title
    next: meta.next?.title
}
