const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(process.cwd(), 'data', 'gantt.json')
const TMP_PATH = path.join('/tmp', 'gantt.json')

function readTasks () {
  const p = fs.existsSync(TMP_PATH) ? TMP_PATH : DATA_PATH
  const raw = fs.readFileSync(p, 'utf-8')
  const tasks = JSON.parse(raw)
  return tasks
}

function writeTasks (tasks) {
  fs.writeFileSync(TMP_PATH, JSON.stringify(tasks, null, 2))
}

function withIds (tasks) {
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
  if (status === 'Critical') return '#ef4444'
  if (status === 'Delayed') return '#f97316'
  if (status === 'Done') return '#64748b'
  if ((phase || '').includes('POC')) return '#8b5cf6'
  if ((phase || '').includes('DEV')) return '#10b981'
  if ((phase || '').includes('IND')) return '#f59e0b'
  return '#3b82f6'
}

module.exports = async (req, res) => {
  try {
    const { id } = req.query || {}
    const taskId = Number(id)
    if (!taskId) return res.status(400).json({ error: 'Invalid id' })

    const tasks = withIds(readTasks())

    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return res.status(404).json({ error: 'Task not found' })

    if (req.method === 'GET') {
      return res.json(tasks[idx])
    }

    if (req.method === 'PUT') {
      const body = await getRequestBody(req)
      const current = tasks[idx]
      const updated = {
        ...current,
        task: body.task != null ? body.task : current.task,
        phase: body.phase != null ? body.phase : current.phase,
        start_week:
          body.start_week != null
            ? Number(body.start_week)
            : current.start_week,
        duration:
          body.duration != null ? Number(body.duration) : current.duration,
        status: body.status != null ? body.status : current.status,
        color:
          body.color ||
          autoColor({
            phase: body.phase ?? current.phase,
            status: body.status ?? current.status
          }),
        icon: body.icon || current.icon || 'fa-tasks'
      }
      const out = tasks.slice()
      out[idx] = updated
      writeTasks(out)
      return res.json({ changes: 1 })
    }

    if (req.method === 'DELETE') {
      const out = tasks.filter(t => t.id !== taskId)
      writeTasks(out)
      return res.json({ changes: 1 })
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (e) {
    return res
      .status(500)
      .json({ error: 'Gantt detail API error', details: String(e) })
  }
}
