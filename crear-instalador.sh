#!/bin/bash

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  CREAR INSTALADOR EJECUTABLE"
echo "  Gestor de Inventario J4 Pro"
echo "========================================"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "frontend-desktop/package.json" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde la carpeta raíz del proyecto${NC}"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Verificando instalación...${NC}"
echo ""

# Verificar dependencias del backend
if [ ! -d "backend-sqlite/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencias del backend no instaladas. Instalando...${NC}"
    cd backend-sqlite
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error al instalar dependencias del backend${NC}"
        exit 1
    fi
    cd ..
fi

# Verificar dependencias del frontend
if [ ! -d "frontend-desktop/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencias del frontend no instaladas. Instalando...${NC}"
    cd frontend-desktop
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error al instalar dependencias del frontend${NC}"
        exit 1
    fi
    cd ..
fi

echo ""
echo "========================================"
echo "  EMPAQUETANDO APLICACIÓN"
echo "========================================"
echo ""

cd frontend-desktop

echo -e "${BLUE}📦 Empaquetando backend...${NC}"
npm run prebuild
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al empaquetar backend${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Compilando frontend...${NC}"
npm run build:react
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al compilar frontend${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Creando instalador...${NC}"
echo "   Esto puede tardar varios minutos..."
echo ""

# Detectar sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    npm run build:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    npm run build:linux
else
    npm run build:installer
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al crear instalador${NC}"
    exit 1
fi

cd ..

echo ""
echo "========================================"
echo "  INSTALADOR CREADO EXITOSAMENTE"
echo "========================================"
echo ""
echo -e "${GREEN}✅ El instalador se encuentra en:${NC}"
echo "   frontend-desktop/dist-installer/"
echo ""
echo -e "${BLUE}📋 Archivos generados:${NC}"
ls -lh frontend-desktop/dist-installer/
echo ""
echo -e "${GREEN}🚀 Puedes distribuir el archivo a otros usuarios${NC}"
echo ""











