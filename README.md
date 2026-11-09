# Templo e historia familiar

Sitio del Barrio Villa del Mar · Estaca Primavera.

```sh
pnpm install
pnpm dev
pnpm build
```

Abre la URL local que imprime Astro (por defecto, http://localhost:4321). El servidor se ejecuta en segundo plano. Usa `pnpm astro dev status` para consultar su estado, `pnpm astro dev logs` para ver los registros y `pnpm astro dev stop` para detenerlo.

La compilación estática queda en `dist/`.

## Probar el formulario con Trello

1. En Cloudflare, abre **Workers y Pages → Crear aplicación → Crear Worker**. Crea un Worker llamado `solicitudes-templo-villa-del-mar`. En el editor de código del Worker, pega el contenido de [solicitudes-trello.js](cloudflare/solicitudes-trello.js).
2. Obtén una clave de API y un token de Trello con permisos de lectura y escritura desde la cuenta con acceso al tablero. En **Configuración → Variables y secretos** del Worker, agrega `TRELLO_API_KEY` y `TRELLO_TOKEN` como secretos. Agrega también `TEST_KEY`, un valor aleatorio que tú elijas para proteger la prueba. Guarda la configuración e implementa el Worker.
3. En el archivo local `.env` del proyecto, añade la URL HTTPS del Worker y el mismo valor de `TEST_KEY`. Las credenciales de Trello se guardan únicamente en Cloudflare.

   ```dotenv
   PUBLIC_TRELLO_TEST_URL=https://solicitudes-templo-villa-del-mar.TU-SUBDOMINIO.workers.dev
   PUBLIC_TRELLO_TEST_KEY=TU_CLAVE_ALEATORIA_DE_PRUEBA
   ```

4. Inicia Astro con `pnpm dev` o reinícialo si ya estaba abierto. Abre `http://localhost:4321`, ingresa un nombre y un número ficticios, elige un tema y pulsa **Enviar solicitud**. Busca la tarjeta con el prefijo `[PRUEBA]` en **Pendientes** y comprueba que incluya los datos ingresados.

La prueba está habilitada solo en desarrollo con ambas variables configuradas.

## Publicar en GitHub Pages

1. Confirma que el tablero de Trello esté en modo **Privado**. En Cloudflare, crea un widget gratuito de **Turnstile** en modo **Managed** y registra `cdss2021.github.io` como hostname.
2. En el Worker, sustituye el código por el de [solicitudes-trello.js](cloudflare/solicitudes-trello.js). En **Configuración → Variables y secretos**, conserva los secretos de Trello y agrega el secreto `TURNSTILE_SECRET_KEY` con la clave privada del widget. Agrega la variable de texto `SITE_ORIGIN` con el valor `https://cdss2021.github.io`. Usa solo el origen, sin la ruta del repositorio ni una barra final. Implementa el Worker.
3. Crea el repositorio público `CDSS2021/historia-familiar-villa-del-mar` y sube el proyecto a su rama principal. Revisa los archivos preparados para el commit. Los archivos `.env` y `.dev.vars` quedan fuera de Git.
4. En GitHub, abre **Settings → Secrets and variables → Actions → Variables** y agrega estas variables del repositorio:
   - `PUBLIC_SOLICITUDES_URL` con `https://solicitudes-templo-villa-del-mar.cdsanchezsaldana.workers.dev/solicitudes`.
   - `PUBLIC_TURNSTILE_SITE_KEY` con la clave pública del widget de Turnstile.
5. En **Settings → Pages → Build and deployment**, elige **GitHub Actions** como origen. Ejecuta **Actions → Publicar en GitHub Pages → Run workflow**. Si usaste el nombre indicado, la dirección será `https://cdss2021.github.io/historia-familiar-villa-del-mar/`.
6. Envía una solicitud con datos ficticios desde el sitio publicado. Comprueba que aparezca una tarjeta en **Pendientes** con el tema, el nombre y el WhatsApp. La página muestra la confirmación después de que Trello crea la tarjeta.

El flujo se ejecuta manualmente y comprueba la configuración del Worker antes de publicar. Para retirar la web, usa **Settings → Pages → ⋯ → Unpublish site**. Para detener de inmediato los nuevos envíos, quita `SITE_ORIGIN` del Worker y aplica el cambio.

## Actualizar la agenda

Edita [actividades.json](src/data/actividades.json). Cada actividad tiene una fecha en formato `AAAA-MM-DD`, un título, una hora y un lugar. Usa `"ejemplo": true` para marcar una actividad de muestra y `"ejemplo": false` para una actividad confirmada. La página ordena las actividades por fecha y muestra las del mes vigente en Lima.
