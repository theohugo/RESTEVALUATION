import { pool } from "../db";

export async function listEnterprises(take: number, skip: number, q?: string) {
  const where: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (q && q.trim() !== "") {
    where.push(`
      (
        e.enterprisenumber ILIKE $${idx}
        OR d.denomination ILIKE $${idx}
      )
    `);
    params.push(`%${q}%`);
    idx++;
  }

  params.push(take, skip);

  const result = await pool.query(
    `
    SELECT 
      e.enterprisenumber,
      e.status,
      e.juridicalsituation,
      e.typeofenterprise,
      e.juridicalform,
      e.juridicalformcac,
      to_char(e.startdate, 'YYYY-MM-DD') AS startdate,
      d.denomination AS name
    FROM enterprise e
    LEFT JOIN denomination d
      ON d.entitynumber = e.enterprisenumber
     AND d.language = '2'
     AND d.typeofdenomination = '001'
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY e.enterprisenumber ASC
    LIMIT $${idx} OFFSET $${idx + 1}
    `,
    params
  );

  return result.rows;
}

export async function getEnterpriseById(id: string) {
  const enterpriseResult = await pool.query(
    `
    SELECT 
      e.enterprisenumber,
      e.status,
      e.juridicalsituation,
      e.typeofenterprise,
      e.juridicalform,
      e.juridicalformcac,
      to_char(e.startdate, 'YYYY-MM-DD') AS startdate,
      d.denomination AS name,
      a.streetfr,
      a.zipcode,
      a.municipalityfr
    FROM enterprise e
    LEFT JOIN denomination d
      ON d.entitynumber = e.enterprisenumber
     AND d.language = '2'
     AND d.typeofdenomination = '001'
    LEFT JOIN address a
      ON a.entitynumber = e.enterprisenumber
     AND a.typeofaddress = 'REGO'
    WHERE e.enterprisenumber = $1
    `,
    [id]
  );

  if (enterpriseResult.rowCount === 0) {
    return null;
  }

  const enterprise = enterpriseResult.rows[0];

  const establishmentsResult = await pool.query(
    `
    SELECT 
      establishmentnumber,
      to_char(startdate, 'YYYY-MM-DD') AS startdate,
      enterprisenumber
    FROM establishment
    WHERE enterprisenumber = $1
    ORDER BY establishmentnumber ASC
    `,
    [id]
  );

  return {
    ...enterprise,
    establishments: establishmentsResult.rows,
  };
}

export async function listEstablishmentsByEnterprise(id: string) {
  const result = await pool.query(
    `
    SELECT 
      establishmentnumber,
      to_char(startdate, 'YYYY-MM-DD') AS startdate,
      enterprisenumber
    FROM establishment
    WHERE enterprisenumber = $1
    ORDER BY establishmentnumber ASC
    `,
    [id]
  );
  return result.rows;
}

export async function listTables() {
  const result = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  return result.rows.map(r => r.table_name);
}

export async function updateEnterprise(id: string, payload: {
  status?: string | null;
  juridicalsituation?: string | null;
  typeofenterprise?: string | null;
  juridicalform?: string | null;
  juridicalformcac?: string | null;
  startdate?: string | null; // ISO date string
  name?: string | null;
}) {
  const setClauses: string[] = [];
  const params: any[] = [id];
  let idx = 2;

  const pushText = (column: string, value: string | null | undefined) => {
    if (value !== undefined) {
      setClauses.push(`${column} = $${idx}::text`);
      params.push(value);
      idx++;
    }
  };

  const pushDate = (column: string, value: string | null | undefined) => {
    if (value !== undefined) {
      setClauses.push(`${column} = $${idx}::date`);
      params.push(value);
      idx++;
    }
  };

  // Add provided fields
  pushText("status", payload.status);
  pushText("juridicalsituation", payload.juridicalsituation);
  pushText("typeofenterprise", payload.typeofenterprise);
  pushText("juridicalform", payload.juridicalform);
  pushText("juridicalformcac", payload.juridicalformcac);
  pushDate("startdate", payload.startdate);

  if (setClauses.length > 0) {
    await pool.query(
      `
      UPDATE enterprise
      SET ${setClauses.join(", ")}
      WHERE enterprisenumber = $1
      `,
      params
    );
  }

  // Update denomination name (FR, main denomination) only if provided
  if (payload.name !== undefined) {
    await pool.query(
      `
      UPDATE denomination
      SET denomination = $2::text
      WHERE entitynumber = $1
        AND language = '2'
        AND typeofdenomination = '001'
      `,
      [id, payload.name ?? null]
    );
  }

  return await getEnterpriseById(id);
}

