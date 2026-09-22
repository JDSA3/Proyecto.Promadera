from fastapi import APIRouter

from app.api.v1.productos import repository
from app.api.v1.productos.schemas import CategoriaOut

router = APIRouter(prefix="/categorias", tags=["Categorias"])


@router.get(
    "",
    response_model=list[CategoriaOut],
    summary="Listar categorias",
    description="Devuelve la lista completa de categorias disponibles.",
)
def listar_categorias():
    return repository.list_categorias()