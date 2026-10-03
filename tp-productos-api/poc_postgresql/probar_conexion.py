from sqlalchemy import text

from poc_postgresql.database import engine


def main():
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version()")).scalar_one()
    print("Conexion OK")
    print(version)


if __name__ == "__main__":
    main()
