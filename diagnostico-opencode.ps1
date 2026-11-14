# Diagnostico completo OpenCode <-> FreeLLMAPI. Ejecutar en la carpeta del proyecto:
#   powershell -ExecutionPolicy Bypass -File .\diagnostico-opencode.ps1
$base   = 'http://127.0.0.1:3001/v1'
$dir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$envF   = Join-Path $dir '.env'
$ocF    = Join-Path $dir 'opencode.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Ok($m)   { Write-Host "[OK]    $m" -ForegroundColor Green }
function Bad($m)  { Write-Host "[FALLO] $m" -ForegroundColor Red }
function Warn($m) { Write-Host "[AVISO] $m" -ForegroundColor Yellow }
function Mask($k) { if ($k -and $k.Length -gt 8) { $k.Substring(0,12) + '...' + $k.Substring($k.Length-4) } else { '(vacia)' } }

Write-Host "`n=== 1. Archivos de configuracion ===" -ForegroundColor Cyan
$envKey = $null
if (Test-Path $envF) {
    $b = [System.IO.File]::ReadAllBytes($envF)
    if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { Bad '.env tiene BOM: node --env-file leera mal la primera variable.' } else { Ok '.env sin BOM' }
    $m = [regex]::Match([System.Text.Encoding]::UTF8.GetString($b), '(?m)^\s*OPENAI_API_KEY=(\S+)')
    if ($m.Success) { $envKey = $m.Groups[1].Value; Ok "OPENAI_API_KEY en .env: $(Mask $envKey)" } else { Bad 'Falta OPENAI_API_KEY en .env' }
} else { Bad "No existe $envF" }

$ocKey = $null
if (Test-Path $ocF) {
    $b = [System.IO.File]::ReadAllBytes($ocF)
    if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { Bad 'opencode.json tiene BOM (la causa mas probable de que OpenCode ignore la config). Ejecuta .\sincronizar-claves.ps1' } else { Ok 'opencode.json sin BOM' }
    try {
        $j = [System.Text.Encoding]::UTF8.GetString($b).TrimStart([char]0xFEFF) | ConvertFrom-Json
        $ocKey = $j.provider.freellmapi.options.apiKey
        Ok "opencode.json es JSON valido. model = $($j.model) ; baseURL = $($j.provider.freellmapi.options.baseURL)"
    } catch { Bad "opencode.json no se puede parsear: $($_.Exception.Message)" }
} else { Bad "No existe $ocF" }
if ($envKey -and $ocKey) { if ($envKey -eq $ocKey) { Ok 'La clave de .env y la de opencode.json coinciden' } else { Bad 'Las claves de .env y opencode.json son DISTINTAS. Ejecuta .\sincronizar-claves.ps1' } }
$key = if ($ocKey) { $ocKey } else { $envKey }
$global = Join-Path $env:USERPROFILE '.config\opencode\opencode.json'
if (Test-Path $global) { Warn "Existe config global: $global (la del proyecto tiene prioridad, pero revisa que no choquen)" }

Write-Host "`n=== 2. Pasarela y clave (GET /v1/models) ===" -ForegroundColor Cyan
$h = @{ Authorization = "Bearer $key" }
try {
    $r = Invoke-RestMethod -Uri "$base/models" -Headers $h -TimeoutSec 10 -ErrorAction Stop
    Ok "FreeLLMAPI responde y acepta la clave. Modelos: $(@($r.data).Count)"
} catch { Bad "GET /v1/models: $($_.Exception.Message)  -> pasarela caida o clave rechazada"; return }

Write-Host "`n=== 3. Chat normal (model=auto) ===" -ForegroundColor Cyan
$body = @{ model = 'auto'; stream = $false; messages = @(@{ role = 'user'; content = 'Responde solo: ok' }) } | ConvertTo-Json -Depth 6
try {
    $r = Invoke-RestMethod -Uri "$base/chat/completions" -Method Post -Headers $h -ContentType 'application/json' -Body $body -TimeoutSec 90 -ErrorAction Stop
    Ok "Respuesta: '$($r.choices[0].message.content)'  via: $($r._routed_via.platform) / $($r._routed_via.model)"
} catch { Bad "Chat normal: $($_.Exception.Message)" }

Write-Host "`n=== 4. Chat con STREAMING (lo que usa OpenCode) ===" -ForegroundColor Cyan
$tmp = [System.IO.Path]::GetTempFileName()
$sBody = @{ model = 'auto'; stream = $true; messages = @(@{ role = 'user'; content = 'Cuenta de 1 a 3' }) } | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($tmp, $sBody, $utf8NoBom)
$out = (& curl.exe -s -N --max-time 60 -H "Authorization: Bearer $key" -H "Content-Type: application/json" --data-binary "@$tmp" "$base/chat/completions") -join "`n"
if ($out -match 'data:') { if ($out -match '\[DONE\]') { Ok 'Streaming SSE correcto (termina con [DONE])' } else { Warn 'Hay streaming pero no termino con [DONE]' } } else { Bad "Sin streaming SSE. Respuesta: $($out.Substring(0,[Math]::Min(300,$out.Length)))" }

Write-Host "`n=== 5. Llamada a herramientas (tool calling; OpenCode lo necesita para editar archivos) ===" -ForegroundColor Cyan
$tBody = @{
    model = 'auto'; stream = $false
    messages = @(@{ role = 'user'; content = 'Usa la herramienta get_time para saber la hora en Madrid.' })
    tools = @(@{ type = 'function'; function = @{ name = 'get_time'; description = 'Devuelve la hora de una ciudad'; parameters = @{ type = 'object'; properties = @{ city = @{ type = 'string' } }; required = @('city') } } })
    tool_choice = 'auto'
} | ConvertTo-Json -Depth 10
try {
    $r = Invoke-RestMethod -Uri "$base/chat/completions" -Method Post -Headers $h -ContentType 'application/json' -Body $tBody -TimeoutSec 90 -ErrorAction Stop
    if ($r.choices[0].message.tool_calls) { Ok "Tool calling OK via $($r._routed_via.platform) / $($r._routed_via.model)" }
    else { Warn "El modelo elegido ($($r._routed_via.platform) / $($r._routed_via.model)) contesto sin usar la herramienta. Repite el test 2-3 veces: si falla casi siempre, el router 'auto' esta eligiendo modelos sin tools." }
} catch { Bad "Tool calling: $($_.Exception.Message)" }

Write-Host "`n=== Fin. Si todo sale OK, abre OpenCode DESDE esta carpeta y ejecuta /models ===" -ForegroundColor Cyan
Remove-Item $tmp -ErrorAction SilentlyContinue
