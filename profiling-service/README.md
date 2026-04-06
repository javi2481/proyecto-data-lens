# DataLens Profiling Service

Servicio de análisis de datos usando ydata-profiling para Railway.

## Deploy en Railway

1. Ve a [Railway](https://railway.app) e inicia sesión
2. Click **New Project** → **Deploy from GitHub repo**
3. Selecciona el repo `proyecto-data-lens`
4. En la configuración del servicio:
   - **Root Directory**: `profiling-service`
   - Railway detectará el Dockerfile automáticamente
5. Click **Deploy**
6. Una vez deployado, ve a **Settings** → **Networking** → **Generate Domain**
7. Copia la URL generada (ej: `https://proyecto-data-lens-production-xxxx.up.railway.app`)

## Conectar con DataLens

En el backend de DataLens, agrega la variable de entorno:

```
PROFILING_SERVICE_URL=https://tu-url-de-railway.up.railway.app
```

## Endpoints

- `GET /` - Health check
- `POST /profile` - Analiza un archivo y devuelve JSON con estadísticas
- `POST /compare` - Compara dos archivos

## Test local

```bash
cd profiling-service
docker build -t profiling .
docker run -p 8000:8000 profiling
```
