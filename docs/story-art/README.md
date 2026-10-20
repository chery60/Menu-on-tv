# Story artwork

The bills of fare and street posters in `public/story/` are illustrations made for the home page, in the style of the time. They are not historical originals, and the shops on them are invented.

To change one, edit `art.mjs`, then render every page to WebP (needs Google Chrome and `cwebp`):

```bash
cd docs/story-art && node art.mjs && while read name w h; do "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1.5 --window-size=$w,$h --virtual-time-budget=10000 --screenshot="$PWD/$name.png" "file://$PWD/$name.html"; cwebp -quiet -q 80 "$name.png" -o "../../public/story/$name.webp"; rm "$name.png" "$name.html"; done < list.txt; rm list.txt
```
