frappe.ui.form.on('Employee', {
	refresh(frm) {
		if (!frm.fields_dict?.custom_leave_details || frm.is_new()) {
			return;
		}
		render_leave_details(frm);
	},
});

function render_leave_details(frm) {
	frappe.call({
		method: 'skada_custom.api.employee_leave_details.get_employee_leave_details',
		args: { employee: frm.doc.name },
	}).then((r) => {
		const data = r.message || {};
		const container = frm.get_field('custom_leave_details')?.$wrapper;
		if (!container) return;

		container.empty();
		if (!hasAnyData(data)) {
			container.append(`<div class="text-muted small">${__('No leave details found')}</div>`);
			return;
		}

		container.append(build_header(data, frm.doc));
		container.append(build_sections(data));
	}).catch(() => {
		const container = frm.get_field('custom_leave_details')?.$wrapper;
		if (container) container.empty().append(`<div class="text-muted small">${__('Unable to load leave details')}</div>`);
	});
}

function hasAnyData(data) {
	return Boolean(
		(data.leaves && data.leaves.length) ||
		data.last_leave_salary_amount ||
		data.salary_structure ||
		data.leave_salary_period ||
		data.last_leave_salary_date
	);
}

function build_header(data, doc) {
	const lastAnnualFrom = data.last_annual_leave?.from_date ? frappe.format(data.last_annual_leave.from_date, {fieldtype: 'Date'}) : __('N/A');
	const lastAnnualTo = data.last_annual_leave?.to_date ? frappe.format(data.last_annual_leave.to_date, {fieldtype: 'Date'}) : '';
	const lastLeaveSalaryDate = data.last_leave_salary_date ? frappe.format(data.last_leave_salary_date, {fieldtype: 'Date'}) : __('N/A');

	return $(`
		<div class="mb-4 p-3" style="background:linear-gradient(90deg,#f5f8ff,#f0f6ff); border:1px solid #e1e8ff; border-radius:6px;">
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
	wrapper.append(build_collapsible(__('Leave Salary'), build_leave_salary_body(data)));
	wrapper.append(build_collapsible(__('Salary Increment'), build_salary_increment_body(data)));
	wrapper.append(build_collapsible(__('Documents'), build_documents_body(data)));
	return wrapper;
}

function build_leave_table(rows) {
	const table = $(`
		<div class="card mb-3 shadow-sm" style="border:1px solid #a9c8f8;">
			<div class="card-header" style="background:linear-gradient(90deg,#dbe9ff,#c5dbff);">
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
	const card = $(`
		<div class="card mb-2 shadow-sm" style="border:1px solid #d6eadf;">
			<div class="card-header d-flex justify-content-between align-items-center" style="background:linear-gradient(90deg,#e8f7ee,#d4f0e0);">
				<span class="fw-bold">${title}</span>
				<button class="btn btn-xs btn-default" data-action="toggle"><i class="fa fa-chevron-down"></i></button>
			</div>
			<div class="card-body" style="display:none;">${bodyHtml}</div>
		</div>
	`);

	card.on('click', '[data-action="toggle"]', function () {
		const body = $(this).closest('.card').find('.card-body');
		body.toggle();
		$(this).find('i').toggleClass('fa-chevron-down fa-chevron-up');
	});

	return card;
}

function build_leave_salary_body(data) {
	const breakdownRows = (data.earnings_breakdown || []).map(
		row => `<tr><td>${frappe.utils.escape_html(row.salary_component || '')}</td><td class="text-end">${format_currency(row.amount || 0, frappe.defaults.get_default('currency'))}</td></tr>`
	).join('');

	const breakdownTable = breakdownRows
		? `
			<div class="table-responsive mt-2">
				<table class="table table-sm mb-0">
					<thead><tr><th>${__('Component')}</th><th class="text-end">${__('Amount')}</th></tr></thead>
					<tbody>${breakdownRows}</tbody>
				</table>
			</div>
		`
		: `<div class="text-muted small mt-2">${__('No breakdown available')}</div>`;

	const paymentDays = data.payment_days || 0;
	const perDay = data.per_day_salary || 0;

	return `
		<div class="row">
			<div class="col-sm-6 mb-2">
				<div class="text-muted small">${__('Amount')}</div>
				<div class="fw-bold">${format_currency(data.last_leave_salary_amount || 0, frappe.defaults.get_default('currency'))}</div>
			</div>
			<div class="col-sm-6 mb-2">
				<div class="text-muted small">${__('Derived From')}</div>
				<div>${data.salary_structure || __('Not Assigned')}</div>
			</div>
		</div>
		<div class="text-muted small">${__('Calculated from assigned Salary Structure preview')}</div>
		<div class="row mt-2">
			<div class="col-sm-4 mb-2">
				<div class="text-muted small">${__('Payment Days')}</div>
				<div>${paymentDays}</div>
			</div>
			<div class="col-sm-4 mb-2">
				<div class="text-muted small">${__('Per Day Salary')}</div>
				<div class="fw-bold">${format_currency(perDay, frappe.defaults.get_default('currency'))}</div>
			</div>
			<div class="col-sm-4 mb-2">
				<div class="text-muted small">${__('Calculation')}</div>
				<div class="text-muted small">${__('Total Earnings ÷ Payment Days')}</div>
			</div>
		</div>
		${breakdownTable}
	`;
}

function build_salary_increment_body(data) {
	// Placeholder for future data source; show a friendly empty state for now.
	return `
		<div class="d-flex align-items-center text-muted">
			<i class="fa fa-info-circle me-2"></i>
			<span>${__('No salary increment records found')}</span>
		</div>
	`;
}

function build_documents_body(data) {
	return `
		<div class="d-flex align-items-center text-muted">
			<i class="fa fa-file-o me-2"></i>
			<span>${__('No documents attached')}</span>
		</div>
	`;
}
