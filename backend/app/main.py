from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    admin,
    ajuste_precios,
    analisis,
    auth,
    caja,
    calculadora,
    catalogos,
    clientes,
    consultas_publicas,
    lotes,
    obras_sociales_reglas,
    pedidos,
    productos,
    recetas,
    stock,
    usuarios,
)

app = FastAPI(title="FarmaConsulta API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(catalogos.router)
app.include_router(consultas_publicas.router)
app.include_router(calculadora.router)
app.include_router(stock.router)
app.include_router(analisis.router)
app.include_router(admin.router)
app.include_router(productos.router)
app.include_router(clientes.router)
app.include_router(usuarios.router)
app.include_router(pedidos.router)
app.include_router(caja.router)
app.include_router(lotes.router)
app.include_router(obras_sociales_reglas.router)
app.include_router(recetas.router)
app.include_router(ajuste_precios.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/")
def raiz():
    # EasyPanel (y la mayoría de los PaaS) usan GET / como health check por
    # defecto. Sin esta ruta, FastAPI devuelve 404 acá y el proveedor
    # reinicia el contenedor en loop pensando que está "unhealthy".
    return {"status": "ok"}
