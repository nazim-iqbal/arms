/**
 * বাকী (outstanding due) calculation.
 *
 * The balance is never stored anywhere — it is always derived:
 *
 *   outstanding(driver) = SUM(daily_incomes.due_amount)  for that driver
 *                       - SUM(due_recoveries.amount)     for that driver
 *
 * Keeping the rule here means the Dashboard, Deposit Entry and Due Recovery
 * screens can never drift apart, and deleting any row self-corrects the total.
 */

/**
 * @param dueRows     daily_incomes rows carrying a বাকী — needs
 *                    driver_id, due_amount and (optionally) date,
 *                    rickshaw_id, rickshaws{...} for the "last vehicle" hint.
 * @param recoveries  due_recoveries rows — needs driver_id and amount.
 * @returns object keyed by driver id.
 */
export function buildDueBalances(dueRows, recoveries) {
  const map = {};

  const slot = (id) => {
    if (!map[id]) {
      map[id] = {
        driverId: id,
        due: 0,
        recovered: 0,
        outstanding: 0,
        lastVehicle: null,
        lastVehicleId: null,
        lastDate: null,
      };
    }
    return map[id];
  };

  (dueRows || []).forEach((row) => {
    if (!row.driver_id) return;
    const b = slot(row.driver_id);
    b.due += Number(row.due_amount || 0);

    // Remember the most recent vehicle the driver owed money on
    if (row.date && (!b.lastDate || row.date > b.lastDate)) {
      b.lastDate = row.date;
      b.lastVehicle = row.rickshaws || null;
      b.lastVehicleId = row.rickshaw_id || null;
    }
  });

  (recoveries || []).forEach((row) => {
    slot(row.driver_id).recovered += Number(row.amount || 0);
  });

  Object.values(map).forEach((b) => { b.outstanding = b.due - b.recovered; });
  return map;
}

/** Drivers who still owe money, largest balance first. */
export function listDebtors(balances, drivers) {
  return Object.values(balances)
    .filter((b) => b.outstanding > 0)
    .map((b) => ({ ...b, driver: (drivers || []).find((d) => d.id === b.driverId) }))
    .filter((b) => b.driver)
    .sort((a, b) => b.outstanding - a.outstanding);
}

/**
 * বাকী recorded on deposits that were never tied to a driver (no one was
 * assigned to the vehicle at the time) — there is nobody to collect it from.
 */
export function orphanDue(dueRows) {
  return (dueRows || [])
    .filter((r) => !r.driver_id)
    .reduce((s, r) => s + Number(r.due_amount || 0), 0);
}
