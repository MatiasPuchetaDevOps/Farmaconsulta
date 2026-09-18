export interface Producto {
  id: number
  producto_nombre: string
  categoria: string
  precio_lista: number
  stock_disponible: number
  droga_generica: string | null
  requiere_receta: boolean
  codigo_barras: string | null
  activo: boolean
}

export interface ProductoIn {
  producto_nombre: string
  categoria: string
  precio_lista: number
  stock_disponible: number
  droga_generica: string | null
  requiere_receta: boolean
  codigo_barras: string | null
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
  es_admin: boolean
}

export interface UsuarioCrear {
  username: string
  password: string
  nombre_completo: string | null
  es_admin?: boolean
}

export interface UsuarioEditar {
  nombre_completo?: string | null
  activo?: boolean
  es_admin?: boolean
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

export interface BancoPromocion {
  id: number
  banco: string
  descuento_banco: number
  actualizado_en: string
}

export interface PedidoItemIn {
  producto_id: number
  cantidad: number
  receta_id?: number | null
}

export interface PedidoIn {
  cliente_nombre: string
  cliente_tel: string
  obra_social: string
  plan_afiliado?: string
  metodo_pago: string
  items: PedidoItemIn[]
}

export interface PedidoItem {
  producto_id: number
  producto_nombre: string
  cantidad: number
  precio_lista: number
  descuento_os: number
  descuento_banco: number
  precio_final_unitario: number
  subtotal: number
  receta_id: number | null
}

export interface Pedido {
  id: number
  cliente_nombre: string
  cliente_tel: string | null
  obra_social: string
  plan_afiliado: string | null
  metodo_pago: string
  estado: 'confirmado' | 'cancelado'
  total: number
  caja_sesion_id: number | null
  comprobante_numero: string | null
  cae: string | null
  cae_vencimiento: string | null
  cae_estado: 'pendiente' | 'aprobado' | 'rechazado'
  cae_motivo_rechazo: string | null
  cae_intentos: number
  validacion_os_resultado: 'aprobado' | 'rechazado' | 'vencido' | null
  validacion_os_motivo: string | null
  creado_en: string
  cancelado_en: string | null
  items: PedidoItem[]
}

export interface Lote {
  id: number
  producto_id: number
  producto_nombre: string
  numero_lote: string
  vencimiento: string
  cantidad: number
  activo: boolean
  dias_para_vencer: number
  creado_en: string
}

export interface LoteIn {
  producto_id: number
  numero_lote: string
  vencimiento: string
  cantidad: number
  activo: boolean
}

export interface LotesAlerta {
  vencidos: Lote[]
  por_vencer: Lote[]
}

export interface CajaMovimiento {
  id: number
  tipo: 'ingreso' | 'egreso'
  origen: 'manual' | 'venta' | 'venta_cancelada'
  monto: number
  concepto: string
  pedido_id: number | null
  usuario_id: number
  usuario_username: string
  creado_en: string
}

export interface CajaAbrirIn {
  monto_inicial: number
  observaciones?: string | null
}

export interface CajaMovimientoIn {
  tipo: 'ingreso' | 'egreso'
  monto: number
  concepto: string
}

export interface CajaCerrarIn {
  monto_declarado: number
  observaciones?: string | null
}

export interface CajaSesion {
  id: number
  estado: 'abierta' | 'cerrada'
  monto_inicial: number
  monto_declarado: number | null
  monto_calculado: number | null
  diferencia: number | null
  abierta_por: string
  cerrada_por: string | null
  observaciones_apertura: string | null
  observaciones_cierre: string | null
  abierta_en: string
  cerrada_en: string | null
  total_ingresos: number
  total_egresos: number
  saldo_actual: number
  movimientos: CajaMovimiento[]
}

export interface Receta {
  id: number
  cliente_ref_id: number
  cliente_nombre: string
  cliente_tel: string | null
  producto_id: number
  producto_nombre: string
  medico_nombre: string | null
  medico_matricula: string | null
  fecha_emision: string
  estado: 'pendiente' | 'validada' | 'rechazada'
  observaciones: string | null
  validada_por_id: number | null
  validada_en: string | null
  creado_por_id: number
  pedido_item_id: number | null
  creado_en: string
}

export interface RecetaIn {
  cliente_nombre: string
  cliente_tel: string
  producto_id: number
  medico_nombre: string | null
  medico_matricula: string | null
  fecha_emision: string
}

export interface RecetaValidarIn {
  estado: 'validada' | 'rechazada'
  observaciones?: string | null
}

export interface ObraSocialRegla {
  id: number
  obra_social: string
  plan_afiliado: string | null
  resultado: 'aprobado' | 'rechazado' | 'vencido'
  motivo: string | null
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface ObraSocialReglaIn {
  obra_social: string
  plan_afiliado: string | null
  resultado: 'aprobado' | 'rechazado' | 'vencido'
  motivo: string | null
  activo: boolean
}

export interface ValidacionOSResultado {
  resultado: 'aprobado' | 'rechazado' | 'vencido'
  motivo: string | null
}

export interface PropuestaPrecio {
  producto_id: number
  producto_nombre: string
  precio_anterior: number
  variacion_pct: number
  precio_nuevo: number
}

export interface AjustePrecioPreview {
  id: number
  filtro_categoria: string | null
  variacion_pct: number
  propuesta: PropuestaPrecio[]
  aplicada: boolean
  creado_en: string
}

export interface ItemAjustado {
  producto_id: number
  producto_nombre: string
  precio_anterior: number
  precio_nuevo: number
  omitido: boolean
  motivo_omision: string | null
}

export interface AjustePrecioResultado {
  preview_id: number
  items: ItemAjustado[]
}

export interface AjustePrecioHistorial {
  id: number
  ejecutada_por_id: number
  cantidad_productos: number
  variacion_pct: number
  aplicada_en: string
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

export interface ConsultaPublicaIn {
  obra_social: string
  plan_afiliado?: string | null
  producto_id: number
  metodo_pago: string
  fecha: string
}

export interface MetricasGenerales {
  total_consultas: number
  precio_lista_promedio: number
  ahorro_promedio: number
  consultas_stock_critico: number
  consultas_mostrador: number
  consultas_publicas: number
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
