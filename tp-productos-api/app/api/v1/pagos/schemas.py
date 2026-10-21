from pydantic import BaseModel, Field


class PagoRequest(BaseModel):
    pedido_id: int = Field(ge=1)


class PreferenciaResponse(BaseModel):
    pedido_id: int
    preference_id: str
    init_point: str
    sandbox_init_point: str | None = None
