# PocketPress

> An extremely static site generator

PocketPress is a little zero-config SSG that produces HTML/CSS from a [LiveScript](https://livescript.net)-based DSL. It is meant to create simple sites quickly.

## Install

```sh 
npm install pocketpress
# or
pnpm add pocketpress
# or
yarn add pocketpress
```

## Usage

```
pocket [options]
  
  Options:
    -p, --path <dir>      Path to site directory
    -e, --exclude <dir>   Ignore directory
    -w, --watch           Enter watch mode
    -h, --help            Display this message
```

Scans a directory tree and transforms `.html.ls` template files into `.html` files.

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

All HTML elements are pre-defined functions. The `var` element is called `_var` to work with JS syntax.

## Styles

Style tags can use the `rule` and `media` block functions, and custom properties with `prop`:

```ls
style do
  rule ".red-bold",
    color "red"
    font-weight bold
  media "(prefers-color-scheme: dark)",
    rule ":root",
      prop "--fg" "white"
      prop "--bg" "black"
```

All CSS properties are pre-defined functions. The `continue` property is called `_continue` to work with JS syntax.

## Class Sugar

You can apply classes directly to the element functions:

```ls
div.red-bold "this is bold and red!"
div.red-bold.also-italic "this has two classes!"
```

## Inline Styles

You can also use CSS properties directly on elements:

```ls
div do
  color "red"
  font-weight "bold"
  "this is bold and red!"
```

## Layouts & Partials

Layouts and partials can be defined as `.ls` files:

`layout.ls`
```ls
(_title, _content) ->
  html do
    head
      title _title
    body do
      "My Site"
      main _content
```

`partial.ls`
```ls
p "this is a partial!"
```

and used within a `.html.ls` file with `include`:

```ls
layout = include "layout.ls"

page: layout "My Page",
  "this is my page!"
  include "partial.ls"
```

`include` understands `~/` at the beginning of the path as relative to the site root.

## Page Metadata

More properties can be specified beside the `page` result. If the `page` is a function,
these and other useful properties will be passed to it:

```ls
date: "2023-01-21"
title: "This is a blog entry!"
author: "errilaz"
tags: <[ birthday ]>
page: ({ date, title, author, tags, url, site }) -> div do
  h1 "#title by #author"
```

- `date` will be transformed into an instance of `Date`.
- `url` contains the path to the resulting html file.
- `site.templates` contains the metadata for all `.html.ls` templates.
- `site.authors` contains a list of `{ name, templates }` organized by author.
- `site.tags` contains a list of `{ name, templates }` organized by tag.

## Tag Pages

A file named `[tag].html.ls` will generate a page per tag, passing a `tag` property to
the page function. You can use `tag.name` and `tag.templates` to generate a tag index.

```ls
page: ({ tag }) -> div do
  h1 "Articles tagged \"#{tag.name}\""
  ul tag.templates.map ->
    li a href: "#{it.url}", it.title
```

## Live Reload

`live-reload!` embeds a script tag in watch mode which will check and reload pages. This is meant to be used with local `file:///` URLs as embedding a web server for this feature seemed excessive. If this is used, please add `.live-reload.js` to your source control ignore file.

## Embedded Markdown

Markdown can be embedded (uses the fast [marked](https://marked.js.org) library):

```ls
markdown """
  - this is a
  - simple
  - list!
"""
```

## LiveScript client side

`livescript` embeds a script tag with compiled LiveScript:

```ls
livescript """
  console.log \hello
"""
```

## Other features

`raw` includes un-escaped HTML content.

`elem` creates a custom element with the given tag and contents.

`load-file` synchronously reads a file relative to the current file. You can use `~/` at the start of the path to refer to the site root.

## Markdown Document Generator

Standalone `.md` documents can also be generated with `.md.ls` files. This is useful for READMEs containing repeated content or complex tables.

The `page` property is not used, instead use the `document` function:

```ls
dont-repeat-yourself = "something you want to embed over and over"

document do
  raw """
    # My Project
  """
  table tbody do
    tr do
      td "easy to maintain tables"
      td dont-repeat-yourself
      td dont-repeat-yourself
```
