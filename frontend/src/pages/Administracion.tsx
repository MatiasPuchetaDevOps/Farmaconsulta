import { Grid, NavLink, Select, Stack, Text } from '@mantine/core'
import {
  IconAdjustments,
  IconBuildingBank,
  IconCalendarTime,
  IconCash,
  IconClipboardPlus,
  IconFileText,
  IconStethoscope,
  IconUsers,
  IconUserShield,
  IconVaccine,
} from '@tabler/icons-react'
import { type ReactNode, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AjustePreciosAdmin } from './admin/AjustePreciosAdmin'
import { BancosPromocionesAdmin } from './admin/BancosPromocionesAdmin'
import { CajaAdmin } from './admin/CajaAdmin'
import { ClientesAdmin } from './admin/ClientesAdmin'
import { LotesAdmin } from './admin/LotesAdmin'
import { ObrasSocialesAdmin } from './admin/ObrasSocialesAdmin'
import { ProductosAdmin } from './admin/ProductosAdmin'
import { RecetasAdmin } from './admin/RecetasAdmin'
import { ReglasObraSocialAdmin } from './admin/ReglasObraSocialAdmin'
import { RegistrarConsulta } from './admin/RegistrarConsulta'
import { UsuariosAdmin } from './admin/UsuariosAdmin'

type Seccion =
  | 'consulta'
  | 'productos'
  | 'obras-sociales'
  | 'reglas-obra-social'
  | 'bancos-promociones'
  | 'clientes'
  | 'usuarios'
  | 'lotes'
  | 'caja'
  | 'recetas'
  | 'ajuste-precios'

interface ItemNav {
  valor: Seccion
  etiqueta: string
  icono: ReactNode
  soloAdmin?: boolean
}

interface GrupoNav {
  titulo: string
  items: ItemNav[]
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Mostrador',
    items: [
      { valor: 'consulta', etiqueta: 'Registrar consulta', icono: <IconClipboardPlus size={16} /> },
      { valor: 'caja', etiqueta: 'Caja', icono: <IconCash size={16} /> },
      { valor: 'recetas', etiqueta: 'Recetas', icono: <IconFileText size={16} /> },
    ],
  },
  {
    titulo: 'Catálogo',
    items: [
      { valor: 'productos', etiqueta: 'Productos', icono: <IconVaccine size={16} /> },
      { valor: 'lotes', etiqueta: 'Lotes / vencimientos', icono: <IconCalendarTime size={16} /> },
      { valor: 'ajuste-precios', etiqueta: 'Ajuste de precios', icono: <IconAdjustments size={16} />, soloAdmin: true },
    ],
  },
  {
    titulo: 'Planes',
    items: [
      { valor: 'obras-sociales', etiqueta: 'Obras sociales', icono: <IconStethoscope size={16} /> },
      { valor: 'bancos-promociones', etiqueta: 'Bancos / promociones', icono: <IconBuildingBank size={16} /> },
      { valor: 'reglas-obra-social', etiqueta: 'Reglas de obra social', icono: <IconStethoscope size={16} />, soloAdmin: true },
    ],
  },
  {
    titulo: 'Personas',
    items: [
      { valor: 'clientes', etiqueta: 'Clientes', icono: <IconUsers size={16} /> },
      { valor: 'usuarios', etiqueta: 'Usuarios', icono: <IconUserShield size={16} /> },
    ],
  },
]

function renderizarSeccion(seccion: Seccion) {
  switch (seccion) {
    case 'consulta':
      return <RegistrarConsulta />
    case 'productos':
      return <ProductosAdmin />
    case 'lotes':
      return <LotesAdmin />
    case 'ajuste-precios':
      return <AjustePreciosAdmin />
    case 'obras-sociales':
      return <ObrasSocialesAdmin />
    case 'bancos-promociones':
      return <BancosPromocionesAdmin />
    case 'reglas-obra-social':
      return <ReglasObraSocialAdmin />
    case 'caja':
      return <CajaAdmin />
    case 'recetas':
      return <RecetasAdmin />
    case 'clientes':
      return <ClientesAdmin />
    case 'usuarios':
      return <UsuariosAdmin />
  }
}

export function Administracion() {
  const [seccion, setSeccion] = useState<Seccion>('consulta')
  const { usuario } = useAuth()
  const esAdmin = usuario?.es_admin ?? false

  const gruposVisibles = GRUPOS.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => !item.soloAdmin || esAdmin),
  })).filter((grupo) => grupo.items.length > 0)

  return (
    <Stack gap="md">
      <Select
        hiddenFrom="sm"
        label="Sección"
        value={seccion}
        onChange={(v) => v && setSeccion(v as Seccion)}
        allowDeselect={false}
        data={gruposVisibles.map((grupo) => ({
          group: grupo.titulo,
          items: grupo.items.map((item) => ({ value: item.valor, label: item.etiqueta })),
        }))}
      />

      <Grid>
        <Grid.Col span={{ base: 12, sm: 4, lg: 3 }} visibleFrom="sm">
          <Stack gap="md" style={{ borderRight: '1px solid var(--mantine-color-gray-3)' }} pr="md">
            {gruposVisibles.map((grupo) => (
              <Stack key={grupo.titulo} gap={2}>
                <Text size="xs" fw={600} c="dimmed" mb={2}>
                  {grupo.titulo}
                </Text>
                {grupo.items.map((item) => (
                  <NavLink
                    key={item.valor}
                    label={item.etiqueta}
                    leftSection={item.icono}
                    active={seccion === item.valor}
                    onClick={() => setSeccion(item.valor)}
                    style={{ borderRadius: 6 }}
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 8, lg: 9 }}>{renderizarSeccion(seccion)}</Grid.Col>
      </Grid>
    </Stack>
  )
}
