from datetime import date

from pydantic import BaseModel


class MetricasGenerales(BaseModel):
    total_consultas: int
    precio_lista_promedio: float
    ahorro_promedio: float
    consultas_stock_critico: int


class ConteoCategoria(BaseModel):
    categoria: str
    valor: float


class BinHistograma(BaseModel):
    desde: float
    hasta: float
    cantidad: int


class ProductoStockCritico(BaseModel):
    producto_nombre: str
    categoria: str
    stock_disponible: int
    fecha: date


class PuntoDispersion(BaseModel):
    precio_lista: int
    precio_final: int
    banco_promocion: str


class Cuartiles(BaseModel):
    categoria: str
    minimo: float
    q1: float
    mediana: float
    q3: float
    maximo: float


class MatrizCorrelacion(BaseModel):
    columnas: list[str]
    valores: list[list[float]]


class DashboardOut(BaseModel):
    metricas: MetricasGenerales
    top_obras_sociales: list[ConteoCategoria]
    top_productos: list[ConteoCategoria]
    consultas_por_dia: list[ConteoCategoria]
    distribucion_precio_lista: list[BinHistograma]
    stock_promedio_categoria: list[ConteoCategoria]
    stock_critico: list[ProductoStockCritico]
    dispersion_precio: list[PuntoDispersion]
    descuento_por_dia: list[ConteoCategoria]
    boxplot_categoria: list[Cuartiles]
    correlacion: MatrizCorrelacion
    proporcion_con_promocion: list[ConteoCategoria]
