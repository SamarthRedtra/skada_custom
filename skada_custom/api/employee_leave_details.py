import frappe
from frappe import _
from frappe.utils import cint, getdate, formatdate

from hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment import (
	get_assigned_salary_structure,
)


@frappe.whitelist()
def get_employee_leave_details(employee):
	if not employee:
		return {}

	leave_rows = _get_leave_applications(employee)
	last_leave = leave_rows[0] if leave_rows else {}

	# Choose the last annual leave if available, else fallback to last leave
	last_annual_leave = next((row for row in leave_rows if row.get("leave_type") and "annual" in row.get("leave_type", "").lower()), last_leave)

	assigned_structure = get_assigned_salary_structure(employee, frappe.utils.nowdate())
	preview_slip = _make_preview_salary_slip(assigned_structure, employee) if assigned_structure else None

	# Use gross earnings from preview slip as leave salary baseline
	leave_salary_amount = 0.0
	if preview_slip and getattr(preview_slip, "earnings", None):
		leave_salary_amount = sum(frappe.utils.flt(row.amount) for row in preview_slip.earnings)
		earnings_breakdown = [
			{"salary_component": row.salary_component, "amount": frappe.utils.flt(row.amount)}
			for row in preview_slip.earnings
		]
	else:
		earnings_breakdown = []

	payment_days = 0
	per_day_salary = 0.0
	if preview_slip:
		payment_days = frappe.utils.flt(getattr(preview_slip, "payment_days", 0)) or frappe.utils.flt(
			getattr(preview_slip, "total_working_days", 0)
		) or 30
		per_day_salary = leave_salary_amount / payment_days if payment_days else 0.0

	# Determine leave salary period from the slip dates (fallback to fiscal year)
	period_text = ""
	if preview_slip and getattr(preview_slip, "start_date", None) and getattr(preview_slip, "end_date", None):
		period_text = f"{formatdate(preview_slip.start_date, 'YYYY')}-{formatdate(preview_slip.end_date, 'YYYY')}"
	elif last_leave and last_leave.get("from_date"):
		period_text = str(getdate(last_leave.get("from_date")).year)

	data = {
		"leaves": leave_rows,
		"last_leave": last_leave,
		"last_annual_leave": last_annual_leave,
		"last_leave_salary_date": last_leave.get("to_date"),
		"last_leave_salary_amount": leave_salary_amount,
		"leave_salary_period": period_text,
		"ticket_sponsored": _bool_label(last_leave.get("ticket_sponsored")),
		"salary_structure": assigned_structure,
		"earnings_breakdown": earnings_breakdown,
		"payment_days": payment_days,
		"per_day_salary": per_day_salary,
	}

	return data


def _get_leave_applications(employee, limit=5):
	"""Return recent submitted leave applications (most recent first)."""
	leave_apps = frappe.get_all(
		"Leave Application",
		filters={"employee": employee, "docstatus": ("<", 2)},
		fields=["name", "leave_type", "from_date", "to_date", "ticket_sponsored"],
		order_by="from_date desc",
		limit=limit,
	)
	for idx, row in enumerate(leave_apps, 1):
		row["idx"] = idx
	return leave_apps


def _make_preview_salary_slip(salary_structure, employee):
	from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip

	return make_salary_slip(
		salary_structure,
		employee=employee,
		ignore_permissions=True,
		posting_date=frappe.utils.nowdate(),
		for_preview=1,
	)


def _bool_label(value):
	return _("Yes") if cint(value) else _("No")
