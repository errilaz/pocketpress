# PocketPress

> An extremely static site generator

PocketPress is a little SSG that produces HTML/CSS from a [LiveScript](https://livescript.net)-based DSL. It is meant to create simple sites quickly, typically hosted on GitHub pages.

## Usage

`pocket [-p dir]`

This scans a directory tree and transforms `.html.ls` template files into `.html` files.

## Templates

The template fie should end in an object containing a `page` property:

```ls
page:
  html do
    body do
      div "hello world!"
      input type: "checkbox"
      table tbody tr do
        td "a cell"
        td "another cell"
```

All HTML elements are pre-defined functions.

## Styles

Style tags can use the `rule` function:

```ls
style do
  rule ".red-bold",
    color "red"
    font-weight bold
```

You can apply classes directly to the element functions:

```ls
div.red-bold "this is bold and red!"
```

You can also use CSS properties directly on elements:

```ls
div do
  color "red"
  font-weight "bold"
  "this is bold and red!"
```

## Layouts & Partials

Layouts and partials can be defined as `.ls` files ending in a function:

```ls
(_content) ->
  html body do
    "My Site"
    main _content
```

and used within a `.html.ls` file with `include`:

```ls
layout = include "layout.ls"

page: layout do
  "my page!"
```

`include` understands `~/` at the beginning of the path as relative to the site root.

## Additional functions

All HTML elements and CSS properties should work except `var` and `continue` which become `_var` and `_continue`.

`load-file` synchronously reads a file relative to the current file. You can use `~/` at the start of the path to refer to the site root.

`raw` includes un-escaped HTML content.

`markdown` includes markdown using the `marked` library:

```ls
markdown """
  - this is a
  - simple
  - list!
"""
```
