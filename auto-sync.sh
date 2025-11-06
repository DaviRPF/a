#!/bin/bash

# Script de sincronização automática com GitHub
# Uso: ./auto-sync.sh

BRANCH="claude/sync-github-project-011CUqvdnRYxiugpuqjhsHxB"
INTERVAL=2  # segundos entre verificações

echo "🔄 Iniciando sincronização automática..."
echo "📌 Branch: $BRANCH"
echo "⏱️  Verificando a cada $INTERVAL segundos"
echo "🛑 Pressione Ctrl+C para parar"
echo ""

while true; do
  # Busca atualizações do remoto
  git fetch origin $BRANCH 2>/dev/null

  # Verifica se há mudanças
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/$BRANCH)

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "🆕 [$(date '+%H:%M:%S')] Novas mudanças detectadas! Atualizando..."
    git pull origin $BRANCH
    echo "✅ Sincronizado com sucesso!"
    echo ""
  else
    echo "⏳ [$(date '+%H:%M:%S')] Aguardando mudanças..."
  fi

  sleep $INTERVAL
done
