from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.productos.router import router as productos_router
from app.api.v1.categorias.router import router as categorias_router

app = FastAPI(
    title="ProMadera - API de Productos",
    description="API REST para la gestion de productos y categorias de ProMadera.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def hola():
    return {"message": "Bienvenido"}


app.include_router(productos_router, prefix="/api/v1")
app.include_router(categorias_router, prefix="/api/v1")