import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.POSTGRES_URL_NON_POOLING!)

export async function getTemplates() {
  const templates = await sql`
    SELECT * FROM Template
  `
  return templates
}

export async function createTemplate(data: any) {
  const template = await sql`
    INSERT INTO Template (name, content)
    VALUES (${data.name}, ${data.content})
    RETURNING *
  `
  return template[0]
}

export async function updateTemplate(id: string, data: any) {
  const template = await sql`
    UPDATE Template 
    SET name = ${data.name}, content = ${data.content}
    WHERE id = ${id}
    RETURNING *
  `
  return template[0]
}

export async function deleteTemplate(id: string) {
  await sql`
    DELETE FROM Template 
    WHERE id = ${id}
  `
  return true
} 