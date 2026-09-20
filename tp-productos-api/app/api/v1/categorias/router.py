from fastapi import APIRouter

from app.core.db import categorias
from app.api.v1.productos.schemas import CategoriaOut

router = APIRouter(prefix="/categorias", tags=["Categorias"])


@router.get(
    "",
    response_model=list[CategoriaOut],
    summary="Listar categorias",
    description="Devuelve la lista completa de categorias disponibles.",
)
def listar_categorias():
    return categorias