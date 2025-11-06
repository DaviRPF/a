@echo off
REM Script de sincronização automática para Windows
REM Uso: auto-sync.bat

set BRANCH=claude/sync-github-project-011CUqvdnRYxiugpuqjhsHxB
set INTERVAL=2

echo Iniciando sincronizacao automatica...
echo Branch: %BRANCH%
echo Verificando a cada %INTERVAL% segundos
echo Pressione Ctrl+C para parar
echo.

:loop
git fetch origin %BRANCH% 2>nul

for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/%BRANCH%') do set REMOTE=%%i

if not "%LOCAL%"=="%REMOTE%" (
    echo [%TIME%] Novas mudancas detectadas! Atualizando...
    git pull origin %BRANCH%
    echo Sincronizado com sucesso!
    echo.
) else (
    echo [%TIME%] Aguardando mudancas...
)

timeout /t %INTERVAL% /nobreak >nul
goto loop
