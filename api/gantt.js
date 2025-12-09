const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(process.cwd(), 'data', 'gantt.json')
const TMP_PATH = path.join('/tmp', 'gantt.json')

function readTasks () {
  // Prefer ephemeral /tmp if present (after first write), else bundled data file
  const p = fs.existsSync(TMP_PATH) ? TMP_PATH : DATA_PATH
  const raw = fs.readFileSync(p, 'utf-8')
  const tasks = JSON.parse(raw)
  return tasks
}

function writeTasks (tasks) {
  // On Vercel FS is read-only except /tmp; always write to /tmp
  fs.writeFileSync(TMP_PATH, JSON.stringify(tasks, null, 2))
}

function withIds (tasks) {
  // Return a shallow-copied array with guaranteed numeric ids, without writing to disk
  let maxId = tasks.reduce(
    (m, t) => (typeof t.id === 'number' ? Math.max(m, t.id) : m),
    0
  )
  return tasks.map(t => {
    if (typeof t.id === 'number') return t
    maxId += 1
    return { ...t, id: maxId }
  })
}

function getRequestBody (req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
      // Basic protection against very large payloads
      if (data.length > 1e6) {
        req.connection.destroy()
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function autoColor ({ phase, status }) {
  // Status overrides Phase
  if (status === 'Critical') return '#ef4444'
  if (status === 'Delayed') return '#f97316'
  if (status === 'Done') return '#64748b'
  // Fallback by phase
  if ((phase || '').includes('POC')) return '#8b5cf6'
  if ((phase || '').includes('DEV')) return '#10b981'
  if ((phase || '').includes('IND')) return '#f59e0b'
  return '#3b82f6'
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const tasks = readTasks()
      const out = withIds(tasks)
      return res.json(out)
    }

    if (req.method === 'POST') {
      const body = await getRequestBody(req)
      const tasks = withIds(readTasks())
      const nextId = tasks.reduce((m, t) => Math.max(m, t.id || 0), 0) + 1

      const newTask = {
        id: nextId,
        task: body.task,
        phase: body.phase,
        start_week: Number(body.start_week),
        duration: Number(body.duration),
        status: body.status || 'Pending',
        color:
          body.color || autoColor({ phase: body.phase, status: body.status }),
        icon: body.icon || 'fa-tasks'
      }

      // Basic validation
      if (
        !newTask.task ||
        !newTask.phase ||
        !newTask.start_week ||
        !newTask.duration
      ) {
        return res
          .status(400)
          .json({
            error: 'Missing required fields: task, phase, start_week, duration'
          })
      }

      const updated = [...tasks, newTask]
      writeTasks(updated)
      return res.status(201).json({ id: newTask.id })
    }

    // Method not allowed
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (e) {
    return res
      .status(500)
      .json({ error: 'Gantt API error', details: String(e) })
  }
}
