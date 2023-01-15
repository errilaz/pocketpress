# PocketPress

> An extremely static site generator

PocketPress is a little SSG that produces HTML/CSS from a [LiveScript](https://livescript.net)-based DSL. It is meant to create simple sites quickly, typically hosted on GitHub pages.

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

## Watch mode

`live-reload!` embeds a script tag in watch mode which will check and reload pages. This is meant to be used with local `file:///` URLs as embedding a web server for this feature seemed excessive. If this is used, please add `.live-reload.js` to your source control ignore file.

## Markdown

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

