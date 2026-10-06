import type { Cita, EstadoCita, NuevaCita } from "@/domain/cita/Cita";
import type { FechaISO } from "@/domain/shared/fecha";
import type { CambioCita, CitaRepository } from "@/ports";
import { aCita, COLUMNAS_CITA, type FilaCita } from "./mappers";
import { consultar, type Sql } from "./sql";

export class PostgresCitaRepository implements CitaRepository {
  constructor(private readonly sql: Sql) {}

  async crear(c: NuevaCita, creadoPor: string | null): Promise<string> {
    const [f] = await consultar<{ id: string }>(
      this.sql,
      "crear cita",
      `insert into citas (cliente_id, nombre, whatsapp, jid, fecha, hora, motivo, preferencia, notas, estado, origen, created_by)
       values ($1, $2, $3, $4, $5::date, $6::time, $7, $8, $9, $10, $11, $12) returning id`,
      [
        c.clienteId,
        c.nombre,
        c.whatsapp,
        c.jid,
        c.fecha,
        c.hora,
        c.motivo,
        c.preferencia,
        c.notas,
        c.estado,
        c.origen,
        creadoPor,
      ],
    );
    return f!.id;
  }

  async obtenerPorId(id: string): Promise<Cita | null> {
    const filas = await consultar<FilaCita>(
      this.sql,
      "obtener cita",
      `select ${COLUMNAS_CITA} from citas where id = $1`,
      [id],
    );
    return filas[0] ? aCita(filas[0]) : null;
  }

  async listarEntre(desde: FechaISO, hasta: FechaISO): Promise<Cita[]> {
    const filas = await consultar<FilaCita>(
      this.sql,
      "citas del periodo",
      `select ${COLUMNAS_CITA} from citas where fecha between $1::date and $2::date order by fecha, hora, created_at`,
      [desde, hasta],
    );
    return filas.map(aCita);
  }

  async listarSolicitadas(): Promise<Cita[]> {
    const filas = await consultar<FilaCita>(
      this.sql,
      "citas solicitadas",
      `select ${COLUMNAS_CITA} from citas where estado = 'solicitada' order by created_at limit 100`,
    );
    return filas.map(aCita);
  }

  async actualizar(id: string, estadoEsperado: EstadoCita, c: CambioCita): Promise<boolean> {
    const filas = await consultar(
      this.sql,
      "actualizar cita",
      `update citas set
         estado = $3::estado_cita,
         fecha = coalesce($4::date, fecha),
         hora = coalesce($5::time, hora),
         notas = case when $6::boolean then $7 else notas end
       where id = $1 and estado = $2::estado_cita
       returning id`,
      [id, estadoEsperado, c.estado, c.fecha ?? null, c.hora ?? null, c.notas !== undefined, c.notas ?? null],
    );
    return filas.length === 1;
  }
}
