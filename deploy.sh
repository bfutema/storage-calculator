#!/usr/bin/env bash

# Deploy do Vite (dist/) para GitHub Pages via branch gh-pages
# Uso: yarn deploy
#
# Variáveis opcionais:
#   VITE_BASE_PATH="/<repo>/"   # base do Vite (Project Pages)
#   GHP_BRANCH="gh-pages"
#   GHP_REMOTE="origin"
#   DEPLOY_PUSH_SOURCE=1        # após o commit de segurança, faz push da branch atual
#   DEPLOY_COMMIT_PREFIX="chore: checkpoint"  # prefixo da mensagem do commit de segurança

set -euo pipefail

echo "🚀 Iniciando deploy (Vite) para GitHub Pages..."

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Erro: git não encontrado."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Erro: este diretório não parece ser um repositório git."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "❌ Erro: HEAD detached ou branch desconhecida. Faça checkout em uma branch antes do deploy."
  exit 1
fi
GHP_BRANCH="${GHP_BRANCH:-gh-pages}"
GHP_REMOTE="${GHP_REMOTE:-origin}"

ORIGIN_URL="$(git remote get-url "$GHP_REMOTE" 2>/dev/null || true)"
REPO_NAME=""
OWNER_NAME=""

if [[ -n "$ORIGIN_URL" ]]; then
  tmp="$ORIGIN_URL"
  tmp="${tmp%.git}"
  REPO_NAME="${tmp##*/}"
  tmp2="$tmp"
  tmp2="${tmp2%/*}"
  tmp2="${tmp2##*/}"
  # remotes SSH com alias (git@github-oeco:owner/repo.git) deixam o host antes do owner
  OWNER_NAME="${tmp2##*:}"
fi

if [[ -z "${VITE_BASE_PATH:-}" ]]; then
  if [[ -n "$OWNER_NAME" && -n "$REPO_NAME" && "$REPO_NAME" == "${OWNER_NAME}.github.io" ]]; then
    export VITE_BASE_PATH="/"
  elif [[ -n "$REPO_NAME" ]]; then
    export VITE_BASE_PATH="/${REPO_NAME}/"
  else
    export VITE_BASE_PATH="/storage-calculator/"
  fi
fi

echo "ℹ️  Remote: ${GHP_REMOTE} (${ORIGIN_URL:-sem origin})"
echo "ℹ️  Base path: ${VITE_BASE_PATH}"
echo "ℹ️  Branch fonte: ${CURRENT_BRANCH}"

if [[ -z "$ORIGIN_URL" ]]; then
  echo "❌ Erro: remote «${GHP_REMOTE}» não configurado. Adicione o origin antes do deploy."
  exit 1
fi

# Commit de segurança na branch atual ANTES do build/checkout (evita perder alterações locais)
DEPLOY_COMMIT_PREFIX="${DEPLOY_COMMIT_PREFIX:-chore: checkpoint antes do deploy GitHub Pages}"
SAFE_TS="$(date +'%Y-%m-%d %H:%M:%S %z')"
echo "🛡️  Verificando alterações locais para commit de segurança..."
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  git add -A
  if git commit -m "${DEPLOY_COMMIT_PREFIX} (${SAFE_TS})"; then
    echo "✅ Commit de segurança criado na branch «${CURRENT_BRANCH}»."
    if [[ "${DEPLOY_PUSH_SOURCE:-0}" == "1" ]]; then
      echo "⬆️  Enviando branch fonte para ${GHP_REMOTE}..."
      git push "${GHP_REMOTE}" "${CURRENT_BRANCH}" || {
        echo "⚠️  Push da branch fonte falhou (sem rede ou sem upstream). O commit local foi salvo."
      }
    else
      echo "ℹ️  Para enviar este commit ao remoto, rode: git push ${GHP_REMOTE} ${CURRENT_BRANCH}"
      echo "ℹ️  Ou use: DEPLOY_PUSH_SOURCE=1 yarn deploy"
    fi
  else
    echo "❌ Falha ao criar commit de segurança. Configure git (user.name e user.email) e tente de novo."
    exit 1
  fi
else
  echo "ℹ️  Working tree limpo — nenhum commit de segurança necessário."
fi

echo "📦 Fazendo build..."

if [[ ! -d "node_modules" ]]; then
  yarn install
fi

export VITE_BASE_PATH
yarn build

if [[ ! -d "dist" ]]; then
  echo "❌ Erro: a pasta 'dist' não foi encontrada."
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
cp -r dist/. "$TEMP_DIR/"

echo "🌿 Preparando branch ${GHP_BRANCH}..."
if git show-ref --verify --quiet "refs/heads/${GHP_BRANCH}"; then
  git checkout "${GHP_BRANCH}"
  git pull "${GHP_REMOTE}" "${GHP_BRANCH}" || true
else
  git checkout --orphan "${GHP_BRANCH}"
fi

echo "🧹 Limpando arquivos antigos..."
git rm -rf . --ignore-unmatch 2>/dev/null || true
# node_modules e dist ficam de fora para não reinstalar as dependências a cada deploy.
find . -maxdepth 1 \
  ! -name '.' ! -name '.git' ! -name 'node_modules' ! -name 'dist' \
  -exec rm -rf {} + 2>/dev/null || true

echo "📋 Copiando arquivos do build..."
cp -r "$TEMP_DIR"/. .
rm -rf "$TEMP_DIR"

touch .nojekyll

cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store
EOF

echo "💾 Commitando..."
git add -A
git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S')" || echo "Nenhuma mudança para commitar"

echo "⬆️  Push..."
git push "${GHP_REMOTE}" "${GHP_BRANCH}" --force

echo "🔄 Voltando para ${CURRENT_BRANCH}..."
git checkout "${CURRENT_BRANCH}"

if [[ -n "$OWNER_NAME" && -n "$REPO_NAME" ]]; then
  if [[ "$REPO_NAME" == "${OWNER_NAME}.github.io" ]]; then
    echo "🌐 Site: https://${OWNER_NAME}.github.io/"
  else
    echo "🌐 Site: https://${OWNER_NAME}.github.io/${REPO_NAME}/"
  fi
else
  echo "✅ Deploy concluído."
fi
