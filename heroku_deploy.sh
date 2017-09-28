#!/bin/bash

git add .
git commit -m"e"
git push heroku master
heroku logs --tail