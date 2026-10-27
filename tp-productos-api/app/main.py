from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.productos.router import router as productos_router
from app.api.v1.categorias.router import router as categorias_router
from app.api.v1.usuarios.router import router as usuarios_router
from app.api.v1.pedidos.router import router as pedidos_router
from app.api.v1.pagos.router import router as pagos_router
from app.api.v1.compras.router import ordenes_router, proveedores_router
from app.api.v1.corralones.router import router as corralones_router
from app.api.v1.combos.router import router as combos_router

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
app.include_router(usuarios_router, prefix="/api/v1")
app.include_router(pedidos_router, prefix="/api/v1")
app.include_router(pagos_router, prefix="/api/v1")
app.include_router(proveedores_router, prefix="/api/v1")
app.include_router(ordenes_router, prefix="/api/v1")
app.include_router(combos_router, prefix="/api/v1")
app.include_router(corralones_router, prefix="/api/v1")
