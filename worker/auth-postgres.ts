import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";
import type pg from "pg";

/**
 * Credenciais do aparelho vinculado guardadas no Postgres (tabela whatsapp_auth), no lugar
 * de arquivos: o serviço pode rodar em qualquer lugar e reiniciar sem pedir QR de novo.
 */
export async function usarAuthPostgres(pool: pg.Pool): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  registrado: boolean;
}> {
  async function leer<T>(clave: string): Promise<T | null> {
    const { rows } = await pool.query<{ valor: string }>("select valor from whatsapp_auth where clave = $1", [clave]);
    return rows[0] ? (JSON.parse(rows[0].valor, BufferJSON.reviver) as T) : null;
  }

  async function escribir(clave: string, valor: unknown) {
    await pool.query(
      `insert into whatsapp_auth (clave, valor) values ($1, $2)
       on conflict (clave) do update set valor = excluded.valor`,
      [clave, JSON.stringify(valor, BufferJSON.replacer)],
    );
  }

  const guardadas = await leer<AuthenticationCreds>("creds");
  const creds = guardadas ?? initAuthCreds();

  return {
    registrado: Boolean(guardadas?.me),
    saveCreds: () => escribir("creds", creds),
    state: {
      creds,
      keys: {
        async get<T extends keyof SignalDataTypeMap>(tipo: T, ids: string[]) {
          const datos: { [id: string]: SignalDataTypeMap[T] } = {};
          if (ids.length === 0) return datos;
          const { rows } = await pool.query<{ clave: string; valor: string }>(
            "select clave, valor from whatsapp_auth where clave = any($1::text[])",
            [ids.map((id) => `${tipo}-${id}`)],
          );
          for (const fila of rows) {
            const id = fila.clave.slice(tipo.length + 1);
            let valor = JSON.parse(fila.valor, BufferJSON.reviver);
            if (tipo === "app-state-sync-key" && valor) valor = proto.Message.AppStateSyncKeyData.fromObject(valor);
            datos[id] = valor;
          }
          return datos;
        },
        async set(datos) {
          const tareas: Promise<unknown>[] = [];
          for (const tipo in datos) {
            const porId = datos[tipo as keyof SignalDataTypeMap]!;
            for (const id in porId) {
              const valor = porId[id];
              const clave = `${tipo}-${id}`;
              tareas.push(
                valor ? escribir(clave, valor) : pool.query("delete from whatsapp_auth where clave = $1", [clave]),
              );
            }
          }
          await Promise.all(tareas);
        },
      },
    },
  };
}

/** Desvincular: apaga tudo. A próxima conexão pede QR novo. */
export async function borrarAuth(pool: pg.Pool): Promise<void> {
  await pool.query("delete from whatsapp_auth");
}
