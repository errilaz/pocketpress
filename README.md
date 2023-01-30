# PocketPress

> An extremely static site generator

PocketPress is a little zero-config SSG that produces HTML/CSS from a [LiveScript](https://livescript.net)-based DSL.

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
pocket [options] [path]
  
  Options:
    -o, --output <dir>    Output directory
    -e, --exclude <dir>   Ignore directory
    -w, --watch           Enter watch mode
    -h, --help            Display this message
```

Scans a directory tree and transforms `.html.ls` template files into `.html` files, `.css.ls` into `.css`, and `.md.ls` into `.md`.

## HTML Templates

The `.html.ls` template file should end in an object containing a `page` property:

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

## Class Syntax Sugar

You can apply classes directly to the element functions:

```ls
div.red-bold "this is bold and red!"
div.red-bold.also-italic "this has two classes!"
```

## Styles

Style tags can use the `rule` block function, and custom properties with `prop`:

```ls
style do
  rule ".red-bold",
    color "red"
    font-weight bold
    prop "-some-nonstandard" "value"
```

All CSS properties are pre-defined functions. The `continue` property is called `_continue` to work with JS syntax.

## Inline Styles

You can also use CSS properties directly on elements:

```ls
div do
  color "red"
  font-weight "bold"
  "this is bold and red!"
```

## Nested Rules

Rules may be nested:

```ls
rule ".danger",
  color "red"
  rule ".icon",
    float "right"
```

Child selectors can be combined with the parent selector, similar to Sass and Less.js. This results in a second rule with the selector `.danger.large`:

```ls
rule ".danger",
  color "red"
  rule "&.large",
    font-size "30px"
```

Nested selectors with pseudo-classes do the same:

```ls
rule "a",
  color "red"
  rule ":hover",
    text-decoration "underline"
```

PocketPress detects multiple selectors in a rule and will generate the necessary CSS:

```ls
rule "input, textarea",
  border "solid 1px gray"
  rule ":hover, :focus",
    border-color "black"
```

## At-rules

Media queries and other [at-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule) are supported
with the `$` prefix: 

```ls
$media "(prefers-color-scheme: dark)",
  rule ":root",
    prop "--fg" "white"
    prop "--bg" "black"
```

```ls
$layer do
  rule "p",
    color "red"
```

## CSS Templates

`.css.ls` files simply use the `stylesheet` function as the top level. Note this must also be the last expression in the file:

```ls
stylesheet do
  rule ".danger",
    color "red"
    font-weight "bold"
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
summary: "This is a summary used in feeds!"
author: "errilaz"
tags: <[ birthday ]>
map: true
feed: true
page: ({ date, title, author, tags, url, site, previous, next }) -> div do
  h1 "#title by #author"
```

- `date` will be transformed into an instance of `Date`.
- `url` contains the path to the resulting html file.
- `site.templates` contains the metadata for all `.html.ls` templates.
- `site.authors` contains a list of `{ name, templates }` organized by author.
- `site.tags` contains a list of `{ name, templates }` organized by tag.
- `previous` and `next` contain the metadata for adjacent dated pages.

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

`link-to` is a helper function which will, in watch mode, produce `file:` URLs based on root-relative paths. It will append `index.html` to paths ending in `/` (apart from the root `/`). This way links can be followed in watch mode. Outside of watch mode, the trailing slash will simply be dropped. 

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

## Other functions

`raw` includes un-escaped HTML content.

`elem` creates a custom element with the given tag and contents.

`load-file` synchronously reads a file relative to the current file. You can use `~/` at the start of the path to refer to the site root.

`quote` is a helper to wrap a CSS string in `"` characters and escape the contents.

## Site Metadata

PocketPress will look for a `package.json` at the root, and if `pocket.baseUrl` field is populated, will use it to produce `/robots.txt`, `/sitemap.xml`, `/feed.xml` (Atom), and `/feed.json`:

```json
  "pocket": {
    "baseUrl": "https://example.com",
    "title": "Appears as title in feeds"
  }
```

Any page containing the `date` metadata will be included in the feed, unless `feed: false` is also specified. Pages can be opted-in to the sitemap with `map: true`.

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

## VSCode Settings

For less clutter, you can collapse generated files in Visual Studio Code with these settings:

```json
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "*.html.ls": "$(capture).html",
    "*.css.ls": "$(capture).html",
    "*.md.ls": "$(capture).md",
    "[tag].html.ls": "*.html",
    "index.html.ls": "sitemap.xml, robots.txt, feed.json, feed.xml",
  },
```
