# Sincroniza OPENAI_API_KEY (.env) -> opencode.json, sin BOM y sin mostrar la clave completa.
# Uso:  .\sincronizar-claves.ps1            (proyecto actual)
#       .\sincronizar-claves.ps1 -Global    (tambien copia a ~\.config\opencode\opencode.json)
param([switch]$Global, [switch]$Pausa)

$dir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath  = Join-Path $dir '.env'
$ocPath   = Join-Path $dir 'opencode.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Mask($k) { if ($k.Length -gt 8) { $k.Substring(0,12) + '...' + $k.Substring($k.Length-4) } else { '****' } }

if (-not (Test-Path $envPath)) { Write-Host "[ERROR] No existe $envPath" -ForegroundColor Red; exit 1 }
$m = [regex]::Match((Get-Content $envPath -Raw), '(?m)^\s*OPENAI_API_KEY=(freellmapi-\S+)')
if (-not $m.Success) { Write-Host '[ERROR] No encuentro OPENAI_API_KEY=freellmapi-... en .env' -ForegroundColor Red; exit 1 }
$key = $m.Groups[1].Value.Trim()
Write-Host "[OK] Clave en .env: $(Mask $key)" -ForegroundColor Green

# Comprobar que la pasarela acepta ESA clave
try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/v1/models' -Headers @{ Authorization = "Bearer $key" } -ErrorAction Stop
    Write-Host "[OK] FreeLLMAPI acepta la clave ($(@($r.data).Count) modelos visibles)." -ForegroundColor Green
} catch {
    Write-Host "[AVISO] FreeLLMAPI no acepta la clave o no responde: $($_.Exception.Message)" -ForegroundColor Yellow
}

function Update-OpenCode($path) {
    if (-not (Test-Path $path)) { Write-Host "[AVISO] No existe $path" -ForegroundColor Yellow; return }
    $json = [System.IO.File]::ReadAllText($path)          # ReadAllText ya descarta el BOM
    $json = $json.TrimStart([char]0xFEFF)
    $new  = [regex]::Replace($json, '"apiKey"\s*:\s*"[^"]*"', ('"apiKey": "' + $key + '"'))
    [System.IO.File]::WriteAllText($path, $new, $utf8NoBom) # SIN BOM
    Write-Host "[OK] Actualizado: $path" -ForegroundColor Green
}

Update-OpenCode $ocPath
if ($Global) {
    $gDir = Join-Path $env:USERPROFILE '.config\opencode'
    New-Item -ItemType Directory -Force -Path $gDir | Out-Null
    Copy-Item $ocPath (Join-Path $gDir 'opencode.json') -Force
    Update-OpenCode (Join-Path $gDir 'opencode.json')
}
if ($Pausa) { Read-Host 'Pulsa Enter para cerrar' }
