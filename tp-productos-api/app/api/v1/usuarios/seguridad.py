import hashlib
import hmac
import secrets

ITERACIONES = 600_000


def hashear_password(password: str) -> str:
    sal = secrets.token_hex(16)
    hash_hex = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), sal.encode(), ITERACIONES
    ).hex()
    return f"pbkdf2_sha256${ITERACIONES}${sal}${hash_hex}"


def verificar_password(password: str, guardado: str) -> bool:
    _, iteraciones, sal, hash_hex = guardado.split("$")
    calculado = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), sal.encode(), int(iteraciones)
    ).hex()
    return hmac.compare_digest(calculado, hash_hex)
