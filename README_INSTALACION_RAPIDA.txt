╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     GESTOR DE INVENTARIO J4 PRO - INSTALACIÓN RÁPIDA         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📋 REQUISITOS PREVIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Node.js 18.x o superior
   Descargar desde: https://nodejs.org/

✅ Python 3.8+ (Opcional - solo para importación con IA)
   Descargar desde: https://www.python.org/downloads/


🚀 INSTALACIÓN AUTOMÁTICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WINDOWS:
   1. Haz doble clic en: instalador.bat
   2. Espera a que termine la instalación
   3. ¡Listo!

MACOS / LINUX:
   1. Abre una terminal
   2. Ejecuta: chmod +x instalador.sh
   3. Ejecuta: ./instalador.sh
   4. ¡Listo!


📝 INSTALACIÓN MANUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. INSTALAR BACKEND:
   cd backend-sqlite
   npm install
   npm run migrate
   npm run seed  (opcional - datos de prueba)

2. INSTALAR FRONTEND:
   cd frontend-desktop
   npm install

3. INICIAR APLICACIÓN:
   Terminal 1: cd backend-sqlite && npm start
   Terminal 2: cd frontend-desktop && npm run dev


📦 CREAR INSTALADOR EJECUTABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WINDOWS:
   Ejecutar: crear-instalador.bat

MACOS / LINUX:
   Ejecutar: chmod +x crear-instalador.sh && ./crear-instalador.sh

El instalador se creará en: frontend-desktop/dist-installer/


🔐 CREDENCIALES POR DEFECTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si ejecutaste los seeds:
   Email: admin@j4pro.com
   Password: admin123

⚠️  IMPORTANTE: Cambia estas credenciales en producción.


📚 DOCUMENTACIÓN COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para más detalles, consulta: GUIA_INSTALACION.md


❓ SOLUCIÓN DE PROBLEMAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Error "Node.js no encontrado"
  → Instala Node.js desde nodejs.org

• Error "npm no encontrado"
  → Reinstala Node.js y marca "Add to PATH"

• Error "Port 4000 already in use"
  → Cambia el puerto en backend-sqlite/.env

• Error "Database locked"
  → Cierra todas las instancias de la aplicación


✅ VERIFICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verifica que todo funcione:
   node --version    (debe mostrar v18.x o superior)
   npm --version     (debe mostrar 9.x o superior)
   cd backend-sqlite && npm start  (debe iniciar sin errores)


📞 SOPORTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Revisa los logs en: backend-sqlite/logs/
Consulta la guía completa: GUIA_INSTALACION.md


═══════════════════════════════════════════════════════════════
Versión: 1.0.0
Desarrollado por: J4 Pro
═══════════════════════════════════════════════════════════════











