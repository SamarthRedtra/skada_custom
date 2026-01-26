frappe.ui.form.on('Employee', {
	refresh(frm) {
		if (!frm.doc.custom_leave_details || frm.doc.__islocal) {
			return;
		}

		render_leave_details(frm);
	},
});

function render_leave_details(frm) {
	frm.call('skada_custom.api.employee_leave_details.get_employee_leave_details', {
		employee: frm.doc.name,
	}).then((r) => {
		const data = r.message || {};
		const container = frm.get_field('custom_leave_details')?.$wrapper;
		if (!container) return;

		container.empty();
		container.append(build_header(data, frm.doc));
		container.append(build_sections(data));
	}).catch(() => {
		const container = frm.get_field('custom_leave_details')?.$wrapper;
		if (container) container.empty().append(`<div class="text-muted small">${__('Unable to load leave details')}</div>`);
	});
}

function build_header(data, doc) {
	const lastAnnualFrom = data.last_annual_leave?.from_date ? frappe.format(data.last_annual_leave.from_date, {fieldtype: 'Date'}) : __('N/A');
	const lastAnnualTo = data.last_annual_leave?.to_date ? frappe.format(data.last_annual_leave.to_date, {fieldtype: 'Date'}) : '';
	const lastLeaveSalaryDate = data.last_leave_salary_date ? frappe.format(data.last_leave_salary_date, {fieldtype: 'Date'}) : __('N/A');

	return $(`
		<div class="mb-4">
			<div class="row">
				<div class="col-sm-4 mb-2"><strong>${__('Salary Structure')}</strong>: ${data.salary_structure || __('Not Assigned')}</div>
				<div class="col-sm-4 mb-2"><strong>${__('Last Leave Salary Date')}</strong>: ${lastLeaveSalaryDate}</div>
				<div class="col-sm-4 mb-2"><strong>${__('Leave Salary Amount')}</strong>: ${format_currency(data.last_leave_salary_amount || 0, doc.salary_currency || frappe.defaults.get_default('currency'))}</div>
			</div>
			<div class="row">
				<div class="col-sm-4 mb-2"><strong>${__('Last Annual Leave')}</strong>: ${lastAnnualFrom}${lastAnnualTo ? ' || ' + lastAnnualTo : ''}</div>
				<div class="col-sm-4 mb-2"><strong>${__('Leave Salary Period')}</strong>: ${data.leave_salary_period || __('N/A')}</div>
				<div class="col-sm-4 mb-2"><strong>${__('Ticket Sponsored')}</strong>: ${data.ticket_sponsored || __('No')}</div>
			</div>
		</div>
	`);
}

function build_sections(data) {
	const wrapper = $('<div class="extra-info"></div>');
	wrapper.append(build_leave_table(data.leaves || []));
	wrapper.append(build_collapsible(__('Leave Salary'), `
		<div>${__('Calculated from assigned Salary Structure')}</div>
		<div class="fw-bold">${format_currency(data.last_leave_salary_amount || 0, frappe.defaults.get_default('currency'))}</div>
	`));
	wrapper.append(build_collapsible(__('Salary Increment'), `<div class="text-muted">${__('No data')}</div>`));
	wrapper.append(build_collapsible(__('Documents'), `<div class="text-muted">${__('No data')}</div>`));
	return wrapper;
}

function build_leave_table(rows) {
	const table = $(`
		<div class="card mb-2" style="border-color:#b5d4f5">
			<div class="card-header" style="background:#d7e9fd;">
				<span class="fw-bold">${__('Annual Leave')}</span>
			</div>
			<div class="table-responsive mb-0">
				<table class="table table-sm mb-0">
					<thead>
						<tr>
							<th style="width:40px;">#</th>
							<th>${__('From')}</th>
							<th>${__('To')}</th>
							<th>${__('Ticket Sponsored')}</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>
	`);

	const tbody = table.find('tbody');
	if (!rows.length) {
		tbody.append(`<tr><td colspan="4" class="text-muted">${__('No leave applications found')}</td></tr>`);
	} else {
		rows.forEach((row, idx) => {
			const from = row.from_date ? frappe.format(row.from_date, {fieldtype: 'Date'}) : '';
			const to = row.to_date ? frappe.format(row.to_date, {fieldtype: 'Date'}) : '';
			const ticket = row.ticket_sponsored ? __('Yes') : __('No');
			tbody.append(`
				<tr>
					<td>${idx + 1}</td>
					<td>${from}</td>
					<td>${to}</td>
					<td>${ticket}</td>
				</tr>
			`);
		});
	}
	return table;
}

function build_collapsible(title, bodyHtml) {
	return $(`
		<div class="card mb-2">
			<div class="card-header d-flex justify-content-between align-items-center" style="background:#e7f2e7;">
				<span class="fw-bold">${title}</span>
				<button class="btn btn-xs btn-link p-0" data-action="toggle"><span class="caret"></span></button>
			</div>
			<div class="card-body" style="display:none;">${bodyHtml}</div>
		</div>
	`).on('click', '[data-action="toggle"]', function() {
		const body = $(this).closest('.card').find('.card-body');
		body.toggle();
	});
}
