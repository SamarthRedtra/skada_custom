frappe.ui.form.on("Item", {
	setup(frm) {
		frm.set_query("variant_of", () => ({
			filters: {
				is_template: 1,
			},
		}));
	},
});
