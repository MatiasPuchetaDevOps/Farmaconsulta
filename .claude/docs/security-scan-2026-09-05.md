# Security Scan — FarmaConsulta — 2026-09-05

Stack detectado: FastAPI + SQLAlchemy 2.x + PostgreSQL (backend), React 19 + Vite + Mantine (frontend). No es ecosistema Meteoryd — reglas extra Meteoryd-aware no aplican.

**Update 2026-09-05 (misma fecha, segunda pasada):** se confirmó que el repo es **público** en GitHub (`MatiasPuchetaDevOps/Farmaconsulta`) y que `docker-compose.yml` viene commiteado con `POSTGRES_PASSWORD`/`JWT_SECRET` hardcodeados desde el primer commit (`8e78bc4`). Sube de MEDIO a considerarse explotable si ese compose se despliega tal cual en un servidor expuesto: contraseña de Postgres = usuario y JWT secret conocido públicamente permiten conexión directa a la DB y forjar tokens válidos, bypasseando el login. **Ya se aplicó el fix**: `docker-compose.yml` ahora lee `POSTGRES_PASSWORD`/`JWT_SECRET`/etc. desde variables de entorno (con `${VAR:?...}` que aborta si faltan) y se agregó `.env.example` en la raíz como plantilla; el `.env` real queda en `.gitignore`. No hace falta reescribir el historial de git: los valores commiteados eran placeholders de dev, nunca la credencial real de producción (esa está solo en `backend/.env`, nunca commiteada — ver hallazgo #1).

## Resumen
- 1 CRÍTICO, 1 ALTO, 2 MEDIOS, 2 BAJOS
- Familias con hallazgos: F1 (secrets), F6 (IDOR/broken access control), F9 (crypto/token handling)
- Familias escaneadas sin hallazgos: F2 (command injection), F3 (SQL injection), F4 (XSS), F5 (SSRF), F7 (deserialización insegura), F8 (path traversal)

---

## CRÍTICO

### [#1] Credencial real de base de datos en `backend/.env` (no commiteado, pero en texto plano en disco)
- Archivo: `backend/.env:1`
- Confianza: ALTA
- OWASP: A07:2021 — Identification and Authentication Failures / A05:2021 — Security Misconfiguration
- Evidencia:
  ```
  DATABASE_URL=postgresql+psycopg://postgres:f4arm4c0nsult4@andromeda.meteoryd.com:15030/webs?sslmode=disable
  ```
- Detalle: apunta a un host remoto real (`andromeda.meteoryd.com`), no a localhost/docker-compose. Verificado que **nunca fue commiteado** (`.env` está en `.gitignore` y no aparece en `git log --all`), así que no está expuesto en el repo — pero cualquiera con acceso a esta máquina/carpeta lo lee en texto plano, y `sslmode=disable` envía la sesión sin cifrar.
- Fix: rotar la credencial si sigue vigente, sacar `sslmode=disable` (usar `require` o superior) y considerar un gestor de secretos en vez de `.env` plano para credenciales de servidores compartidos.

---

## ALTO

### [#2] Sin control de roles: cualquier usuario autenticado administra otros usuarios
- Archivo: `backend/app/routers/usuarios.py:10` + `backend/app/models.py:10-18`
- Confianza: ALTA
- OWASP: A01:2021 — Broken Access Control
- Evidencia:
  ```python
  router = APIRouter(prefix="/api/usuarios", tags=["usuarios"], dependencies=[Depends(get_current_user)])

  @router.post("", response_model=UsuarioAdminOut)
  def crear_usuario(payload: UsuarioCrear, db: Session = Depends(get_db)):
  ```
  El modelo `Usuario` no tiene campo de rol (`id`, `username`, `password_hash`, `nombre_completo`, `activo`) — `get_current_user` solo exige "estar logueado", no "ser admin".
- Detalle: cualquier cuenta de "personal de farmacia" puede crear usuarios nuevos, cambiarle la contraseña a otro usuario, o desactivar a cualquier otro (solo se bloquea autodesactivarse o dejar 0 activos). Si se compromete una sola cuenta de bajo privilegio, el atacante puede tomar control total de la gestión de usuarios.
- Fix: agregar un campo `rol`/`es_admin` al modelo `Usuario` y una dependencia `get_current_admin` que lo verifique, aplicada a los endpoints de `usuarios.py` (y evaluar si también correspondería en `admin.py`/`productos.py`/`clientes.py`).

---

## MEDIO

### [#3] Endpoints públicos de stock/catálogo/calculadora exponen datos de negocio sin autenticación
- Archivos: `backend/app/routers/stock.py:9`, `backend/app/routers/catalogos.py:10`, `backend/app/routers/calculadora.py:9`
- Confianza: MEDIA (probable falso positivo — parece intencional para la pantalla pública `ConsultaPrecio.tsx`)
- OWASP: A01:2021 — Broken Access Control (si no es intencional) / A04:2021 — Insecure Design
- Evidencia:
  ```python
  router = APIRouter(prefix="/api/stock", tags=["stock"])   # sin dependencies=[Depends(get_current_user)]
  ```
- Detalle: a diferencia de `admin.py`, `analisis.py`, `productos.py`, `clientes.py`, `usuarios.py` (todos con `dependencies=[Depends(get_current_user)]` a nivel router), estos tres routers no exigen token. Esto permite que cualquiera sin login consulte stock exacto y precios finales de cualquier producto. Coincide con el diseño de `ConsultaPrecio.tsx` como pantalla pública, así que es probablemente intencional — lo marco para que el TL confirme que exponer niveles de stock exacto sin autenticación es aceptable para el negocio.
- Fix (si no es intencional): agregar `dependencies=[Depends(get_current_user)]` a esos tres routers, o limitar la respuesta pública a un booleano de disponibilidad en vez del número exacto de stock.

### [#4] JWT sin mecanismo de revocación y expiración larga (10 horas)
- Archivo: `docker-compose.yml:26`, `backend/app/security.py:19-22`
- Confianza: MEDIA
- OWASP: A07:2021 — Identification and Authentication Failures
- Evidencia:
  ```
  JWT_EXPIRE_MINUTES: 600
  ```
  ```python
  def create_access_token(subject: str) -> str:
      expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
  ```
- Detalle: un token robado (ej. vía malware en la máquina del usuario, dado que se guarda en `localStorage`) sigue siendo válido hasta 10 horas y no hay forma de invalidarlo antes de que expire (no hay blacklist/versión de token), ni hay logout server-side real — `logout()` en el frontend solo borra el token local.
- Fix: evaluar bajar el tiempo de expiración, agregar refresh tokens de corta vida, o una tabla de tokens revocados si el caso de uso lo justifica.

---

## BAJO

### [#5] Token JWT guardado en `localStorage`
- Archivo: `frontend/src/context/AuthContext.tsx:38`, `frontend/src/api/client.ts:11`
- Confianza: MEDIA
- OWASP: A03:2021 — Injection (vector de exfiltración si existiera XSS)
- Detalle: no se encontró ningún sink de XSS en el frontend (`dangerouslySetInnerHTML`, `innerHTML`, `document.write` — cero resultados), así que hoy no hay vector de explotación conocido. Igual, `localStorage` es accesible por cualquier script que corra en la página, a diferencia de una cookie `httpOnly`. Queda como buena práctica a considerar, no como vulnerabilidad activa.
- Fix (opcional): mover el token a una cookie `httpOnly` + `SameSite=Strict` si en algún momento se agrega contenido de terceros o markdown/HTML dinámico al frontend.

### [#6] `sslmode=disable` en el patrón de connection string / falta de TLS explícito en Postgres
- Archivo: `backend/.env:1`
- Confianza: MEDIA
- OWASP: A02:2021 — Cryptographic Failures
- Detalle: mismo hallazgo que #1 en cuanto a falta de cifrado en tránsito hacia la base remota. Se lista aparte porque aplicaría igual aunque se rote la credencial.
- Fix: usar `sslmode=require` (o `verify-full` si el proveedor entrega certificado válido) contra bases remotas.

---

## Notas adicionales (fuera de las 9 familias, FYI)
- No se encontró rate-limiting ni bloqueo por intentos fallidos en `POST /api/auth/login` (`backend/app/routers/auth.py`) — no es de las 9 familias evaluadas pero es una superficie de fuerza bruta típica en apps de login simple.
- `backend/farmaconsulta.db` (SQLite) está en `.gitignore` y no fue commiteado — confirmado vía `git log --all`.

## Familias sin hallazgos (revisadas explícitamente)
- **F2 — Command injection**: sin `exec`/`os.system`/`subprocess` con input externo en `backend/app`.
- **F3 — SQL injection**: todas las queries son SQLAlchemy ORM o `pd.read_sql` con strings estáticos, sin concatenación de input de usuario. No se usa `$queryRawUnsafe` (no es Prisma) ni `cursor.execute` con f-strings.
- **F4 — XSS**: cero `dangerouslySetInnerHTML`, `innerHTML`, `document.write` en `frontend/src`.
- **F5 — SSRF**: no hay `fetch`/`axios`/`requests` server-side construidos con URL de input de usuario.
- **F7 — Deserialización insegura**: sin `pickle`, `yaml.load` inseguro, `unserialize` en el código propio.
- **F8 — Path traversal**: sin `fs`/`open()` construidos con input de request; `migrar_datos.py` usa rutas fijas relativas al repo, script offline no expuesto por HTTP.
