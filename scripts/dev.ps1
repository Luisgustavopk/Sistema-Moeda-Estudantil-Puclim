param(
    [ValidateSet('up', 'backend', 'down', 'logs', 'config', 'init')]
    [string]$Action = 'up'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$originalLocation = Get-Location
try {
    Set-Location $projectRoot
    $envFile = Join-Path $projectRoot '.env'
    if (-not (Test-Path $envFile)) {
        $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $bytes = New-Object byte[] 32
            $random.GetBytes($bytes)
            $userPassword = -join ($bytes | ForEach-Object { $_.ToString('x2') })
            $random.GetBytes($bytes)
            $rootPassword = -join ($bytes | ForEach-Object { $_.ToString('x2') })
        } finally { $random.Dispose() }
        $content = [IO.File]::ReadAllText((Join-Path $projectRoot '.env.example'))
        $content = $content.Replace('change-me-local-user', $userPassword).Replace('change-me-local-root', $rootPassword)
        [IO.File]::WriteAllText($envFile, $content, (New-Object Text.UTF8Encoding $false))
        Write-Host 'Arquivo .env criado com senhas aleatórias. Ele é ignorado pelo Git.'
    }
    foreach ($line in [IO.File]::ReadAllLines($envFile)) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line -match '^\s*#') { continue }
        if ($line -notmatch '^([A-Z][A-Z0-9_]*)=(.*)$') { throw 'Use .env com uma variável NOME=valor por linha, sem aspas.' }
        $key = $Matches[1]; $value = $Matches[2]
        if ($key -match '^(DB_.*|MYSQL_ROOT_PASSWORD|SMTP_.*|MAIL_.*|SESSION_.*|UPLOAD_DIRECTORY|SEMESTER_ZONE|SERVER_PORT)$') {
            # Nos scripts o arquivo compartilhado prevalece sobre variáveis antigas do terminal.
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
    if (-not $env:DB_ENGINE) {
        # PowerShell Desktop (5.1) é Windows; Core também pode ser usado no Linux.
        $env:DB_ENGINE = if ($env:OS -eq 'Windows_NT') { 'mysql' } else { 'mariadb' }
    }
    if ($env:DB_ENGINE -notin @('mysql', 'mariadb')) { throw 'DB_ENGINE deve ser mysql ou mariadb.' }
    if (-not $env:DB_NAME) { $env:DB_NAME = 'puclim' }
    if (-not $env:DB_USER) { $env:DB_USER = 'puclim' }
    if (-not $env:DB_PORT) { $env:DB_PORT = '3307' }
    if (-not $env:DB_PASSWORD -or -not $env:MYSQL_ROOT_PASSWORD) { throw 'Preencha DB_PASSWORD e MYSQL_ROOT_PASSWORD em .env.' }

    function Invoke-Compose {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Instale e inicie o Docker Desktop com containers Linux e Docker Compose.' }
        & docker compose version | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não está disponível.' }
        & docker compose --env-file $envFile --file (Join-Path $projectRoot 'compose.yaml') --profile $env:DB_ENGINE @args
        if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não conseguiu concluir a operação.' }
    }
    switch ($Action) {
        'init' { Write-Host "Configuração pronta: $env:DB_ENGINE em 127.0.0.1:$env:DB_PORT." }
        'up' {
            Write-Host "Iniciando $env:DB_ENGINE e Mailpit em 127.0.0.1:$env:DB_PORT."
            Invoke-Compose up --detach --wait --wait-timeout 180 $env:DB_ENGINE mailpit
            Write-Host 'Banco pronto. Em outro terminal, execute: .\scripts\dev.ps1 backend'
        }
        'backend' {
            $env:DB_URL = "jdbc:$($env:DB_ENGINE)://127.0.0.1:$($env:DB_PORT)/$($env:DB_NAME)?connectionTimeZone=UTC"
            Write-Host "Backend usando $env:DB_ENGINE em 127.0.0.1:$env:DB_PORT."
            Set-Location (Join-Path $projectRoot 'backend')
            if ($env:OS -eq 'Windows_NT') { & .\mvnw.cmd spring-boot:run }
            else { & bash ./mvnw spring-boot:run }
            if ($LASTEXITCODE -ne 0) { throw 'O backend não conseguiu iniciar.' }
        }
        'down' { Invoke-Compose down }
        'logs' { Invoke-Compose logs --follow $env:DB_ENGINE }
        'config' { Invoke-Compose config --quiet; Write-Host "Compose válido para o perfil $env:DB_ENGINE." }
    }
} finally { Set-Location $originalLocation }
