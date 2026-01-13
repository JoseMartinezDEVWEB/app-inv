#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  INSTALADOR - GESTOR DE INVENTARIO"
echo "  J4 Pro Desktop Application"
echo "========================================"
echo ""

# Verificar si Node.js está instalado
echo -e "${BLUE}Verificando requisitos del sistema...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado.${NC}"
    echo ""
    echo "Por favor, instala Node.js desde: https://nodejs.org/"
    echo "Versión mínima requerida: Node.js 18.x o superior"
    echo ""
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js encontrado: ${NODE_VERSION}${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado.${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm encontrado: ${NPM_VERSION}${NC}"

# Verificar Python (opcional)
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python no está instalado. La función de importación de productos puede no funcionar.${NC}"
    echo "   Puedes instalarlo desde: https://www.python.org/downloads/"
    echo ""
else
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
    else
        PYTHON_VERSION=$(python --version)
    fi
    echo -e "${GREEN}✅ Python encontrado: ${PYTHON_VERSION}${NC}"
fi

echo ""
echo "========================================"
echo "  INSTALANDO BACKEND"
echo "========================================"
echo ""

# Navegar a backend-sqlite
if [ ! -d "backend-sqlite" ]; then
    echo -e "${RED}❌ Error: No se encontró la carpeta backend-sqlite${NC}"
    exit 1
fi

cd backend-sqlite

echo -e "${BLUE}Instalando dependencias del backend...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al instalar dependencias del backend${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencias del backend instaladas${NC}"

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado. Creando desde .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Archivo .env creado${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example no encontrado. Usando configuración por defecto.${NC}"
    fi
fi

# Crear directorios necesarios
mkdir -p database/backups
mkdir -p logs
mkdir -p temp

echo -e "${GREEN}✅ Directorios creados${NC}"

# Ejecutar migraciones
echo ""
echo -e "${BLUE}Ejecutando migraciones de base de datos...${NC}"
npm run migrate
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Advertencia: Error al ejecutar migraciones. Puede que la base de datos ya esté inicializada.${NC}"
fi

# Ejecutar seeds (opcional)
echo ""
read -p "¿Deseas ejecutar los datos de prueba? (S/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${BLUE}Ejecutando seeds...${NC}"
    npm run seed
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Advertencia: Error al ejecutar seeds.${NC}"
    fi
fi

cd ..

echo ""
echo "========================================"
echo "  INSTALANDO FRONTEND DESKTOP"
echo "========================================"
echo ""

# Navegar a frontend-desktop
if [ ! -d "frontend-desktop" ]; then
    echo -e "${RED}❌ Error: No se encontró la carpeta frontend-desktop${NC}"
    exit 1
fi

cd frontend-desktop

echo -e "${BLUE}Instalando dependencias del frontend...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al instalar dependencias del frontend${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"

cd ..

echo ""
echo "========================================"
echo "  INSTALACIÓN COMPLETADA"
echo "========================================"
echo ""
echo -e "${GREEN}✅ Todo está listo para usar la aplicación${NC}"
echo ""
echo "Para iniciar la aplicación en modo desarrollo:"
echo "  1. Backend: cd backend-sqlite && npm start"
echo "  2. Frontend: cd frontend-desktop && npm run dev"
echo ""
echo "Para crear el instalador ejecutable:"
echo "  cd frontend-desktop && npm run build:win  # Windows"
echo "  cd frontend-desktop && npm run build:mac  # macOS"
echo "  cd frontend-desktop && npm run build:linux # Linux"
echo ""
echo "========================================"
echo ""













