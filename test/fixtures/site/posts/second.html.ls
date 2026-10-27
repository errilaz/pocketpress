layout = include "~/layout.ls"
title: "Second entry"
date: "2023-01-20"
summary: "Second summary"
author: "Bob"
tags: ["shared"]
map: true
page: (meta) -> layout meta.title, [
  h1 meta.title
  pre raw JSON.stringify do
    url: meta.url
    date: meta.date.toISOString!
    previous: meta.previous?.title
    next: meta.next?.title
]
