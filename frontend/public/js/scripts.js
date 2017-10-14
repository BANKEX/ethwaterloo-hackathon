var ethBalance = 123;
var plasmaBalance = 0;

$(document).ready(function () {
	updateBalances();

	$('#btn-deposit').click(function () {
		$('#no-eth-transactions').addClass('hidden');

		var ul = $('#list-eth-transactions');
		ul.removeClass('hidden');
		
		var li = $('<li class="list-group-item list-group-item-primary" style="display: none;">\
			<div class="row justify-content-md-center">\
				<div class="col-md-auto">\
					<div class="text">\
						<i class="fa fa-spinner fa-spin fa-fw"></i>\
					</div>\
				</div>\
			</div>\
		</li>');

		li.appendTo(ul).fadeIn(500);

		setTimeout(function () {
			li.html('<div class="row">\
				<div class="col-md-auto">\
					<div class="text text-muted">'
						+ moment().format("MM/DD/YYYY HH:mm:SS") + 
					'</div>\
				</div>\
				<div class="col">\
					<div class="text">\
						0x0000000000000000000000000000000000000001\
					</div>\
				</div>\
				<div class="col-md-auto">\
					<div class="text">\
						<i class="fa fa-arrow-circle-down"></i> 0.1&nbsp;<span class="text-muted">ETH</span>\
					</div>\
				</div>\
			</div>');

			$("#no-plasma-assets").addClass("hidden");

			var ulPlasma = $("#list-plasma-assets");
			ulPlasma.removeClass("hidden");

			var liPlasma = $('<li class="list-group-item list-group-item-warning" style="display: none;">\
				<div class="row">\
					<div class="col-md-auto">\
						<div class="text text-muted">\
							10/14/2017 17:00:00\
						</div>\
					</div>\
					<div class="col">\
						<div class="text">\
							0x0000000000000000000000000000000000000001\
						</div>\
					</div>\
					<div class="col-md-auto">\
						<button type="button" class="btn btn-info btn-block" id="btn-send-offchain" onclick="onSend(this)"><i class="fa fa-paper-plane"></i> Send</button>\
					</div>\
					<div class="col-md-auto">\
						<button type="button" class="btn btn-success btn-block" id="btn-withdraw" onclick="onWithdraw(this)"><i class="fa fa-arrow-circle-up"></i> Withdraw</button>\
					</div>\
				</div>\
			</li>');

			liPlasma.appendTo(ulPlasma).fadeIn(500);

			ethBalance -= 1;
			plasmaBalance += 1;
			updateBalances();
		}, 1500);
	});
	
	$('.btn-withdraw').click(onWithdraw);
});

function updateBalances() {
	$("#eth-balance").text((ethBalance / 10.0).toFixed(1));
	$("#plasma-balance").text((plasmaBalance / 10.0).toFixed(1));
}

function onWithdraw(sender) {
	$("#no-plasma-assets").addClass("hidden");

	var ul = $("#list-plasma-assets");
	ul.removeClass("hidden");

	var ul = $("#list-eth-transactions");

	var li = $('<li class="list-group-item list-group-item-success" style="display: none;">\
		<div class="row justify-content-md-center">\
			<div class="col-md-auto">\
				<div class="text">\
					<i class="fa fa-spinner fa-spin fa-fw"></i>\
				</div>\
			</div>\
		</div>\
	</li>');

	li.appendTo(ul).fadeIn(500);

	var liPlasma = $(sender).parents('li');
	liPlasma.addClass('disabled');

	setTimeout(function () {
		li.html('<div class="row">\
			<div class="col-md-auto">\
				<div class="text text-muted">\
					10/14/2017 17:00:00\
				</div>\
			</div>\
			<div class="col">\
				<div class="text">\
					0x0000000000000000000000000000000000000001\
				</div>\
			</div>\
			<div class="col-md-auto">\
				<div class="text">\
					<i class="fa fa-arrow-circle-up"></i> 0.1&nbsp;<span class="text-muted">ETH</span>\
				</div>\
			</div>\
		</div>');

		liPlasma.fadeOut(500, function () {
			liPlasma.remove();

			var ulPlasma = $("#list-plasma-assets");

			if (ulPlasma.children().length === 0)
				$("#no-plasma-assets").removeClass("hidden");
		});

		ethBalance += 1;
		plasmaBalance -= 1;
		updateBalances();
	}, 1500);
}

function onSend(sender) {
	$("#no-plasma-assets-others").addClass("hidden");

	var liPlasma = $(sender).parents('li');
	liPlasma.addClass('disabled');
	liPlasma.fadeOut(500, function () {
		liPlasma.remove();

		var ulPlasma = $("#list-plasma-assets");

		if (ulPlasma.children().length === 0)
			$("#no-plasma-assets").removeClass("hidden");
	});

	var ulPlasmaOthers = $("#list-plasma-assets-others");
	ulPlasmaOthers.removeClass("hidden");

	var liPlasmaOthers = $('<li class="list-group-item list-group-item-secondary" style="display: none;">\
		<div class="row justify-content-md-center">\
			<div class="col-md-auto">\
				<div class="text">\
					<i class="fa fa-spinner fa-spin fa-fw"></i>\
				</div>\
			</div>\
		</div>\
	</li>');

	liPlasmaOthers.appendTo(ulPlasmaOthers).fadeIn(500);
	
	setTimeout(function () {
		liPlasmaOthers.html('<div class="row">\
			<div class="col-md-auto">\
				<div class="text text-muted">\
					10/14/2017 17:00:00\
				</div>\
			</div>\
			<div class="col">\
				<div class="text">\
					0x0000000000000000000000000000000000000001\
				</div>\
			</div>\
		</div>');

		plasmaBalance -= 1;
		updateBalances();
	}, 300);
}