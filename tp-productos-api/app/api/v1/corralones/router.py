from fastapi import APIRouter, HTTPException, Query, status

from . import repository
from .schemas import ResumenCorralon

router = APIRouter(prefix="/corralones", tags=["Corralones"])


@router.get(
    "/{corralon_id}/resumen",
    response_model=ResumenCorralon,
    summary="Resumen para el panel de inicio del corralón",
    description=(
        "Ventas del mes (suma de su parte en pedidos pagados de este mes, sin cancelados ni devueltos), "
        "pedidos pendientes (pagados que todavía no entregó: pendiente, confirmado o enviado), cuántos tiene "
        "en cada estado, los productos más vendidos del mes y los productos con stock menor o igual a stock_minimo."
    ),
    responses={404: {"description": "No existe un corralón con ese id"}},
)
def resumen_corralon(
    corralon_id: int,
    stock_minimo: int = Query(default=10, ge=0, description="Hasta cuánto stock se considera bajo"),
    mas_vendidos: int = Query(default=5, ge=1, le=50, description="Cuántos productos más vendidos mostrar"),
):
    datos = repository.resumen(corralon_id, stock_minimo, mas_vendidos)

    if datos is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corralón {corralon_id} no encontrado",
        )
    return datos
