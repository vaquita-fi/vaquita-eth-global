#!/bin/bash
set -e

echo "🔧 Inicializando submodule core-ui desde la rama dev..."

# Inicializar el submodule si no está inicializado
if [ ! -d "src/core-ui/.git" ]; then
  echo "📦 Clonando submodule core-ui..."
  git submodule update --init --recursive src/core-ui
fi

# Cambiar al directorio del submodule y asegurarse de estar en la rama dev
cd src/core-ui

# Asegurarse de tener la última versión de la rama dev
echo "🔄 Actualizando a la rama dev..."
git fetch origin dev || true
git checkout dev || git checkout -b dev origin/dev
git pull origin dev || true

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "✅ Submodule core-ui está en la rama: $CURRENT_BRANCH"

cd ../..

echo "✅ Submodule core-ui inicializado y actualizado a la rama dev"

