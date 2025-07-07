# PowerShell script to remove defunct test files after migration
# Remove backend/src/__tests__
Remove-Item -Path "backend/src/__tests__" -Recurse -Force -ErrorAction SilentlyContinue
# Remove backend/src/services/encryption/__tests__
Remove-Item -Path "backend/src/services/encryption/__tests__" -Recurse -Force -ErrorAction SilentlyContinue
# Remove frontend/plugin Star Trek modular-exports test __tests__
Remove-Item -Path "plugins/star-trek-universe/frontend/components/__tests__" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Defunct test directories removed."
