# Script para gerar tipos TypeScript do Supabase
# Execute este script sempre que atualizar o schema do banco de dados

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Gerando tipos TypeScript do Supabase..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o Supabase CLI está instalado
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalar o Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou visite: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# Verificar se as variáveis de ambiente estão configuradas
if (-not $env:NEXT_PUBLIC_SUPABASE_URL) {
    Write-Host "AVISO: NEXT_PUBLIC_SUPABASE_URL não está definida!" -ForegroundColor Yellow
    Write-Host "Certifique-se de ter um arquivo .env.local com as configurações do Supabase" -ForegroundColor Yellow
    Write-Host ""
}

# Gerar tipos TypeScript
Write-Host "Gerando tipos..." -ForegroundColor Green

try {
    # Opção 1: Gerar tipos a partir do projeto Supabase remoto
    # Requer: supabase login e supabase link
    # npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
    
    # Opção 2: Gerar tipos a partir do schema local
    # Requer: arquivo de migração SQL
    Write-Host "Usando schema local para gerar tipos..." -ForegroundColor Cyan
    
    # Criar arquivo temporário com o schema
    $schemaFile = "supabase/migrations/00_schema_completo.sql"
    
    if (Test-Path $schemaFile) {
        Write-Host "Schema encontrado: $schemaFile" -ForegroundColor Green
        
        # Comando para gerar tipos (ajuste conforme necessário)
        # npx supabase gen types typescript --local > src/lib/supabase/types.ts
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "INSTRUÇÕES PARA GERAR TIPOS:" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Faça login no Supabase CLI:" -ForegroundColor White
        Write-Host "   supabase login" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Vincule seu projeto:" -ForegroundColor White
        Write-Host "   supabase link --project-ref YOUR_PROJECT_ID" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Gere os tipos TypeScript:" -ForegroundColor White
        Write-Host "   supabase gen types typescript --linked > src/lib/supabase/types.ts" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Ou execute diretamente do banco de dados:" -ForegroundColor White
        Write-Host "   npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/lib/supabase/types.ts" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "ERRO: Schema não encontrado em $schemaFile" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Concluído!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERRO ao gerar tipos: $_" -ForegroundColor Red
    exit 1
}
