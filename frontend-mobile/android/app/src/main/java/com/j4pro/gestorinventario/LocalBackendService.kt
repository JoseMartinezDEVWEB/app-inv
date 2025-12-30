package com.j4pro.gestorinventario

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.*

import io.ktor.server.request.*

class LocalBackendService : Service() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private var server: ApplicationEngine? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, buildNotification())
    }

    scope.launch {
      startServer()
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // If killed by the system, try to recreate service when resources are available
    return START_STICKY
  }

  override fun onDestroy() {
    scope.launch {
      stopServer()
    }
    scope.cancel()
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private suspend fun startServer() {
    if (server != null) return

    server = embeddedServer(CIO, host = "127.0.0.1", port = PORT) {
      install(ContentNegotiation) { json() }
      routing {
        get("/api/health") {
          call.respond(mapOf("ok" to true, "service" to "local-backend", "port" to PORT))
        }
        get("/api/salud") {
          call.respond(mapOf("ok" to true, "servicio" to "backend-local", "puerto" to PORT))
        }
        
        // Mock Login for Offline Mode
        post("/api/auth/login") {
           val response = mapOf(
            "exito" to true,
            "mensaje" to "Login local exitoso",
            "datos" to mapOf(
              "usuario" to mapOf(
                "nombre" to "Usuario Local",
                "email" to "local@j4pro.com",
                "rol" to "administrador",
                "_id" to "local-user-id"
              ),
              "accessToken" to "local-fake-token",
              "refreshToken" to "local-fake-refresh-token"
            )
          )
          call.respond(response)
        }
      }
    }.start(wait = false)
  }

  private suspend fun stopServer() {
    server?.stop(gracePeriodMillis = 200, timeoutMillis = 500)
    server = null
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Backend local",
        NotificationManager.IMPORTANCE_MIN
      ).apply {
        description = "Servidor local en segundo plano para la app"
        setShowBadge(false)
      }
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Backend local activo")
      .setContentText("Servidor escuchando en 127.0.0.1:$PORT")
      .setSmallIcon(resources.getIdentifier("ic_launcher", "mipmap", packageName))
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "local_backend_channel"
    private const val NOTIFICATION_ID = 4101
    private const val PORT = 4101
  }
}
