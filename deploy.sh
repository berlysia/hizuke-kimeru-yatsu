#!/usr/bin/env sh

set -e

bun run build
cd dist

# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:berlysia/hizuke-kimeru-yatsu.git HEAD:gh-pages

cd -
