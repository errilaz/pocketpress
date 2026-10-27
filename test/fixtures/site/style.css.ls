stylesheet do
  rule "body",
    color "black"
    prop "--accent", "purple"
  rule "a, button",
    color "purple"
    rule ":hover, :focus",
      color "red"
  $media "(min-width: 600px)",
    rule "body",
      margin "0"
