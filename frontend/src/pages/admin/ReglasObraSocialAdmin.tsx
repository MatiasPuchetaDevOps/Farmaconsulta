import { ActionIcon, Autocomplete, Badge, Button, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrashX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ObraSocialRegla, ObraSocialReglaIn } from '../../types/api'

const RESULTADOS = [
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'vencido', label: 'Vencido' },
]

const COLOR_RESULTADO: Record<string, string> = { aprobado: 'teal', rechazado: 'red', vencido: 'yellow' }

const VACIO: ObraSocialReglaIn = { obra_social: '', plan_afiliado: '', resultado: 'aprobado', motivo: '', activo: true }

export function ReglasObraSocialAdmin() {
  const [reglas, setReglas] = useState<ObraSocialRegla[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<ObraSocialRegla | null>(null)
  const [form, setForm] = useState<ObraSocialReglaIn>(VACIO)
  const [enviando, setEnviando] = useState(false)

  function cargarReglas() {
    api
      .get<ObraSocialRegla[]>('/obras-sociales-reglas')
      .then((res) => setReglas(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar las reglas.', color: 'red' }))
  }

  useEffect(() => {
    cargarReglas()
    api.get<string[]>('/catalogos/obras-sociales').then((res) => setObrasSociales(res.data)).catch(() => {})
  }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setModalAbierto(true)
  }

  function abrirEdicion(regla: ObraSocialRegla) {
    setEditando(regla)
    setForm({ obra_social: regla.obra_social, plan_afiliado: regla.plan_afiliado ?? '', resultado: regla.resultado, motivo: regla.motivo ?? '', activo: regla.activo })
    setModalAbierto(true)
  }

  async function guardar() {
    if (!form.obra_social.trim()) return
    if (form.resultado !== 'aprobado' && !(form.motivo ?? '').trim()) {
      notifications.show({ title: 'Falta el motivo', message: 'Un resultado distinto de "aprobado" necesita un motivo.', color: 'red' })
      return
    }
    setEnviando(true)
    try {
      const payload = { ...form, plan_afiliado: form.plan_afiliado?.trim() || null, motivo: form.motivo?.trim() || null }
      if (editando) {
        await api.put(`/obras-sociales-reglas/${editando.id}`, payload)
        notifications.show({ title: 'Regla actualizada', message: form.obra_social, color: 'teal' })
      } else {
        await api.post('/obras-sociales-reglas', payload)
        notifications.show({ title: 'Regla creada', message: form.obra_social, color: 'teal' })
      }
      setModalAbierto(false)
      cargarReglas()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo guardar', message: detalle ?? 'Revisá los datos e intentá de nuevo.', color: 'red' })
    } finally {
      setEnviando(false)
    }
  }

  function confirmarBaja(regla: ObraSocialRegla) {
    modals.openConfirmModal({
      title: 'Dar de baja regla',
      children: (
        <Text size="sm">
          Se deja de simular el resultado '{regla.resultado}' para {regla.obra_social}
          {regla.plan_afiliado ? ` (plan ${regla.plan_afiliado})` : ''}; a partir de ahora se aprueba por defecto.
        </Text>
      ),
      labels: { confirm: 'Dar de baja', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await api.delete(`/obras-sociales-reglas/${regla.id}`)
        notifications.show({ title: 'Regla dada de baja', message: regla.obra_social, color: 'red' })
        cargarReglas()
      },
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Reglas de validación de obra social ({reglas.length})</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
          Nueva regla
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Simulan el resultado de validar la cobertura contra la obra social/prepaga. Sin una regla configurada, se aprueba por defecto.
      </Text>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Obra social</Table.Th>
            <Table.Th>Plan</Table.Th>
            <Table.Th>Resultado</Table.Th>
            <Table.Th>Motivo</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {reglas.map((r) => (
            <Table.Tr key={r.id} opacity={r.activo ? 1 : 0.5}>
              <Table.Td>{r.obra_social}</Table.Td>
              <Table.Td>{r.plan_afiliado ?? <Text c="dimmed">Cualquiera</Text>}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={COLOR_RESULTADO[r.resultado]}>
                  {r.resultado}
                </Badge>
              </Table.Td>
              <Table.Td>{r.motivo ?? '—'}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={r.activo ? 'teal' : 'gray'}>
                  {r.activo ? 'Activa' : 'De baja'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="subtle" onClick={() => abrirEdicion(r)} aria-label="Editar">
                    <IconEdit size={16} />
                  </ActionIcon>
                  {r.activo && (
                    <ActionIcon variant="subtle" color="red" onClick={() => confirmarBaja(r)} aria-label="Dar de baja">
                      <IconTrashX size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar regla' : 'Nueva regla'}>
        <Stack gap="md">
          <Autocomplete
            label="Obra social"
            data={obrasSociales}
            value={form.obra_social}
            onChange={(v) => setForm({ ...form, obra_social: v })}
            data-autofocus
          />
          <TextInput
            label="Plan del afiliado (opcional)"
            description="Vacío = aplica a cualquier plan de esa obra social"
            value={form.plan_afiliado ?? ''}
            onChange={(e) => setForm({ ...form, plan_afiliado: e.currentTarget.value })}
          />
          <Select label="Resultado simulado" data={RESULTADOS} value={form.resultado} onChange={(v) => setForm({ ...form, resultado: (v as ObraSocialReglaIn['resultado']) ?? 'aprobado' })} />
          {form.resultado !== 'aprobado' && (
            <TextInput label="Motivo" value={form.motivo ?? ''} onChange={(e) => setForm({ ...form, motivo: e.currentTarget.value })} />
          )}
          <Button onClick={guardar} loading={enviando}>
            Guardar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