export async function createEnterprise(payload: {
  enterprisenumber: string;
  name?: string | null;
  status?: string | null;
  juridicalsituation?: string | null;
  typeofenterprise?: string | null;
  juridicalform?: string | null;
  juridicalformcac?: string | null;
  startdate?: string | null; // ISO date
}) {
  // Insert core enterprise row if not exists
  await pool.query(
    `
    INSERT INTO enterprise (
      enterprisenumber, status, juridicalsituation, typeofenterprise,
      juridicalform, juridicalformcac, startdate
    )
    SELECT
      $1::text, $2::text, $3::text, $4::text,
      $5::text, $6::text, $7::date
    WHERE NOT EXISTS (
      SELECT 1 FROM enterprise WHERE enterprisenumber = $1::text
    )
    `,
    [
      payload.enterprisenumber,
      payload.status ?? null,
      payload.juridicalsituation ?? null,
      payload.typeofenterprise ?? null,
      payload.juridicalform ?? null,
      payload.juridicalformcac ?? null,
      payload.startdate ?? null,
    ]
  );

  // Insert or update denomination (FR, main) when provided
  if (payload.name !== undefined) {
    // Try update first (use only referenced params)
    const updateRes = await pool.query(
      `
      UPDATE denomination
      SET denomination = $2::text
      WHERE entitynumber = $1::text
        AND language = '2'
        AND typeofdenomination = '001'
      `,
      [payload.enterprisenumber, payload.name ?? null]
    );

    // If no row updated, insert if not exists
    if (updateRes.rowCount === 0) {
      await pool.query(
        `
        INSERT INTO denomination (entitynumber, language, typeofdenomination, denomination)
        SELECT $1::text, '2', '001', $2::text
        WHERE NOT EXISTS (
          SELECT 1
          FROM denomination
          WHERE entitynumber = $1::text
            AND language = '2'
            AND typeofdenomination = '001'
        )
        `,
        [payload.enterprisenumber, payload.name ?? null]
      );
    }
  }

  return await getEnterpriseById(payload.enterprisenumber);
}

export async function countEnterprises(q?: string) {
  const where: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (q && q.trim() !== "") {
    where.push(`
      (
        e.enterprisenumber ILIKE $${idx}
        OR d.denomination ILIKE $${idx}
      )
    `);
    params.push(`%${q}%`);
    idx++;
  }

  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM enterprise e
    LEFT JOIN denomination d
      ON d.entitynumber = e.enterprisenumber
     AND d.language = '2'
     AND d.typeofdenomination = '001'
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    `,
    params
  );

  return result.rows[0]?.total ?? 0;
}

export async function createEstablishment(payload: {
  establishmentnumber: string;
  enterprisenumber: string;
  startdate?: string | null;
}) {
  await pool.query(
    `
    INSERT INTO establishment (establishmentnumber, enterprisenumber, startdate)
    VALUES ($1::text, $2::text, $3::date)
    `,
    [payload.establishmentnumber, payload.enterprisenumber, payload.startdate ?? null]
  );
  const res = await pool.query(
    `
    SELECT 
      establishmentnumber,
      to_char(startdate, 'YYYY-MM-DD') AS startdate,
      enterprisenumber
    FROM establishment
    WHERE establishmentnumber = $1
    `,
    [payload.establishmentnumber]
  );
  return res.rows[0];
}

export async function updateEstablishment(establishmentnumber: string, payload: {
  startdate?: string | null;
  enterprisenumber?: string | null; // allow re-link if needed
}) {
  const setClauses: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (payload.startdate !== undefined) {
    setClauses.push(`startdate = $${idx}::date`);
    params.push(payload.startdate ?? null);
    idx++;
  }
  if (payload.enterprisenumber !== undefined) {
    setClauses.push(`enterprisenumber = $${idx}::text`);
    params.push(payload.enterprisenumber ?? null);
    idx++;
  }

  if (setClauses.length === 0) {
    // nothing to update
    const res = await pool.query(`SELECT * FROM establishment WHERE establishmentnumber = $1`, [establishmentnumber]);
    return res.rows[0] ?? null;
  }

  params.push(establishmentnumber);

  await pool.query(
    `
    UPDATE establishment
    SET ${setClauses.join(", ")}
    WHERE establishmentnumber = $${idx}
    `,
    params
  );

  const res = await pool.query(
    `
    SELECT 
      establishmentnumber,
      to_char(startdate, 'YYYY-MM-DD') AS startdate,
      enterprisenumber
    FROM establishment
    WHERE establishmentnumber = $1
    `,
    [establishmentnumber]
  );
  return res.rows[0] ?? null;
}

export async function deleteEstablishment(establishmentnumber: string) {
  const res = await pool.query(
    `DELETE FROM establishment WHERE establishmentnumber = $1`,
    [establishmentnumber]
  );
  return res.rowCount > 0;
}

export async function upsertEnterpriseAddress(
  id: string,
  payload: { streetfr?: string | null; zipcode?: string | null; municipalityfr?: string | null }
) {
  // Try update first
  const upd = await pool.query(
    `
    UPDATE address
    SET streetfr = $2::text,
        zipcode = $3::text,
        municipalityfr = $4::text
    WHERE entitynumber = $1::text
      AND typeofaddress = 'REGO'
    `,
    [id, payload.streetfr ?? null, payload.zipcode ?? null, payload.municipalityfr ?? null]
  );

  if (upd.rowCount === 0) {
    // Insert if not exists
    await pool.query(
      `
      INSERT INTO address (
        entitynumber, typeofaddress, countrynl, countryfr, zipcode,
        municipalitynl, municipalityfr, streetnl, streetfr,
        housenumber, box, extraaddressinfo, datestrikingoff
      )
      VALUES (
        $1::text, 'REGO', NULL, NULL, $3::text,
        NULL, $4::text, NULL, $2::text,
        NULL, NULL, NULL, NULL
      )
      `,
      [id, payload.streetfr ?? null, payload.zipcode ?? null, payload.municipalityfr ?? null]
    );
  }

  // Return refreshed enterprise with address
  return await getEnterpriseById(id);
}

export async function deleteEnterprise(id: string) {
  // Manual cascade: delete child records first
  await pool.query(`DELETE FROM establishment WHERE enterprisenumber = $1`, [id]);
  await pool.query(`DELETE FROM address WHERE entitynumber = $1`, [id]);
  const res = await pool.query(`DELETE FROM enterprise WHERE enterprisenumber = $1`, [id]);
  return res.rowCount > 0;
}
