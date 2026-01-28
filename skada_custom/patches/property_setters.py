import frappe


def execute():
	set_po_series()
	set_disable_rounded_total_defaults()


def set_po_series():
	"""Set Purchase Order naming series options."""
	options = "SKD-LPO-\nMRG-LPO-"
	if not frappe.db.exists(
		"Property Setter",
		{"doc_type": "Purchase Order", "field_name": "naming_series", "property": "options"},
	):
		frappe.get_doc(
			{
				"doctype": "Property Setter",
				"doctype_or_field": "DocField",
				"doc_type": "Purchase Order",
				"field_name": "naming_series",
				"property": "options",
				"property_type": "Text",
				"value": options,
			}
		).insert(ignore_permissions=True)
	else:
		# update in case it differs
		frappe.db.set_value(
			"Property Setter",
			{"doc_type": "Purchase Order", "field_name": "naming_series", "property": "options"},
			"value",
			options,
		)


def set_disable_rounded_total_defaults():
	"""Default disable_rounded_total to 1 for specified transactions."""
	doctypes = [
		"Purchase Invoice",
		"Sales Invoice",
		"Purchase Receipt",
		"Sales Order",
		"Purchase Order",
	]

	for dt in doctypes:
		ps_filters = {
			"doc_type": dt,
			"field_name": "disable_rounded_total",
			"property": "default",
		}
		if not frappe.db.exists("Property Setter", ps_filters):
			frappe.get_doc(
				{
					"doctype": "Property Setter",
					"doctype_or_field": "DocField",
					"doc_type": dt,
					"field_name": "disable_rounded_total",
					"property": "default",
					"property_type": "Int",
					"value": "1",
				}
			).insert(ignore_permissions=True)
		else:
			frappe.db.set_value("Property Setter", ps_filters, "value", "1")
