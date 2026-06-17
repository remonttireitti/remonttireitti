# Flashaa Guition P4 COM7-portista (Windows)

Set-Location $PSScriptRoot

if (-not (Test-Path "secrets.yaml")) {
  Copy-Item "secrets.yaml.example" "secrets.yaml"
  Write-Host "Luo secrets.yaml ja täytä wifi + airthings_mac ennen flashausta."
  exit 1
}

Write-Host "Portti: COM7"
Write-Host "Varmista että secrets.yaml sisältää oikean wifi-verkon."

python -m esphome run hub.yaml --device COM7
