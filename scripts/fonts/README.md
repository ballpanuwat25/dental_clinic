`anuphan-700-thai.ttf` is Anuphan (SIL Open Font License) pinned at weight 700, Thai subset, used only by
`scripts/build-wordmark.mjs`. It was made from the variable font next/font downloads into `.next-dev/static/media`:

```
python -c "from fontTools.ttLib import TTFont; from fontTools.varLib.instancer import instantiateVariableFont as i; f=i(TTFont('<the Anuphan Thai .woff2>'), {'wght': 700}); f.flavor=None; f.save('scripts/fonts/anuphan-700-thai.ttf')"
```
