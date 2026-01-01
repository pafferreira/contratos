@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: -------------------------------
:: Branch atual
:: -------------------------------
for /f "delims=" %%b in ('git branch --show-current') do set CURRENT_BRANCH=%%b

if "%CURRENT_BRANCH%"=="" (
    set CURRENT_BRANCH=desconhecida
)

:: -------------------------------
:: Tags atuais (antes do bump)
:: -------------------------------
set LASTTAG=
git fetch --tags
for /f "delims=" %%t in ('git tag --list "v*" --sort=-v:refname') do (
    set LASTTAG=%%t
    goto :tag_done
)
:tag_done

echo ---------------------------------------
echo Branch atual: %CURRENT_BRANCH%
echo Tag    atual: %LASTTAG%
echo ---------------------------------------
echo.

:: -------------------------------
:: Escolha do tipo de versão
:: -------------------------------
echo Escolha o tipo de versão:
echo [1] PATCH  - Correções / ajustes
echo [2] MINOR  - Nova funcionalidade
echo [3] MAJOR  - Mudança estrutural
echo.

set /p OPTION=Digite 1, 2 ou 3: 

if "%OPTION%"=="1" set VERSION_TYPE=patch
if "%OPTION%"=="2" set VERSION_TYPE=minor
if "%OPTION%"=="3" set VERSION_TYPE=major

if not defined VERSION_TYPE (
    echo Opcao invalida. Usando PATCH por padrao.
    set VERSION_TYPE=patch
)

:: -------------------------------
:: Mensagem complementar
:: -------------------------------
set /p EXTRA_MSG=Mensagem complementar do commit (opcional): 

:: -------------------------------
:: Data e hora
:: -------------------------------
for /f "tokens=1-4 delims=/ " %%a in ("%date%") do (
    set DIA=%%a
    set MES=%%b
    set ANO=%%c
)
set HORA=%time%

set MSG=Commit automático em %DIA%/%MES%/%ANO% às %HORA% [%CURRENT_BRANCH%]
if not "%EXTRA_MSG%"=="" set MSG=%MSG% - %EXTRA_MSG%

echo.
echo ---------------------------------------
echo Tipo de versão: %VERSION_TYPE%
echo Mensagem do commit:
echo %MSG%
echo ---------------------------------------
echo.

if "%LASTTAG%"=="" (
    set MAJOR=1
    set MINOR=0
    set PATCH=0
) else (
    for /f "tokens=1,2,3 delims=." %%a in ("%LASTTAG:~1%") do (
        set MAJOR=%%a
        set MINOR=%%b
        set PATCH=%%c
    )
)

:: -------------------------------
:: Incremento da versão
:: -------------------------------
if "%VERSION_TYPE%"=="major" (
    set /a MAJOR+=1
    set MINOR=0
    set PATCH=0
) else if "%VERSION_TYPE%"=="minor" (
    set /a MINOR+=1
    set PATCH=0
) else (
    set /a PATCH+=1
)

set NEWVERSION=!MAJOR!.!MINOR!.!PATCH!
set NEWTAG=v!NEWVERSION!

echo Atualizando package.json para: !NEWVERSION!
if exist package.json npm version !NEWVERSION! --no-git-tag-version --allow-same-version
if errorlevel 1 (
    echo Falha ao atualizar package.json. Verifique o erro acima.
    exit /b 1
)
if exist package-lock.json git add package-lock.json
if exist package.json git add package.json

:: -------------------------------
:: Commit
:: -------------------------------
git add .
git diff --cached --quiet
if not "%errorlevel%"=="0" (
    git commit -m "%MSG%"
    if errorlevel 1 (
		echo ---------------------------------------
        echo Falha ao criar commit. Verifique mensagens acima.
		echo ---------------------------------------
        exit /b 1
    )
) else (
	echo ---------------------------------------
    echo Nada para commitar. Nenhuma alteracao foi adicionada ao stage.
	echo TAG: %LASTTAG% -> %NEWTAG%
	echo "%MSG%"
	echo ---------------------------------------
	echo.
    exit /b 0
)

:: -------------------------------
:: Rebase e TAG
:: -------------------------------
git pull --rebase
echo Criando TAG: %NEWTAG%
git tag -a %NEWTAG% -m "Release %NEWTAG%"
git push --follow-tags

echo.
echo Commit e TAG criados com sucesso!
echo Branch: %CURRENT_BRANCH%
echo TAG: %LASTTAG% -> %NEWTAG%
echo "%MSG%"
echo. 
pause
