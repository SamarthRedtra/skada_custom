import frappe
from frappe import _
from frappe.utils import cint, flt, getdate, formatdate, date_diff

from hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment import (
	get_assigned_salary_structure,
)


@frappe.whitelist()
def get_employee_leave_details(employee):
	if not employee:
		return {}

	assigned_structure = get_assigned_salary_structure(employee, frappe.utils.nowdate())
	preview_slip = _make_preview_salary_slip(assigned_structure, employee) if assigned_structure else None

	leave_salary_amount = 0.0
	earnings_breakdown = []
	if preview_slip and getattr(preview_slip, "earnings", None):
		leave_salary_amount = sum(flt(row.amount) for row in preview_slip.earnings)
		earnings_breakdown = [
			{"salary_component": row.salary_component, "amount": flt(row.amount)}
			for row in preview_slip.earnings
		]

	payment_days = 0
	per_day_salary = 0.0
	if preview_slip:
		payment_days = flt(getattr(preview_slip, "payment_days", 0)) or flt(
			getattr(preview_slip, "total_working_days", 0)
		) or 30
		per_day_salary = leave_salary_amount / payment_days if payment_days else 0.0

	# Use custom child table entries to compute leave salary slices
	table_rows = _get_leave_detail_rows(employee)
	for row in table_rows:
		row["days"] = max(0, (date_diff(row["to_date"], row["from_date"]) + 1))
		row["amount"] = flt(per_day_salary * row["days"])

	total_amount = sum(row.get("amount", 0) for row in table_rows)

	period_text = ""
	if preview_slip and getattr(preview_slip, "start_date", None) and getattr(preview_slip, "end_date", None):
		period_text = f"{formatdate(preview_slip.start_date, 'YYYY')}-{formatdate(preview_slip.end_date, 'YYYY')}"

	data = {
		"salary_structure": assigned_structure,
		"earnings_breakdown": earnings_breakdown,
		"payment_days": payment_days,
		"per_day_salary": per_day_salary,
		"table_rows": table_rows,
		"total_leave_amount": total_amount,
		"leave_salary_period": period_text,
	}

	return data


def _get_leave_detail_rows(employee):
	doc = frappe.get_doc("Employee", employee)
	rows = []
	for child in doc.get("custom_leave_details_table") or []:
		if child.from_date and child.to_date:
			rows.append(
				{
					"from_date": child.from_date,
					"to_date": child.to_date,
					"travel_sponsored": cint(child.travel_sponsored),
					"remarks": child.remarks,
				}
			)
	return rows


def _make_preview_salary_slip(salary_structure, employee):
	from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip

	return make_salary_slip(
		salary_structure,
		employee=employee,
		ignore_permissions=True,
		posting_date=frappe.utils.nowdate(),
		for_preview=1,
	)
