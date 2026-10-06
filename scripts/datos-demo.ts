import { sumarDias, sumarMeses } from "../src/domain/shared/fecha";

type Consulta = <T = Record<string, unknown>>(texto: string, params?: unknown[]) => Promise<T[]>;

export interface UsuarioSeed {
  email: string;
  nombre: string;
  rol: "admin" | "atendente";
  passwordHash: string;
}

interface PedidoSeed {
  cliente: string;
  creado: string;
  descripcion: string;
  tipoLente?: string;
  total: number;
  adelanto: number;
  diasEntrega?: number;
  listo?: string;
  entregado?: string;
  receta?: Record<string, number | string>;
}

/** Meio-dia em São Paulo, para não cair no dia vizinho por fuso. */
const instante = (fecha: string) => `${fecha}T15:00:00.000Z`;

/**
 * Dados de demonstração com datas relativas a `hoy`: a lista de renovações nunca envelhece.
 * Apaga clientes/pedidos/receitas/avisos existentes. Usuários são criados ou atualizados.
 */
export async function sembrarDemo(
  q: Consulta,
  { hoy, usuarios, demoWhatsapp }: { hoy: string; usuarios: UsuarioSeed[]; demoWhatsapp: string | null },
) {
  const haceDias = (n: number) => sumarDias(hoy, -n);
  const haceMeses = (m: number, diasExtra = 0) => sumarDias(sumarMeses(hoy, -m), -diasExtra);
  const tel = (ficticio: string, usarDemo = false) => (usarDemo && demoWhatsapp ? demoWhatsapp : ficticio);

  await q(`update configuracion set nombre = 'Óticas Latina', idioma_default = 'es' where id = 1`);

  for (const u of usuarios) {
    await q(
      `insert into usuarios (email, nombre, rol, password_hash) values ($1, $2, $3, $4)
       on conflict (email) do update set nombre = excluded.nombre, rol = excluded.rol,
         password_hash = excluded.password_hash, activo = true`,
      [u.email.toLowerCase(), u.nombre, u.rol, u.passwordHash],
    );
  }

  await q(`truncate mensajes_whatsapp, citas, notificaciones, recetas, pedidos, clientes restart identity`);

  const clientes: Record<string, string> = {};
  const listaClientes: [string, string, string, "es" | "pt"][] = [
    ["carlos", "Carlos Mamani", tel("5511900000101", true), "es"],
    ["rosa", "Rosa Gutiérrez", tel("5511900000102"), "es"],
    ["luis", "Luis Huamán", tel("5511900000103"), "es"],
    ["ana", "Ana Torres", tel("5511900000104"), "es"],
    ["jorge", "Jorge Condori", tel("5511900000105"), "es"],
    ["patricia", "Patrícia Rocha", tel("5511900000106", true), "pt"],
    ["miguel", "Miguel Choque", tel("5511900000107", true), "es"],
    ["lucia", "Lucía Vargas", tel("5511900000108"), "es"],
    ["diego", "Diego Flores", tel("5511900000109"), "es"],
  ];
  for (const [clave, nombre, whatsapp, idioma] of listaClientes) {
    const [fila] = await q<{ id: string }>(
      `insert into clientes (nombre, whatsapp, idioma, created_at) values ($1, $2, $3, $4) returning id`,
      [nombre, whatsapp, idioma, instante(haceMeses(13, 1))],
    );
    clientes[clave] = fila!.id;
  }

  const pedidos: PedidoSeed[] = [
    // Elegíveis para renovação (entregues há ~12 e ~11 meses, sem pedido depois)
    {
      cliente: "carlos",
      creado: haceMeses(12, 10),
      listo: haceMeses(12, 3),
      entregado: haceMeses(12),
      descripcion: "Armazón metálico dorado",
      tipoLente: "Monofocal antirreflejo",
      total: 480,
      adelanto: 480,
      receta: {
        od_esfera: -2.25,
        od_cilindro: -0.5,
        od_eje: 180,
        oi_esfera: -2,
        oi_cilindro: -0.75,
        oi_eje: 170,
        dnp_od: 31.5,
        dnp_oi: 31,
      },
    },
    {
      cliente: "rosa",
      creado: haceMeses(11, 20),
      listo: haceMeses(11, 12),
      entregado: haceMeses(11, 6),
      descripcion: "Armazón acetato carey",
      tipoLente: "Multifocal",
      total: 1250,
      adelanto: 1250,
    },
    // Controle: entregue há 10 meses (cedo demais)
    {
      cliente: "luis",
      creado: haceMeses(10, 8),
      listo: haceMeses(10, 2),
      entregado: haceMeses(10),
      descripcion: "Armazón negro deportivo",
      total: 390,
      adelanto: 390,
    },
    // Controle: entregue há 12 meses, mas fez pedido novo depois
    {
      cliente: "ana",
      creado: haceMeses(12, 15),
      listo: haceMeses(12, 7),
      entregado: haceMeses(12, 5),
      descripcion: "Armazón rojo",
      tipoLente: "Monofocal",
      total: 350,
      adelanto: 350,
    },
    {
      cliente: "ana",
      creado: haceMeses(2, 10),
      listo: haceMeses(2, 3),
      entregado: haceMeses(2),
      descripcion: "Lentes de sol con graduación",
      total: 620,
      adelanto: 620,
    },
    {
      cliente: "jorge",
      creado: haceDias(28),
      listo: haceDias(22),
      entregado: haceDias(20),
      descripcion: "Armazón al aire",
      tipoLente: "Antirreflejo + filtro azul",
      total: 540,
      adelanto: 540,
    },
    // Prontos esperando retirada
    {
      cliente: "patricia",
      creado: haceDias(9),
      listo: haceDias(2),
      descripcion: "Armação acetato preta",
      tipoLente: "Multifocal",
      total: 980,
      adelanto: 500,
    },
    {
      cliente: "miguel",
      creado: haceDias(6),
      listo: haceDias(1),
      descripcion: "Armazón azul marino",
      tipoLente: "Monofocal",
      total: 420,
      adelanto: 200,
    },
    // No laboratório (um atrasado)
    {
      cliente: "lucia",
      creado: haceDias(2),
      diasEntrega: 5,
      descripcion: "Armazón transparente",
      tipoLente: "Monofocal antirreflejo",
      total: 450,
      adelanto: 150,
      receta: { od_esfera: 1.5, oi_esfera: 1.25, adicion: 2, observaciones: "Lectura" },
    },
    {
      cliente: "diego",
      creado: haceDias(8),
      diasEntrega: 7,
      descripcion: "Armazón metálico plateado",
      tipoLente: "Bifocal",
      total: 560,
      adelanto: 0,
    },
  ];

  // Em ordem cronológica, para a numeração seguir a data.
  for (const p of [...pedidos].sort((a, b) => a.creado.localeCompare(b.creado))) {
    const status = p.entregado ? "entregado" : p.listo ? "listo" : "en_laboratorio";
    const [fila] = await q<{ id: string }>(
      `insert into pedidos (cliente_id, descripcion_armazon, tipo_lente, valor_total, valor_adelanto,
         fecha_pedido, fecha_entrega_prevista, status, fecha_listo, fecha_entregado, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [
        clientes[p.cliente],
        p.descripcion,
        p.tipoLente ?? null,
        p.total,
        p.adelanto,
        p.creado,
        sumarDias(p.creado, p.diasEntrega ?? 7),
        status,
        p.listo ? instante(p.listo) : null,
        p.entregado ? instante(p.entregado) : null,
        instante(p.creado),
      ],
    );
    if (p.receta) {
      const columnas = Object.keys(p.receta);
      await q(
        `insert into recetas (cliente_id, pedido_id, fecha_receta, ${columnas.join(", ")})
         values ($1, $2, $3, ${columnas.map((_, i) => `$${i + 4}`).join(", ")})`,
        [clientes[p.cliente], fila!.id, p.creado, ...Object.values(p.receta)],
      );
    }
  }

  return { clientes: listaClientes.length, pedidos: pedidos.length };
}
