from fastapi import APIRouter, HTTPException, Response, status

from . import repository
from .schemas import ComboCreate, ComboResponse

router = APIRouter(prefix="/combos", tags=["Comunidad de diseño"])


@router.get(
    "",
    response_model=list[ComboResponse],
    summary="Listar combos",
    description=(
        "Devuelve los combos de la comunidad: primero los de ProMadera (preseleccionados) y después los de "
        "los carpinteros, del más nuevo al más viejo. Cada combo trae sus productos, el total con los precios "
        "de hoy y si hay stock para armarlo. Filtros: autor_id y oficial (true = solo los de ProMadera)."
    ),
)
def listar_combos(autor_id: int | None = None, oficial: bool | None = None):
    return repository.list_combos(autor_id, oficial)


@router.get(
    "/{combo_id}",
    response_model=ComboResponse,
    summary="Obtener un combo por ID",
    responses={404: {"description": "Combo no encontrado"}},
)
def obtener_combo(combo_id: int):
    combo = repository.get_by_id(combo_id)

    if combo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Combo {combo_id} no encontrado")
    return combo


@router.post(
    "",
    response_model=ComboResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Armar un combo",
    description=(
        "Un carpintero arma un combo con productos del catálogo, un título, una descripción y una foto de "
        "portada opcional (URL o imagen en base64). Si repite un producto, se suman las cantidades."
    ),
    responses={400: {"description": "El autor no es un carpintero o algún producto no existe"}},
)
def crear_combo(datos: ComboCreate):
    try:
        return repository.create(datos)
    except repository.DatosInvalidos as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.delete(
    "/{combo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borrar un combo propio",
    description="El autor borra su combo (baja lógica). usuario_id tiene que ser el autor.",
    responses={
        403: {"description": "El usuario no es el autor"},
        404: {"description": "Combo no encontrado"},
    },
)
def borrar_combo(combo_id: int, usuario_id: int):
    try:
        repository.delete(combo_id, usuario_id)
    except repository.NoEncontrado as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except repository.SinPermiso as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
