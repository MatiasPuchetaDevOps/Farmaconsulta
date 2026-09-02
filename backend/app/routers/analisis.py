import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy import Engine

from app.core_logic import descriptivo
from app.database import engine
from app.deps import get_current_user
from app.models import Usuario
from app.repository import cargar_consultas_df
from app.schemas.analisis import (
    BinHistograma,
    ConteoCategoria,
    Cuartiles,
    DashboardOut,
    MatrizCorrelacion,
    MetricasGenerales,
    ProductoStockCritico,
    PuntoDispersion,
)

router = APIRouter(prefix="/api/analisis", tags=["analisis"], dependencies=[Depends(get_current_user)])

UMBRAL_STOCK = 10

# Mismo orden fijo que usa src/visualizacion.py: de lunes a domingo, no por frecuencia
ORDEN_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


def _get_engine() -> Engine:
    return engine


def _serie_a_conteos(serie) -> list[ConteoCategoria]:
    return [ConteoCategoria(categoria=str(idx), valor=float(val)) for idx, val in serie.items()]


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(_: Usuario = Depends(get_current_user), db_engine: Engine = Depends(_get_engine)):
    df = cargar_consultas_df(db_engine)

    # --- Métricas generales (Pantalla 2 de app.py) ---
    dispersion = descriptivo.dispersion_precio_lista(df)
    ahorro_por_metodo = descriptivo.ahorro_promedio_por_metodo_pago(df)
    stock_critico_df = descriptivo.productos_stock_critico(df, umbral=UMBRAL_STOCK)

    metricas = MetricasGenerales(
        total_consultas=df.shape[0],
        precio_lista_promedio=float(dispersion["media"]),
        ahorro_promedio=float(ahorro_por_metodo.mean()),
        consultas_stock_critico=stock_critico_df.shape[0],
    )

    # --- Gráfico 01: top 15 obras sociales ---
    top_obras_sociales = _serie_a_conteos(descriptivo.volumen_por_obra_social(df, top_n=15).head(15))

    # --- Gráfico 02: top 10 productos ---
    top_productos = _serie_a_conteos(df["producto_nombre"].value_counts().head(10))

    # --- Gráfico 03: consultas por día de la semana ---
    consultas_por_dia_serie = df["dia_semana_nombre"].value_counts().reindex(ORDEN_DIAS).fillna(0)
    consultas_por_dia = _serie_a_conteos(consultas_por_dia_serie)

    # --- Gráfico 04: distribución del precio de lista (histograma, 15 bins) ---
    conteos, bordes = np.histogram(df["precio_lista"], bins=15)
    distribucion_precio_lista = [
        BinHistograma(desde=round(float(bordes[i]), 2), hasta=round(float(bordes[i + 1]), 2), cantidad=int(conteos[i]))
        for i in range(len(conteos))
    ]

    # --- Gráfico 05a: stock promedio por categoría ---
    stock_promedio_categoria = _serie_a_conteos(descriptivo.stock_promedio_por_categoria(df).round(1))

    # --- Gráfico 05b: stock crítico ---
    stock_critico = [
        ProductoStockCritico(
            producto_nombre=fila["producto_nombre"],
            categoria=fila["categoria"],
            stock_disponible=int(fila["stock_disponible"]),
            fecha=fila["fecha"].date(),
        )
        for _, fila in stock_critico_df.iterrows()
    ]

    # --- Gráfico 06: dispersión precio_lista vs. precio_final ---
    dispersion_precio = [
        PuntoDispersion(
            precio_lista=int(fila["precio_lista"]),
            precio_final=int(fila["precio_final"]),
            banco_promocion=fila["banco_promocion"],
        )
        for _, fila in df[["precio_lista", "precio_final", "banco_promocion"]].iterrows()
    ]

    # --- Gráfico 07: descuento acumulado promedio por día ---
    descuento_acumulado = 1 - (df["precio_final"] / df["precio_lista"])
    tabla_descuento_dia = (
        df.assign(descuento_acumulado=descuento_acumulado)
        .groupby("dia_semana_nombre")["descuento_acumulado"]
        .mean()
        .reindex(ORDEN_DIAS)
        .fillna(0)
        .round(4)
    )
    descuento_por_dia = _serie_a_conteos(tabla_descuento_dia)

    # --- Gráfico 08: boxplot de precio_lista por categoría (cuartiles precalculados) ---
    boxplot_categoria = []
    for categoria, grupo in df.groupby("categoria")["precio_lista"]:
        boxplot_categoria.append(
            Cuartiles(
                categoria=categoria,
                minimo=float(grupo.min()),
                q1=float(grupo.quantile(0.25)),
                mediana=float(grupo.median()),
                q3=float(grupo.quantile(0.75)),
                maximo=float(grupo.max()),
            )
        )

    # --- Gráfico 09: matriz de correlación ---
    columnas_numericas = ["precio_lista", "descuento_OS", "descuento_banco", "stock_disponible", "precio_final", "dia_semana"]
    df_numerico = df[columnas_numericas].copy()
    df_numerico["requiere_receta"] = df["requiere_receta"].astype(int)
    # corr() da NaN cuando una columna no tiene varianza (todos los valores iguales);
    # se representa como 0 (sin correlación definida) para que el frontend no reciba null
    matriz = df_numerico.corr().fillna(0.0).round(2)
    correlacion = MatrizCorrelacion(
        columnas=list(matriz.columns),
        valores=[[float(v) for v in fila] for fila in matriz.to_numpy()],
    )

    # --- Proporción de consultas con/sin promoción bancaria ---
    proporcion = descriptivo.proporcion_consultas_con_promocion(df)
    proporcion_con_promocion = [
        ConteoCategoria(categoria="Con promoción bancaria", valor=float(proporcion["con_promo"])),
        ConteoCategoria(categoria="Sin promoción bancaria", valor=float(proporcion["sin_promo"])),
    ]

    return DashboardOut(
        metricas=metricas,
        top_obras_sociales=top_obras_sociales,
        top_productos=top_productos,
        consultas_por_dia=consultas_por_dia,
        distribucion_precio_lista=distribucion_precio_lista,
        stock_promedio_categoria=stock_promedio_categoria,
        stock_critico=stock_critico,
        dispersion_precio=dispersion_precio,
        descuento_por_dia=descuento_por_dia,
        boxplot_categoria=boxplot_categoria,
        correlacion=correlacion,
        proporcion_con_promocion=proporcion_con_promocion,
    )


@router.get("/dataset/preview")
def dataset_preview(limit: int = 50, db_engine: Engine = Depends(_get_engine)):
    df = cargar_consultas_df(db_engine)
    return df.head(limit).to_dict(orient="records")
