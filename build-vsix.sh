#!/usr/bin/env bash
# Build a .vsix from this folder without needing node/vsce.
# A .vsix is just a zip with extension.vsixmanifest + [Content_Types].xml at the root
# and the actual extension files under extension/.
set -euo pipefail
cd "$(dirname "$0")"

NAME=$(/usr/bin/python3 -c "import json; print(json.load(open('package.json'))['name'])")
VERSION=$(/usr/bin/python3 -c "import json; print(json.load(open('package.json'))['version'])")
PUBLISHER=$(/usr/bin/python3 -c "import json; print(json.load(open('package.json'))['publisher'])")
DISPLAY=$(/usr/bin/python3 -c "import json; print(json.load(open('package.json'))['displayName'])")
DESC=$(/usr/bin/python3 -c "import json; print(json.load(open('package.json'))['description'])")

OUT="${PUBLISHER}.${NAME}-${VERSION}.vsix"
STAGE=$(mktemp -d -t vscode-faust-vsix)
trap "rm -rf $STAGE" EXIT

mkdir -p "$STAGE/extension"
# Copy everything except build output, dotfiles, the vsix itself, and this script
rsync -a \
  --exclude='.git*' --exclude='node_modules' --exclude='*.vsix' \
  --exclude='build-vsix.sh' --exclude='.DS_Store' --exclude='.vscode' \
  ./ "$STAGE/extension/"

cat > "$STAGE/[Content_Types].xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="js"   ContentType="application/javascript"/>
  <Default Extension="css"  ContentType="text/css"/>
  <Default Extension="html" ContentType="text/html"/>
  <Default Extension="md"   ContentType="text/markdown"/>
  <Default Extension="vsixmanifest" ContentType="text/xml"/>
  <Default Extension="png"  ContentType="image/png"/>
  <Default Extension="svg"  ContentType="image/svg+xml"/>
  <Default Extension="sh"   ContentType="text/plain"/>
</Types>
EOF

cat > "$STAGE/extension.vsixmanifest" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${NAME}" Version="${VERSION}" Publisher="${PUBLISHER}"/>
    <DisplayName>${DISPLAY}</DisplayName>
    <Description xml:space="preserve">${DESC}</Description>
    <Tags>faust,audio,dsp,hise,scope,spectrum</Tags>
    <Categories>Other,Programming Languages</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.85.0"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value=""/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
EOF

rm -f "$OUT"
( cd "$STAGE" && zip -r -q "$OLDPWD/$OUT" . )
echo "Built: $(pwd)/$OUT"
ls -la "$OUT"
