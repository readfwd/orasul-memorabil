#!/bin/bash

FOLDER="$1"
CREDENTIALS="$2"
TAGS="$3"

find "$FOLDER" -type f \( -name "*.jpg" -or -name "*.png" -or -name "*.jpeg" \) | while read file; do
    echo -en "\n\033[1;33mUploading \"$(basename "${file}")\"\033[0m\n\n"
    curl -u "$CREDENTIALS" -include --form "tags=$TAGS" --form "file=@${file}" http://localhost:8080/api/add_photo
done
