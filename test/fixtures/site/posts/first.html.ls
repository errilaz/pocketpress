layout = include "~/layout.ls"
title: "First entry"
date: "2023-01-10"
summary: "First summary"
author: "Alice"
tags: ["code", "shared"]
map: true
page: (meta) -> layout meta.title, [
  h1 meta.title
  pre raw JSON.stringify do
    url: meta.url
    date: meta.date.toISOString!
    previous: meta.previous?.title
    next: meta.next?.title
]
