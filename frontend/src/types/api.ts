export interface Producto {
  id: number
  producto_nombre: string
  categoria: string
  precio_lista: number
  stock_disponible: number
  droga_generica: string | null
  requiere_receta: boolean
  activo: boolean
}

export interface ProductoIn {
  producto_nombre: string
  categoria: string
  precio_lista: number
  stock_disponible: number
  droga_generica: string | null
  requiere_receta: boolean
  activo: boolean
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  activo: boolean
}

export interface ClienteIn {
  nombre: string
  telefono: string | null
  activo: boolean
}

export interface UsuarioAdmin {
  id: number
  username: string
  nombre_completo: string | null
  activo: boolean
}

export interface UsuarioCrear {
  username: string
  password: string
  nombre_completo: string | null
}

export interface UsuarioEditar {
  nombre_completo?: string | null
  activo?: boolean
  password?: string | null
}

export interface Desglose {
  producto_nombre: string
  precio_lista: number
  obra_social: string
  descuento_os: number
  metodo_pago: string
  descuento_banco: number
  precio_tras_os: number
  precio_final: number
  ahorro_total: number
  descuento_total_pct: number
}

export interface MedioPago {
  metodo_pago: string
  descuento_banco: number
  precio_final: number
  ahorro: number
}

export interface Alternativa {
  producto_nombre: string
  stock_disponible: number
}

export interface StockInfo {
  producto_nombre: string
  stock_actual: number
  categoria: string
  umbral: number
  alerta: boolean
  alternativas: Alternativa[]
}

export interface Plan {
  id: number
  obra_social: string
  descuento_os: number
  actualizado_en: string
}

export interface ConsultaIn {
  cliente_nombre: string
  cliente_tel: string
  obra_social: string
  plan_afiliado: string
  producto_id: number
  metodo_pago: string
  fecha: string
}

export interface MetricasGenerales {
  total_consultas: number
  precio_lista_promedio: number
  ahorro_promedio: number
  consultas_stock_critico: number
}

export interface ConteoCategoria {
  categoria: string
  valor: number
}

export interface BinHistograma {
  desde: number
  hasta: number
  cantidad: number
}

export interface ProductoStockCritico {
  producto_nombre: string
  categoria: string
  stock_disponible: number
  fecha: string
}

export interface PuntoDispersion {
  precio_lista: number
  precio_final: number
  banco_promocion: string
}

export interface Cuartiles {
  categoria: string
  minimo: number
  q1: number
  mediana: number
  q3: number
  maximo: number
}

export interface MatrizCorrelacion {
  columnas: string[]
  valores: number[][]
}

export interface Dashboard {
  metricas: MetricasGenerales
  top_obras_sociales: ConteoCategoria[]
  top_productos: ConteoCategoria[]
  consultas_por_dia: ConteoCategoria[]
  distribucion_precio_lista: BinHistograma[]
  stock_promedio_categoria: ConteoCategoria[]
  stock_critico: ProductoStockCritico[]
  dispersion_precio: PuntoDispersion[]
  descuento_por_dia: ConteoCategoria[]
  boxplot_categoria: Cuartiles[]
  correlacion: MatrizCorrelacion
  proporcion_con_promocion: ConteoCategoria[]
}
