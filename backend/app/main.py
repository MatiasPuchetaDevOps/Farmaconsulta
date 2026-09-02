from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, analisis, auth, calculadora, catalogos, stock

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
app.include_router(calculadora.router)
app.include_router(stock.router)
app.include_router(analisis.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
