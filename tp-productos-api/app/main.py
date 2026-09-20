from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.productos.router import router as productos_router

app = FastAPI(title="ProMadera - API de Productos")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def hola():
    return {"message": "Bienvenido"}


app.include_router(productos_router, prefix="/api/v1")