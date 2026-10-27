(heading, content) ->
  html do
    head title heading
    body do
      header "Fixture Journal"
      main content
      include "partials/note.ls"
