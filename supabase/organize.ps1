# Script para organizar arquivos antigos da pasta supabase
# Move arquivos antigos para uma pasta archive/

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Organizando pasta Supabase..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Criar pasta archive se nao existir
$archivePath = "supabase\archive"
if (-not (Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "Pasta archive criada: $archivePath" -ForegroundColor Green
}

# Lista de arquivos antigos para mover
$filesToArchive = @(
    "supabase\0001_cria_tabelas.sql",
    "supabase\0002_add_descricao_apontamentos.sql",
    "supabase\0002_add_valor_total_rs.sql",
    "supabase\0003_add_dates_esp.sql",
    "supabase\0003_alter_apontamentos_time_columns.sql",
    "supabase\0004_remove_unique_constraint_metricas.sql",
    "supabase\0005_enable_rls.sql",
    "supabase\0010_usuarios_sistemas.sql",
    "supabase\0011_rls_z_tables.sql",
    "supabase\999_fix_rls_usuarios_sistema_perfis.sql",
    "supabase\EXECUTAR_MANUALMENTE_fix_constraint.sql",
    "supabase\MySQL_RS_tabelas.sql",
    "supabase\Contratos_Dados_SQL.sql",
    "supabase\C_CLIENTES.csv",
    "supabase\clientes.csv",
    "supabase\ER_RS_Contratos.jpg"
)

$movedCount = 0
$notFoundCount = 0

Write-Host "Movendo arquivos antigos para archive/..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $filesToArchive) {
    if (Test-Path $file) {
        $fileName = Split-Path $file -Leaf
        $destination = Join-Path $archivePath $fileName
        
        try {
            Move-Item -Path $file -Destination $destination -Force
            Write-Host "  Movido: $fileName" -ForegroundColor Green
            $movedCount++
        }
        catch {
            Write-Host "  Erro ao mover: $fileName" -ForegroundColor Red
        }
    }
    else {
        $fileName = Split-Path $file -Leaf
        Write-Host "  Nao encontrado: $fileName" -ForegroundColor Gray
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resumo:" -ForegroundColor White
Write-Host "  Arquivos movidos: $movedCount" -ForegroundColor Green
Write-Host "  Arquivos nao encontrados: $notFoundCount" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Listar arquivos restantes na pasta supabase
Write-Host "Arquivos na pasta supabase:" -ForegroundColor Cyan
Get-ChildItem -Path "supabase" -File | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "Estrutura organizada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos importantes:" -ForegroundColor Yellow
Write-Host "  migrations/00_schema_completo.sql - Schema completo" -ForegroundColor White
Write-Host "  generate-types.ps1 - Gerar tipos TypeScript" -ForegroundColor White
Write-Host "  README.md - Documentacao" -ForegroundColor White
Write-Host ""
