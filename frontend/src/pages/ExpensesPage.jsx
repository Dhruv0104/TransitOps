import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import Modal from '../components/Modal'
import { TableSkeleton } from '../components/Skeleton'

export default function ExpensesPage() {
  const { token } = useAuth()
  const { formatMoney, currencySymbol } = useOrg()
  const [fuelLogs, setFuelLogs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [costs, setCosts] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fuelOpen, setFuelOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [fuelForm, setFuelForm] = useState({
    vehicleId: '',
    liters: '',
    cost: '',
    date: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    vehicleId: '',
    type: 'TOLL',
    amount: '',
    description: '',
    date: '',
  })
  const [saving, setSaving] = useState(false)
  const [vehicleFilter, setVehicleFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [fuelData, expenseData, costData, vehicleData] = await Promise.all([
        apiRequest('/fuel', { token }),
        apiRequest('/expenses', { token }),
        apiRequest('/expenses/operational-costs', { token }),
        apiRequest('/vehicles', { token }),
      ])
      setFuelLogs(fuelData.logs || [])
      setExpenses(expenseData.expenses || [])
      setCosts(costData.costs || [])
      setVehicles(vehicleData.vehicles || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const totalFuelCost = fuelLogs.reduce((s, l) => s + l.cost, 0)
  const totalFuelLiters = fuelLogs.reduce((s, l) => s + l.liters, 0)
  const filteredFuel = vehicleFilter
    ? fuelLogs.filter((l) => l.vehicleId === vehicleFilter)
    : fuelLogs
  const filteredExpenses = vehicleFilter
    ? expenses.filter((e) => e.vehicleId === vehicleFilter)
    : expenses
  const filteredCosts = vehicleFilter
    ? costs.filter((c) => c.vehicleId === vehicleFilter)
    : costs

  async function submitFuel(e) {
    e.preventDefault()
    if (!fuelForm.vehicleId) {
      setError('Vehicle is required')
      return
    }
    if (!fuelForm.liters || Number(fuelForm.liters) <= 0) {
      setError('Liters must be greater than 0')
      return
    }
    if (fuelForm.cost === '' || Number.isNaN(Number(fuelForm.cost)) || Number(fuelForm.cost) < 0) {
      setError('Fuel cost cannot be negative')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/fuel', {
        method: 'POST',
        token,
        body: {
          vehicleId: fuelForm.vehicleId,
          liters: Number(fuelForm.liters),
          cost: Number(fuelForm.cost),
          date: fuelForm.date || undefined,
        },
      })
      setFuelOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitExpense(e) {
    e.preventDefault()
    if (!expenseForm.vehicleId) {
      setError('Vehicle is required')
      return
    }
    if (!expenseForm.type.trim()) {
      setError('Expense type is required')
      return
    }
    if (
      expenseForm.amount === '' ||
      Number.isNaN(Number(expenseForm.amount)) ||
      Number(expenseForm.amount) <= 0
    ) {
      setError('Amount must be greater than 0')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/expenses', {
        method: 'POST',
        token,
        body: {
          vehicleId: expenseForm.vehicleId,
          type: expenseForm.type,
          amount: Number(expenseForm.amount),
          description: expenseForm.description || undefined,
          date: expenseForm.date || undefined,
        },
      })
      setExpenseOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Fuel & Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            Operational cost = Fuel + Maintenance per vehicle.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFuelOpen(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Fuel Log
          </button>
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold"
          >
            + Expense
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase text-muted">Total Fuel Cost</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(totalFuelCost)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase text-muted">Fuel Used (L)</p>
          <p className="mt-1 text-2xl font-semibold">{totalFuelLiters.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase text-muted">Other Expenses</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMoney(expenses.reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4">
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNo} — {v.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TableSkeleton rows={5} cols={4} />
            <TableSkeleton rows={5} cols={4} />
          </div>
          <TableSkeleton rows={5} cols={5} />
        </div>
      ) : (
        <>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Fuel Logs</h2>
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Liters</th>
                <th className="px-4 py-2">Cost ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              {filteredFuel.map((log) => (
                <tr key={log.id} className="border-t border-line/70">
                  <td className="px-4 py-2">
                    {new Date(log.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{log.vehicle?.registrationNo}</td>
                  <td className="px-4 py-2">{log.liters}</td>
                  <td className="px-4 py-2">{formatMoney(log.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 font-semibold">
            Other Expenses
          </h2>
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="border-t border-line/70">
                  <td className="px-4 py-2">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{exp.vehicle?.registrationNo}</td>
                  <td className="px-4 py-2">{exp.type}</td>
                  <td className="px-4 py-2">{formatMoney(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <h2 className="border-b border-line px-4 py-3 font-semibold">
          Operational Cost by Vehicle
        </h2>
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Fuel</th>
              <th className="px-4 py-2">Maintenance</th>
              <th className="px-4 py-2">Ops Cost</th>
              <th className="px-4 py-2">Other</th>
            </tr>
          </thead>
          <tbody>
            {filteredCosts.map((c) => (
              <tr key={c.vehicleId} className="border-t border-line/70">
                <td className="px-4 py-2">
                  {c.registrationNo} — {c.name}
                </td>
                <td className="px-4 py-2">{formatMoney(c.fuelCost)}</td>
                <td className="px-4 py-2">{formatMoney(c.maintenanceCost)}</td>
                <td className="px-4 py-2 font-semibold">
                  {formatMoney(c.operationalCost)}
                </td>
                <td className="px-4 py-2">{formatMoney(c.otherExpenseCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}

      {fuelOpen ? (
        <Modal title="Add Fuel Log" onClose={() => setFuelOpen(false)}>
          <form onSubmit={submitFuel} className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Vehicle
              <select
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={fuelForm.vehicleId}
                onChange={(e) =>
                  setFuelForm((f) => ({ ...f, vehicleId: e.target.value }))
                }
              >
                <option value="">Select</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Liters
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={fuelForm.liters}
                onChange={(e) =>
                  setFuelForm((f) => ({ ...f, liters: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Cost ({currencySymbol})
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={fuelForm.cost}
                onChange={(e) =>
                  setFuelForm((f) => ({ ...f, cost: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Date
              <input
                type="date"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={fuelForm.date}
                onChange={(e) =>
                  setFuelForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Save Fuel Log
            </button>
          </form>
        </Modal>
      ) : null}

      {expenseOpen ? (
        <Modal title="Add Expense" onClose={() => setExpenseOpen(false)}>
          <form onSubmit={submitExpense} className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Vehicle
              <select
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={expenseForm.vehicleId}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, vehicleId: e.target.value }))
                }
              >
                <option value="">Select</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Type
              <select
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={expenseForm.type}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                <option value="TOLL">TOLL</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Amount ({currencySymbol})
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Description
              <input
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Save Expense
            </button>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
