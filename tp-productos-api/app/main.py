from fastapi import FastAPI

from app.api.v1.productos.router import router as productos_router

app = FastAPI()


@app.get("/")
def hola():
    return {"message": "Bienvenido"}


app.include_router(productos_router, prefix="/api/v1")